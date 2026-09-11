import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { 
  CREATION_TYPES, 
  VISUAL_STYLES, 
  FORMATS, 
  MAX_REFERENCE_IMAGES, 
  MAX_CONCURRENT_GENERATIONS,
  OPENAI_MODEL,
  OPENAI_IMAGE_QUALITY,
  buildPrompt 
} from '@/config/constants';
import { getFefoActiveLot, deductCreditsForGeneration } from '@/lib/credit-manager';
import { invalidateUserCache } from '@/app/api/images/route';

export async function POST(request) {
  let queueId = null;
  const userIdHeader = request.headers.get('x-user-id');
  const userId = userIdHeader || '00000000-0000-0000-0000-000000000001';

  try {
    const body = await request.json();
    const { 
      type, 
      style, 
      format, 
      reference_images = [], 
      additional_prompt = '' 
    } = body;

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

    if (reference_images.length > MAX_REFERENCE_IMAGES) {
      return NextResponse.json({ 
        error: `Vous ne pouvez pas fournir plus de ${MAX_REFERENCE_IMAGES} images de référence.` 
      }, { status: 400 });
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
        error: 'Vous n’avez aucun crédit actif. Veuillez acheter un pack pour générer des images.',
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
        reference_images: reference_images.slice(0, MAX_REFERENCE_IMAGES),
        credit_lot_id: fefoLot.id,
        cost: fefoLot.cout_par_generation,
      })
      .select()
      .single();

    if (queueErr || !queueItem) {
      throw new Error('Impossible d’enregistrer la demande dans la file.');
    }
    queueId = queueItem.id;

    // ─── 5. Construction du prompt final automatique ───
    const finalPrompt = buildPrompt(type, style, reference_images.length > 0, additional_prompt);

    // ─── 6. Appel API de génération d'image ───
    let generatedUrl = '';
    const openAiKey = process.env.OPENAI_API_KEY;

    if (openAiKey) {
      const openAiRes = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          prompt: finalPrompt,
          n: 1,
          size: format === '1024x1792' ? '1024x1792' : format === '1792x1024' ? '1792x1024' : '1024x1024',
          quality: OPENAI_IMAGE_QUALITY,
        }),
      });

      const openAiData = await openAiRes.json();
      if (!openAiRes.ok) {
        const errCode = openAiData.error?.code;
        if (errCode === 'credit_balance_exhausted' || openAiData.error?.type === 'insufficient_quota') {
          throw new Error('Le solde de crédits de l’API OpenAI est temporairement épuisé. Veuillez recharger votre compte OpenAI ou réessayer plus tard. Aucun crédit PIXAXIS n’a été débité.');
        }
        throw new Error(openAiData.error?.message || 'Échec de l’appel à l’API OpenAI');
      }

      const tempUrl = openAiData.data?.[0]?.url;

      // Téléchargement et stockage permanent dans Supabase Storage (bucket generated-images)
      if (tempUrl) {
        try {
          const imgFetch = await fetch(tempUrl);
          const imgBuffer = Buffer.from(await imgFetch.arrayBuffer());
          const fileName = `${userId}/${Date.now()}_generated.png`;

          const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
            .from('generated-images')
            .upload(fileName, imgBuffer, {
              contentType: 'image/png',
              upsert: true,
            });

          if (!uploadErr && uploadData) {
            const { data: publicUrlData } = supabaseAdmin.storage
              .from('generated-images')
              .getPublicUrl(fileName);
            generatedUrl = publicUrlData.publicUrl;
          } else {
            console.warn('Avertissement stockage generated-images:', uploadErr);
            generatedUrl = tempUrl;
          }
        } catch (uploadException) {
          console.warn('Exception upload generated-images:', uploadException);
          generatedUrl = tempUrl;
        }
      }
    } else {
      // Simulation visuelle SVG/WebP si clé non renseignée
      generatedUrl = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1024&q=80`;
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
      error: error.message || 'Erreur lors de la génération de l’image',
    }, { status: 500 });
  }
}
