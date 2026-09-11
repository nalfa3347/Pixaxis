import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * GET /api/download
 * Route de téléchargement direct :
 * - Reçoit l'URL de l'image et le nom souhaité (ex: ?url=...&filename=image.png)
 * - Récupère le flux binaire côté serveur (évite tout problème CORS ou de prévisualisation)
 * - Renvoie le fichier avec 'Content-Disposition: attachment' forçant l'enregistrement
 *   direct sur le disque de l'appareil (dossier Téléchargements) plutôt qu'une ouverture en onglet.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');
    const filename = searchParams.get('filename') || 'pixaxis_image.png';

    if (!imageUrl) {
      return NextResponse.json({ error: 'URL manquante' }, { status: 400 });
    }

    // Sécurisation du nom de fichier
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    let imageBuffer;
    let contentType = 'image/png';

    if (imageUrl.startsWith('data:')) {
      // Cas Data URL (Base64)
      const matches = imageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        contentType = matches[1];
        imageBuffer = Buffer.from(matches[2], 'base64');
      } else {
        return NextResponse.json({ error: 'Data URL invalide' }, { status: 400 });
      }
    } else {
      // Cas URL Supabase Storage ou URL externe
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Échec de récupération de l'image: ${response.statusText}`);
      }

      contentType = response.headers.get('content-type') || 'image/png';
      const arrayBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    }

    return new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Content-Length': imageBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Erreur GET /api/download:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
