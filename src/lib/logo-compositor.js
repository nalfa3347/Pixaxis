import sharp from 'sharp';
import { supabaseAdmin } from '@/lib/supabase-server';
import { invalidateUserCache } from '@/app/api/images/route';

/**
 * PIXAXIS — Compositeur de Logo
 * 
 * Règle d'or :
 * 1. Image produit = référence principale envoyée à Ideogram 4.0 pour créer la scène.
 * 2. Logo = fichier original conservé séparément (PNG/SVG transparent) pour éviter toute hallucination IA.
 * 3. Ideogram 4 = génération de la scène / publicité autour du produit.
 * 4. Logo = ajout ultérieur par l'application via Sharp pour une netteté vectorielle parfaite.
 * 
 * @param {object} params
 * @param {string} params.userId - Identifiant de l'utilisateur
 * @param {string} [params.imageId] - ID Supabase de l'image générée (optionnel)
 * @param {string} params.baseImageUrl - URL de l'image générée (scène/publicité)
 * @param {string} [params.logoUrl] - URL du logo original stocké
 * @param {Buffer} [params.logoBuffer] - Buffer binaire du logo original
 * @param {string} [params.position='bottom-right'] - Positionnement ('bottom-right' | 'bottom-left' | 'top-right' | 'top-left')
 * @returns {Promise<{ success: boolean, compositedUrl: string, originalUrl: string, logoUrl: string }>}
 */
export async function compositeLogoOnVisual({
  userId,
  imageId = null,
  baseImageUrl,
  logoUrl = null,
  logoBuffer = null,
  position = 'bottom-right',
}) {
  if (!userId) throw new Error('Utilisateur non spécifié pour la composition du logo.');
  if (!baseImageUrl) throw new Error('URL de l\'image de base manquante.');

  // 1. Récupération du buffer du logo
  let activeLogoBuffer = logoBuffer;
  let activeLogoUrl = logoUrl;

  if (!activeLogoBuffer) {
    if (!activeLogoUrl) {
      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('logo_url')
        .eq('id', userId)
        .maybeSingle();
      activeLogoUrl = prof?.logo_url;
    }

    if (!activeLogoUrl) {
      throw new Error('Aucun logo original disponible. Veuillez d\'abord importer votre logo.');
    }

    const logoRes = await fetch(activeLogoUrl);
    if (!logoRes.ok) throw new Error('Impossible de charger le fichier original du logo.');
    activeLogoBuffer = Buffer.from(await logoRes.arrayBuffer());
  }

  // 2. Téléchargement de l'image de base (générée par Ideogram 4.0)
  const baseImgRes = await fetch(baseImageUrl);
  if (!baseImgRes.ok) throw new Error('Impossible de charger l\'image publicitaire de base.');
  const baseImgBuffer = Buffer.from(await baseImgRes.arrayBuffer());

  // 3. Mesures et dimensionnement précis via Sharp
  const baseImage = sharp(baseImgBuffer);
  const baseMeta = await baseImage.metadata();
  const baseWidth = baseMeta.width || 1024;
  const baseHeight = baseMeta.height || 1024;

  // Règle ergonomique : logo = 18% de la largeur du visuel, max 14% de la hauteur
  const targetLogoWidth = Math.round(baseWidth * 0.18);
  const targetLogoMaxHeight = Math.round(baseHeight * 0.14);

  // Redimensionnement du logo original sans déformation (fit: inside, canal alpha préservé)
  const logoResizedBuffer = await sharp(activeLogoBuffer)
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

  // Marges élégantes : 4% de la largeur et hauteur
  const marginX = Math.round(baseWidth * 0.04);
  const marginY = Math.round(baseHeight * 0.04);

  let left, top;
  switch (position) {
    case 'bottom-left':
      left = marginX;
      top = baseHeight - logoH - marginY;
      break;
    case 'top-right':
      left = baseWidth - logoW - marginX;
      top = marginY;
      break;
    case 'top-left':
      left = marginX;
      top = marginY;
      break;
    case 'bottom-right':
    default:
      left = baseWidth - logoW - marginX;
      top = baseHeight - logoH - marginY;
      break;
  }

  // 4. Superposition haute netteté (compositing Sharp)
  const compositedBuffer = await baseImage
    .composite([
      {
        input: logoResizedBuffer,
        top: Math.max(0, top),
        left: Math.max(0, left),
      },
    ])
    .png({ quality: 95 })
    .toBuffer();

  // 5. Sauvegarde permanente dans Supabase Storage (generated-images)
  const fileName = `${userId}/${Date.now()}_with_logo.png`;
  const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
    .from('generated-images')
    .upload(fileName, compositedBuffer, {
      contentType: 'image/png',
      upsert: true,
    });

  if (uploadErr || !uploadData) {
    console.error('Erreur stockage image avec logo:', uploadErr);
    throw new Error('Échec de la sauvegarde de l\'image avec logo dans le cloud.');
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from('generated-images')
    .getPublicUrl(fileName);

  const finalCompositedUrl = publicUrlData.publicUrl;

  // 6. Mise à jour dans generated_images si imageId est fourni
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

  // Invalidation du cache pour rafraîchissement immédiat
  invalidateUserCache(userId);

  return {
    success: true,
    compositedUrl: finalCompositedUrl,
    originalUrl: baseImageUrl,
    logoUrl: activeLogoUrl,
  };
}
