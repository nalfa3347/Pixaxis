import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { supabaseAdmin, resolveUser } from '@/lib/supabase-server';

const MAX_LOGO_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/onboarding/logo
 * Sauvegarde le logo original de l'utilisateur dans son compte (isolé par user_id).
 */
export async function POST(request) {
  try {
    const user = await resolveUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié', requireAuth: true }, { status: 401 });
    }
    const userId = user.id;

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob) || file.size === 0) {
      return NextResponse.json({ error: 'Aucun fichier logo fourni.' }, { status: 400 });
    }

    if (file.size > MAX_LOGO_BYTES) {
      return NextResponse.json(
        { error: 'Le fichier logo dépasse la taille maximale de 5 MB.' },
        { status: 400 }
      );
    }

    // Lire et optimiser légèrement le logo pour s'assurer d'un PNG avec canal alpha transparent propre
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const logoInstance = sharp(inputBuffer);
    const logoPngBuffer = await logoInstance.png().toBuffer();

    const sanitizedName = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'logo.png';
    const filePath = `logos/${userId}/${Date.now()}_${sanitizedName}`;

    const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
      .from('imported-images')
      .upload(filePath, logoPngBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadErr || !uploadData) {
      console.error('Erreur upload logo storage:', uploadErr);
      return NextResponse.json({ error: 'Échec de la sauvegarde du logo.' }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('imported-images')
      .getPublicUrl(filePath);

    const logoUrl = publicUrlData.publicUrl;

    // Mise à jour du profil utilisateur
    await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        logo_url: logoUrl,
        updated_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      logoUrl,
      message: 'Logo enregistré avec succès dans votre compte.',
    });
  } catch (err) {
    console.error('Erreur POST /api/onboarding/logo:', err);
    return NextResponse.json({ error: err.message || 'Erreur interne du serveur' }, { status: 500 });
  }
}
