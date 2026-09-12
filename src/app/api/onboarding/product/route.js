import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { supabaseAdmin, resolveUser } from '@/lib/supabase-server';
import { invalidateUserCache } from '@/app/api/images/route';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_SERVER_DIMENSION_PX = 2048;

/**
 * POST /api/onboarding/product
 * Upload et optimisation serveur du premier produit de l'utilisateur.
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
      return NextResponse.json({ error: 'Aucun fichier image fourni.' }, { status: 400 });
    }

    // 1. Validation stricte de la taille (max 5 MB)
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: 'Cette image est trop lourde. Taille maximale : 5 MB.' },
        { status: 400 }
      );
    }

    // 2. Traitement et optimisation Sharp côté serveur (max 2048px, compression haute fidélité)
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const imageInstance = sharp(inputBuffer);
    const metadata = await imageInstance.metadata();

    let pipeline = imageInstance;
    if (metadata.width > MAX_SERVER_DIMENSION_PX || metadata.height > MAX_SERVER_DIMENSION_PX) {
      pipeline = pipeline.resize({
        width: MAX_SERVER_DIMENSION_PX,
        height: MAX_SERVER_DIMENSION_PX,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Compression PNG de haute qualité préservant les matières et détails
    const optimizedBuffer = await pipeline
      .png({ quality: 90, compressionLevel: 6 })
      .toBuffer();

    // 3. Téléversement dans Supabase Storage (bucket imported-images)
    const sanitizedName = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'produit.png';
    const filePath = `${userId}/${Date.now()}_product_${sanitizedName}`;

    const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
      .from('imported-images')
      .upload(filePath, optimizedBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadErr || !uploadData) {
      console.error('Erreur upload Supabase storage:', uploadErr);
      return NextResponse.json({ error: 'Échec de la sauvegarde de l’image.' }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('imported-images')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    // 4. Enregistrement en base de données
    const { data: insertedImage, error: dbErr } = await supabaseAdmin
      .from('imported_images')
      .insert({
        user_id: userId,
        url: publicUrl,
        filename: sanitizedName,
        file_size: optimizedBuffer.length,
      })
      .select()
      .single();

    if (dbErr) {
      console.warn('Erreur insertion imported_images:', dbErr);
    }

    // 5. Sauvegarder dans le profil utilisateur comme premier produit
    const { error: profErr } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        first_product_url: publicUrl,
        updated_at: new Date().toISOString(),
      });

    if (profErr) {
      console.warn('Erreur mise à jour profil first_product_url:', profErr);
    }

    invalidateUserCache(userId);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      id: insertedImage?.id || null,
      message: 'Produit ajouté et optimisé avec succès.',
    });
  } catch (err) {
    console.error('Erreur POST /api/onboarding/product:', err);
    return NextResponse.json({ error: err.message || 'Erreur interne du serveur' }, { status: 500 });
  }
}
