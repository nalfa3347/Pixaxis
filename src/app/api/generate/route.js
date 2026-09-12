import { NextResponse } from 'next/server';
import { supabaseAdmin, resolveUser } from '@/lib/supabase-server';
import { 
  CREATION_TYPES, 
  VISUAL_STYLES, 
  FORMATS, 
  MAX_REFERENCE_IMAGES, 
  MAX_CONCURRENT_GENERATIONS,
  MAX_IMAGE_SIZE_MB,
  IDEOGRAM_MODEL,
  IDEOGRAM_V4_GENERATE_ENDPOINT,
  IDEOGRAM_V4_REMIX_ENDPOINT,
  getIdeogramV4Resolution,
  buildPrompt 
} from '@/config/constants';
import { getFefoActiveLot, deductCreditsForGeneration } from '@/lib/credit-manager';
import { invalidateUserCache } from '@/app/api/images/route';
import { validateImageFiles, processAllImagesForOpenAI } from '@/lib/image-processor';

export async function POST(request) {
  let queueId = null;
  const user = await resolveUser(request);
  if (!user) {
    return NextResponse.json(
      { error: 'Veuillez vous connecter pour créer une image.', requireAuth: true },
      { status: 401 }
    );
  }
  const userId = user.id;

  try {
    // ─── 0. Lecture du corps : FormData (avec images) ou JSON (sans images) ───
    const contentType = request.headers.get('content-type') || '';
    let type, style, format, additional_prompt, imageFiles;

    if (contentType.includes('multipart/form-data')) {
      // FormData avec images de référence
      const formData = await request.formData();
      type = formData.get('type');
      style = formData.get('style');
      format = formData.get('format');
      additional_prompt = formData.get('additional_prompt') || '';
      imageFiles = formData.getAll('images').filter((f) => f instanceof Blob && f.size > 0);
    } else {
      // JSON sans images
      const body = await request.json();
      type = body.type;
      style = body.style;
      format = body.format;
      additional_prompt = body.additional_prompt || '';
      imageFiles = [];
    }

    // ─── 1. Validation stricte des choix utilisateur ───
    if (!type || !style || !format) {
      return NextResponse.json({ error: 'Type, style et format sont obligatoires.' }, { status: 400 });
    }

    const typeValid = CREATION_TYPES.some((t) => t.id === type);
    const styleValid = VISUAL_STYLES.some((s) => s.id === style);
    const formatValid = FORMATS.some((f) => f.id === format);

    if (!typeValid || !styleValid || !formatValid) {
      return NextResponse.json({ error: 'Paramètres de création invalides.' }, { status: 400 });
    }

    // ─── 1b. Validation des images de référence côté serveur ───
    if (imageFiles.length > 0) {
      const imgValidation = validateImageFiles(imageFiles);
      if (!imgValidation.valid) {
        return NextResponse.json({ error: imgValidation.error }, { status: 400 });
      }
    }

    // ─── 2. RÈGLE FILE GLISSANTE : Maximum 10 requêtes simultanées ───
    const { count: activeCount, error: countErr } = await supabaseAdmin
      .from('generation_queue')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'processing');

    if (countErr) console.warn('Erreur vérification file:', countErr);

    if (activeCount !== null && activeCount >= MAX_CONCURRENT_GENERATIONS) {
      return NextResponse.json({
        error: `Vous avez déjà ${MAX_CONCURRENT_GENERATIONS} générations en cours, veuillez attendre qu'une place se libère.`,
        active_count: activeCount,
        max_limit: MAX_CONCURRENT_GENERATIONS,
      }, { status: 429 });
    }

    // ─── 3. Vérification du solde de crédits selon la règle FEFO ───
    const fefoLot = await getFefoActiveLot(userId);
    if (!fefoLot) {
      return NextResponse.json({
        error: 'Vous n\'avez aucun crédit actif. Veuillez acheter un pack pour générer des images.',
      }, { status: 402 });
    }

    if (fefoLot.credits_restants < fefoLot.cout_par_generation) {
      return NextResponse.json({
        error: `Votre lot actif (${fefoLot.pack_name}) ne dispose que de ${fefoLot.credits_restants} crédits, ce qui est insuffisant pour cette génération (${fefoLot.cout_par_generation} crédits requis). Veuillez réapprovisionner votre compte.`,
      }, { status: 402 });
    }

    // ─── 4. Enregistrement dans la file d'attente (statut: processing) ───
    const { data: queueItem, error: queueErr } = await supabaseAdmin
      .from('generation_queue')
      .insert({
        user_id: userId,
        status: 'processing',
        type_creation: type,
        style,
        format,
        additional_prompt: additional_prompt?.slice(0, 150) || null,
        reference_images: imageFiles.length > 0 ? [`${imageFiles.length} image(s) de référence`] : [],
        credit_lot_id: fefoLot.id,
        cost: fefoLot.cout_par_generation,
      })
      .select()
      .single();

    if (queueErr || !queueItem) {
      throw new Error('Impossible d\'enregistrer la demande dans la file.');
    }
    queueId = queueItem.id;

    // ─── 5. Construction du prompt final automatique ───
    // Récupération automatique des données de marque enregistrées dans le profil
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('business_name, marketing_pitch')
      .eq('id', userId)
      .maybeSingle();

    let combinedPromptDetail = additional_prompt || '';
    if (userProfile?.business_name) {
      const brandContext = `Commercial visual for brand: ${userProfile.business_name}${userProfile.marketing_pitch ? ` (${userProfile.marketing_pitch})` : ''}`;
      combinedPromptDetail = combinedPromptDetail ? `${combinedPromptDetail}. ${brandContext}` : brandContext;
    }

    const finalPrompt = buildPrompt(type, style, imageFiles.length, combinedPromptDetail);

    // ─── 6. Appel API de génération d'image (STRICTEMENT IDEOGRAM 4.0) ───
    let generatedUrl = '';
    const ideogramApiKey = process.env.IDEOGRAM_API_KEY;

    if (!ideogramApiKey || ideogramApiKey.trim() === '') {
      throw new Error('La clé API Ideogram (IDEOGRAM_API_KEY) n\'est pas configurée dans les variables d’environnement serveur. Veuillez la renseigner dans votre fichier .env.local. Aucun crédit n\'a été débité.');
    }

    // Résolution certifiée pour le modèle Ideogram 4.0 (ResolutionV4)
    const ideogramResolution = getIdeogramV4Resolution(format);

    if (imageFiles.length > 0) {
      // ═══ CHEMIN AVEC IMAGE DE RÉFÉRENCE PRODUIT : endpoint /v1/ideogram-v4/remix ═══
      // Traitement serveur Sharp : redimensionnement 2048px max + compression PNG
      const processedBuffers = await processAllImagesForOpenAI(imageFiles);

      // Construction du FormData multipart requis par l'API Ideogram 4.0
      const ideogramForm = new FormData();
      ideogramForm.append('text_prompt', finalPrompt);
      ideogramForm.append('resolution', ideogramResolution);
      ideogramForm.append('image_weight', '60'); // Préservation haute fidélité de la structure du produit

      const referenceBlob = new Blob([processedBuffers[0]], { type: 'image/png' });
      ideogramForm.append('image', referenceBlob, 'product_reference.png');

      const ideogramRes = await fetch(IDEOGRAM_V4_REMIX_ENDPOINT, {
        method: 'POST',
        headers: {
          'Api-Key': ideogramApiKey.trim(),
        },
        body: ideogramForm,
      });

      const ideogramData = await ideogramRes.json().catch(() => ({}));
      if (!ideogramRes.ok) {
        const status = ideogramRes.status;
        if (status === 401) {
          throw new Error('Clé API Ideogram non autorisée ou invalide. Vérifiez IDEOGRAM_API_KEY dans votre configuration serveur. Aucun crédit n’a été débité.');
        }
        if (status === 429) {
          throw new Error('Le quota ou la limite de requêtes de votre compte Ideogram est temporairement épuisé. Aucun crédit n’a été débité.');
        }
        if (status === 422) {
          throw new Error(ideogramData.detail || ideogramData.message || 'La demande a été rejetée par les contrôles de sécurité Ideogram. Aucun crédit n’a été débité.');
        }
        throw new Error(ideogramData.detail || ideogramData.message || ideogramData.error || `Échec de l'appel à l'API Ideogram 4.0 (remix - code ${status}). Aucun crédit n'a été débité.`);
      }

      const resultObj = ideogramData.data?.[0];
      const directImageUrl = resultObj?.url || null;

      if (!directImageUrl) {
        throw new Error('Aucune image n\'a été retournée par l\'API Ideogram 4.0 (remix).');
      }

      // Téléchargement et stockage permanent dans Supabase Storage
      generatedUrl = await storeGeneratedImage(supabaseAdmin, userId, directImageUrl, null);

    } else {
      // ═══ CHEMIN TEXTE SEUL : endpoint /v1/ideogram-v4/generate ═══
      const ideogramForm = new FormData();
      ideogramForm.append('text_prompt', finalPrompt);
      ideogramForm.append('resolution', ideogramResolution);

      const ideogramRes = await fetch(IDEOGRAM_V4_GENERATE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Api-Key': ideogramApiKey.trim(),
        },
        body: ideogramForm,
      });

      const ideogramData = await ideogramRes.json().catch(() => ({}));
      if (!ideogramRes.ok) {
        const status = ideogramRes.status;
        if (status === 401) {
          throw new Error('Clé API Ideogram non autorisée ou invalide. Vérifiez IDEOGRAM_API_KEY dans votre configuration serveur. Aucun crédit n’a été débité.');
        }
        if (status === 429) {
          throw new Error('Le quota ou la limite de requêtes de votre compte Ideogram est temporairement épuisé. Aucun crédit n’a été débité.');
        }
        if (status === 422) {
          throw new Error(ideogramData.detail || ideogramData.message || 'La demande a été rejetée par les contrôles de sécurité Ideogram. Aucun crédit n’a été débité.');
        }
        throw new Error(ideogramData.detail || ideogramData.message || ideogramData.error || `Échec de l'appel à l'API Ideogram 4.0 (generate - code ${status}). Aucun crédit n'a été débité.`);
      }

      const resultObj = ideogramData.data?.[0];
      const directImageUrl = resultObj?.url || null;

      if (!directImageUrl) {
        throw new Error('Aucune image n\'a été retournée par l\'API Ideogram 4.0.');
      }

      generatedUrl = await storeGeneratedImage(supabaseAdmin, userId, directImageUrl, null);
    }

    // ─── 7. Succès : enregistrement de l'image générée en base ───
    const { data: savedImage, error: saveErr } = await supabaseAdmin
      .from('generated_images')
      .insert({
        user_id: userId,
        url: generatedUrl,
        type_creation: type,
        style,
        format,
        prompt: finalPrompt,
        credits_utilises: fefoLot.cout_par_generation,
        credit_lot_id: fefoLot.id,
      })
      .select()
      .single();

    if (saveErr) console.warn('Erreur sauvegarde image:', saveErr);

    // Invalider le cache des images
    invalidateUserCache(userId);

    // ─── 8. Déduction des crédits UNIQUEMENT après succès confirmé ───
    const updatedLot = await deductCreditsForGeneration({
      userId,
      creditLotId: fefoLot.id,
      cost: fefoLot.cout_par_generation,
      generatedImageId: savedImage?.id,
    });

    // ─── 9. Libération immédiate de la place dans la file glissante ───
    await supabaseAdmin
      .from('generation_queue')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', queueId);

    return NextResponse.json({
      success: true,
      image: savedImage || { url: generatedUrl },
      credits_deducted: fefoLot.cout_par_generation,
      remaining_credits: updatedLot.credits_restants,
      queue_id: queueId,
    });
  } catch (error) {
    console.error('Erreur génération image:', error);

    // En cas d'échec : libérer la place dans la file et NE PAS déduire de crédits
    if (queueId) {
      await supabaseAdmin
        .from('generation_queue')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', queueId);
    }

    return NextResponse.json({
      error: error.message || 'Erreur lors de la génération de l\'image',
    }, { status: 500 });
  }
}

