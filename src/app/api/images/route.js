import { NextResponse } from 'next/server';
import { supabaseAdmin, resolveUser } from '@/lib/supabase-server';
import { MAX_REFERENCE_IMAGES } from '@/config/constants';

// Cache en mémoire (2min TTL) — les imported_images contiennent des URLs base64 énormes (~100KB/image)
// Le cache est invalidé immédiatement par POST et DELETE, donc 2min est sûr
const imagesCache = new Map();
const CACHE_TTL = 120000;

function getCacheKey(userId, tab) {
  return `${userId}:${tab}`;
}

export function invalidateUserCache(userId) {
  for (const key of imagesCache.keys()) {
    if (key.startsWith(userId)) {
      imagesCache.delete(key);
    }
  }
}

/**
 * GET /api/images
 * Récupère les images de l'utilisateur selon l'onglet demandé :
 * - created : images générées par l'IA (table generated_images)
 * - imported : images de référence importées (table imported_images)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const user = await resolveUser(request);
    if (!user) {
      return NextResponse.json({ images: [], authenticated: false });
    }
    const userId = user.id;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

    // Vérifier le cache
    const cacheKey = getCacheKey(userId, tab);
    const cached = imagesCache.get(cacheKey);
    if (cached && Date.now() - cached.time < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    let result;

    if (tab === 'imported') {
      const { data, error } = await supabaseAdmin
        .from('imported_images')
        .select('id, url, filename, date_import')
        .eq('user_id', userId)
        .order('date_import', { ascending: false })
        .limit(limit);

      if (error) throw error;
      result = { images: data || [] };
    } else {
      // Onglet par défaut : created
      const { data, error } = await supabaseAdmin
        .from('generated_images')
        .select('id, url, type_creation, style, format, date_creation, credits_utilises')
        .eq('user_id', userId)
        .order('date_creation', { ascending: false })
        .limit(limit);

      if (error) throw error;
      result = { images: data || [] };
    }

    // Mettre en cache
    imagesCache.set(cacheKey, { data: result, time: Date.now() });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erreur GET /api/images:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/images
 * Upload d'une image de référence vers Supabase Storage + enregistrement en base.
 */
export async function POST(request) {
  try {
    const formData = await request.formData();
    const user = await resolveUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Veuillez vous connecter pour importer des images.' }, { status: 401 });
    }
    const userId = user.id;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    if (files.length > MAX_REFERENCE_IMAGES) {
      return NextResponse.json({ 
        error: `Vous ne pouvez pas importer plus de ${MAX_REFERENCE_IMAGES} images à la fois.` 
      }, { status: 400 });
    }

    const uploaded = [];

    for (const file of files) {
      if (!(file instanceof Blob)) continue;

      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = `${userId}/${Date.now()}_${file.name?.replace(/[^a-zA-Z0-9.-]/g, '_') || 'ref.png'}`;

      // Upload dans le bucket Supabase Storage
      const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
        .from('imported-images')
        .upload(fileName, buffer, {
          contentType: file.type || 'image/png',
          upsert: true,
        });

      if (uploadErr || !uploadData) {
        console.error('Erreur Supabase Storage upload:', uploadErr);
        throw new Error(`Échec du téléversement de "${file.name || 'image'}" vers Supabase Storage: ${uploadErr?.message || 'Erreur inconnue'}`);
      }

      const { data: urlData } = supabaseAdmin.storage
        .from('imported-images')
        .getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      // Enregistrement en base
      const { data: record, error: dbErr } = await supabaseAdmin
        .from('imported_images')
        .insert({
          user_id: userId,
          url: publicUrl,
          filename: file.name || 'image.png',
          file_size: file.size || buffer.length,
        })
        .select()
        .single();

      if (dbErr) console.warn('Avertissement DB import:', dbErr);
      uploaded.push(record || { url: publicUrl, filename: file.name });
    }

    // Invalider le cache après un import
    invalidateUserCache(userId);

    return NextResponse.json({
      success: true,
      count: uploaded.length,
      images: uploaded,
    });
  } catch (error) {
    console.error('Erreur POST /api/images:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/images
 * Suppression normale et complète d'une image importée :
 * - Supprime le fichier physique dans le bucket Supabase Storage (imported-images)
 * - Supprime l'enregistrement correspondant dans la table imported_images
 */
export async function DELETE(request) {
  try {
    const user = await resolveUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Veuillez vous connecter.' }, { status: 401 });
    }
    const userId = user.id;

    let id = null;
    let url = null;

    // Récupération de l'ID via query param ou body JSON
    const { searchParams } = new URL(request.url);
    id = searchParams.get('id');
    url = searchParams.get('url');

    if (!id && !url) {
      try {
        const body = await request.json();
        id = body.id;
        url = body.url;
      } catch (e) {
        // Pas de body JSON
      }
    }

    if (!id && !url) {
      return NextResponse.json({ error: 'ID ou URL requis pour la suppression' }, { status: 400 });
    }

    // 1. Recherche de l'enregistrement appartenant à cet utilisateur
    let query = supabaseAdmin.from('imported_images').select('*').eq('user_id', userId);
    if (id) {
      query = query.eq('id', id);
    } else {
      query = query.eq('url', url);
    }

    const { data: records, error: findErr } = await query;
    if (findErr) throw findErr;
    if (!records || records.length === 0) {
      return NextResponse.json({ error: 'Image non trouvée' }, { status: 404 });
    }

    const target = records[0];

    // 2. Suppression dans le bucket Supabase Storage si stockée
    try {
      const bucketName = 'imported-images';
      let storagePath = null;
      if (target.url && target.url.includes(`/storage/v1/object/public/${bucketName}/`)) {
        storagePath = target.url.split(`/storage/v1/object/public/${bucketName}/`)[1];
      } else if (target.url && target.url.includes(`/${bucketName}/`)) {
        storagePath = target.url.split(`/${bucketName}/`)[1];
      }

      if (storagePath) {
        storagePath = decodeURIComponent(storagePath.split('?')[0]);
        const { error: storageErr } = await supabaseAdmin.storage
          .from(bucketName)
          .remove([storagePath]);
        if (storageErr) {
          console.warn('Avertissement suppression Storage Supabase:', storageErr);
        }
      }
    } catch (storageException) {
      console.warn('Exception suppression Storage:', storageException);
    }

    // 3. Suppression définitive dans la table imported_images
    const { error: deleteDbErr } = await supabaseAdmin
      .from('imported_images')
      .delete()
      .eq('id', target.id)
      .eq('user_id', userId);

    if (deleteDbErr) throw deleteDbErr;

    // Invalider le cache après une suppression
    invalidateUserCache(userId);

    return NextResponse.json({
      success: true,
      message: 'Image importée définitivement supprimée',
      id: target.id,
    });
  } catch (error) {
    console.error('Erreur DELETE /api/images:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

