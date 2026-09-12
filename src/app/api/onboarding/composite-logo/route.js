import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { supabaseAdmin, resolveUser } from '@/lib/supabase-server';
import { invalidateUserCache } from '@/app/api/images/route';

/**
 * POST /api/onboarding/composite-logo
 * Superpose fidèlement le logo original sur l'image générée avec Sharp.
 * Zéro hallucination IA, préservation vectorielle/alpha maximale.
 */
export async function POST(request) {
  try {
    const user = await resolveUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié', requireAuth: true }, { status: 401 });
    }
    const userId = user.id;

    const contentType = request.headers.get('content-type') || '';
    let imageId = null;
    let baseImageUrl = null;
    let logoBuffer = null;
    let logoUrl = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      imageId = formData.get('imageId');
      baseImageUrl = formData.get('imageUrl');
      const logoFile = formData.get('logoFile');

      if (logoFile && logoFile instanceof Blob && logoFile.size > 0) {
        logoBuffer = Buffer.from(await logoFile.arrayBuffer());

        // Enregistrer également ce logo dans le profil utilisateur et storage
        const logoName = logoFile.name ? logoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'logo.png';
        const logoPath = `logos/${userId}/${Date.now()}_${logoName}`;
        const { data: upData } = await supabaseAdmin.storage
          .from('imported-images')
          .upload(logoPath, logoBuffer, { contentType: 'image/png', upsert: true });

        if (upData) {
          const { data: pUrl } = supabaseAdmin.storage.from('imported-images').getPublicUrl(logoPath);
          logoUrl = pUrl.publicUrl;
          await supabaseAdmin.from('profiles').upsert({ id: userId, logo_url: logoUrl });
        }
      }
    } else {
      const body = await request.json();
      imageId = body.imageId;
      baseImageUrl = body.imageUrl;
      logoUrl = body.logoUrl;
    }

    // Si on n'a pas de logoBuffer mais qu'on a un logoUrl (ou dans le profil)
    if (!logoBuffer) {
      if (!logoUrl) {
        const { data: prof } = await supabaseAdmin
          .from('profiles')
          .select('logo_url')
          .eq('id', userId)
          .maybeSingle();
        logoUrl = prof?.logo_url;
      }

      if (!logoUrl) {
        return NextResponse.json({ error: 'Aucun logo disponible à intégrer.' }, { status: 400 });
      }

      const logoRes = await fetch(logoUrl);
      if (!logoRes.ok) throw new Error('Impossible de charger le fichier logo.');
      logoBuffer = Buffer.from(await logoRes.arrayBuffer());
    }

    // Récupérer l'URL de l'image de base si seulement imageId est fourni
    if (!baseImageUrl && imageId) {
      const { data: imgRecord } = await supabaseAdmin
        .from('generated_images')
        .select('url, original_url')
        .eq('id', imageId)
        .eq('user_id', userId)
        .maybeSingle();

      baseImageUrl = imgRecord?.original_url || imgRecord?.url;
    }

    if (!baseImageUrl) {
      return NextResponse.json({ error: 'Image de base introuvable.' }, { status: 400 });
    }

    // 1. Télécharger l'image de base
    const baseImgRes = await fetch(baseImageUrl);
    if (!baseImgRes.ok) throw new Error('Impossible de télécharger l\'image générée.');
    const baseImgBuffer = Buffer.from(await baseImgRes.arrayBuffer());

    // 2. Traitement Sharp
    const baseImage = sharp(baseImgBuffer);
    const baseMeta = await baseImage.metadata();
    const baseWidth = baseMeta.width || 1024;
    const baseHeight = baseMeta.height || 1024;

    // Calcul de la taille du logo (environ 18% de la largeur du visuel, max 14% de la hauteur)
    const targetLogoWidth = Math.round(baseWidth * 0.18);
    const targetLogoMaxHeight = Math.round(baseHeight * 0.14);

    const logoResizedBuffer = await sharp(logoBuffer)
      .resize({
        width: targetLogoWidth,
        height: targetLogoMaxHeight,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();

    const logoResizedMeta = await sharp(logoResizedBuffer).metadata();
    const logoW = logoResizedMeta.width || targetLogoWidth;
    const logoH = logoResizedMeta.height || targetLogoMaxHeight;

    // Positionnement : coin inférieur droit avec marge élégante (4% de la taille de l'image)
    const marginX = Math.round(baseWidth * 0.04);
    const marginY = Math.round(baseHeight * 0.04);
    const left = baseWidth - logoW - marginX;
    const top = baseHeight - logoH - marginY;

    // Superposition (compositing)
    const compositedBuffer = await baseImage
      .composite([
        {
          input: logoResizedBuffer,
          top: Math.max(0, top),
          left: Math.max(0, left),
        },
      ])
      .png({ quality: 92 })
      .toBuffer();

    // 3. Sauvegarde dans Supabase Storage (generated-images)
    const fileName = `${userId}/${Date.now()}_with_logo.png`;
    const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
      .from('generated-images')
      .upload(fileName, compositedBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadErr || !uploadData) {
      console.error('Erreur stockage image avec logo:', uploadErr);
      return NextResponse.json({ error: 'Échec du stockage de l\'image avec logo.' }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('generated-images')
      .getPublicUrl(fileName);

    const finalCompositedUrl = publicUrlData.publicUrl;

    // 4. Mettre à jour generated_images si imageId existe
    if (imageId) {
      await supabaseAdmin
        .from('generated_images')
        .update({
          original_url: baseImageUrl,
          url: finalCompositedUrl,
        })
        .eq('id', imageId)
        .eq('user_id', userId);
    }

    invalidateUserCache(userId);

    return NextResponse.json({
      success: true,
      compositedUrl: finalCompositedUrl,
      originalUrl: baseImageUrl,
      logoUrl: logoUrl || null,
      message: 'Logo intégré parfaitement à votre création.',
    });
  } catch (err) {
    console.error('Erreur POST /api/onboarding/composite-logo:', err);
    return NextResponse.json({ error: err.message || 'Erreur interne du serveur' }, { status: 500 });
  }
}