/**
 * Stocke l'image générée dans Supabase Storage.
 * Supporte à la fois les URLs temporaires OpenAI et les données base64.
 * 
 * @param {object} supabase - Client Supabase admin
 * @param {string} userId - UUID de l'utilisateur
 * @param {string|null} tempUrl - URL temporaire de l'image (si fournie)
 * @param {string|null} b64Data - Données base64 de l'image (si fournies)
 * @returns {Promise<string>} URL publique permanente dans Supabase Storage
 */
async function storeGeneratedImage(supabase, userId, tempUrl, b64Data) {
  let imgBuffer;

  if (b64Data) {
    imgBuffer = Buffer.from(b64Data, 'base64');
  } else if (tempUrl) {
    const imgFetch = await fetch(tempUrl);
    if (!imgFetch.ok) throw new Error('Impossible de télécharger l\'image générée depuis l\'API Ideogram 4.0.');
    imgBuffer = Buffer.from(await imgFetch.arrayBuffer());
  } else {
    throw new Error('Aucune image n\'a été retournée par l\'API Ideogram 4.0.');
  }

  const fileName = `${userId}/${Date.now()}_generated.png`;

  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from('generated-images')
    .upload(fileName, imgBuffer, {
      contentType: 'image/png',
      upsert: true,
    });

  if (uploadErr || !uploadData) {
    console.warn('Avertissement stockage generated-images:', uploadErr);
    // Si le stockage échoue mais qu'on a une URL temporaire, on l'utilise comme fallback
    if (tempUrl) return tempUrl;
    throw new Error('Échec du stockage de l\'image générée dans Supabase.');
  }

  const { data: publicUrlData } = supabase.storage
    .from('generated-images')
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}
