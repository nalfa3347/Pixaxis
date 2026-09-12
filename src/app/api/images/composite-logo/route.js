import { NextResponse } from 'next/server';
import { resolveUser, supabaseAdmin } from '@/lib/supabase-server';
import { compositeLogoOnVisual } from '@/lib/logo-compositor';

/**
 * POST /api/images/composite-logo
 * 
 * Pipeline officiel PIXAXIS :
 * 1. Image produit = référence principale transmise à Ideogram 4.0
 * 2. Logo = fichier original conservé séparément (sans aucune altération IA)
 * 3. Ideogram 4 = génération de la scène / publicité haute conversion
 * 4. Logo = ajout ultérieur par l'application via Sharp (haute fidélité)
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
    let position = 'bottom-right';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      imageId = formData.get('imageId');
      baseImageUrl = formData.get('imageUrl');
      position = formData.get('position') || 'bottom-right';
      const logoFile = formData.get('logoFile');

      if (logoFile && logoFile instanceof Blob && logoFile.size > 0) {
        logoBuffer = Buffer.from(await logoFile.arrayBuffer());

        // Sauvegarder ce logo séparément dans le profil et dans le storage
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
      position = body.position || 'bottom-right';
    }

    // Récupérer l'URL de base si seulement imageId est fourni
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
      return NextResponse.json({ error: 'Image publicitaire de base introuvable.' }, { status: 400 });
    }

    const result = await compositeLogoOnVisual({
      userId,
      imageId,
      baseImageUrl,
      logoUrl,
      logoBuffer,
      position,
    });

    return NextResponse.json({
      ...result,
      message: 'Logo original intégré fidèlement sans aucune déformation IA.',
    });
  } catch (err) {
    console.error('Erreur POST /api/images/composite-logo:', err);
    return NextResponse.json({ error: err.message || 'Erreur lors de l\'intégration du logo' }, { status: 500 });
  }
}
