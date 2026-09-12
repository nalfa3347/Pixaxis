import { NextResponse } from 'next/server';
import { supabaseAdmin, resolveUser } from '@/lib/supabase-server';

/**
 * POST /api/onboarding/rate
 * Enregistre la note (1-5 étoiles) donnée par l'utilisateur à une image générée.
 */
export async function POST(request) {
  try {
    const user = await resolveUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié', requireAuth: true }, { status: 401 });
    }

    const { imageId, rating } = await request.json();

    if (!imageId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Note invalide (doit être comprise entre 1 et 5).' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('generated_images')
      .update({ rating: Math.round(rating) })
      .eq('id', imageId)
      .eq('user_id', user.id);

    if (error) {
      console.warn('Erreur mise à jour note:', error);
      return NextResponse.json({ error: 'Impossible d’enregistrer la note' }, { status: 500 });
    }

    return NextResponse.json({ success: true, rating });
  } catch (err) {
    console.error('Erreur POST /api/onboarding/rate:', err);
    return NextResponse.json({ error: err.message || 'Erreur interne' }, { status: 500 });
  }
}
