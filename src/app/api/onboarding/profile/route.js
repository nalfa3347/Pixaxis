import { NextResponse } from 'next/server';
import { supabaseAdmin, resolveUser } from '@/lib/supabase-server';

/**
 * GET /api/onboarding/profile
 * Récupère le profil et les données de marque de l'utilisateur connecté.
 */
export async function GET(request) {
  try {
    const user = await resolveUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié', requireAuth: true }, { status: 401 });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('Erreur récupération profil:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération du profil' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      profile: profile || {
        id: user.id,
        display_name: null,
        email: user.email || null,
        phone: null,
        business_name: null,
        business_address: null,
        marketing_pitch: null,
        preferred_format: '1024x1024',
        logo_url: null,
        first_product_url: null,
        has_completed_onboarding: false,
      },
    });
  } catch (err) {
    console.error('Erreur GET /api/onboarding/profile:', err);
    return NextResponse.json({ error: err.message || 'Erreur interne' }, { status: 500 });
  }
}

/**
 * POST /api/onboarding/profile
 * Met à jour les informations business et/ou le statut d'onboarding de l'utilisateur.
 */
export async function POST(request) {
  try {
    const user = await resolveUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié', requireAuth: true }, { status: 401 });
    }

    const body = await request.json();
    const {
      fullName,
      phone,
      businessName,
      businessAddress,
      marketingPitch,
      preferredFormat,
      logoUrl,
      firstProductUrl,
      hasCompletedOnboarding,
    } = body;

    const updates = {
      id: user.id,
      updated_at: new Date().toISOString(),
    };

    if (fullName !== undefined) updates.display_name = fullName ? fullName.trim() : null;
    if (phone !== undefined) updates.phone = phone ? phone.trim() : null;
    if (businessName !== undefined) updates.business_name = businessName ? businessName.trim() : null;
    if (businessAddress !== undefined) updates.business_address = businessAddress ? businessAddress.trim() : null;
    if (marketingPitch !== undefined) updates.marketing_pitch = marketingPitch ? marketingPitch.trim() : null;
    if (preferredFormat !== undefined) updates.preferred_format = preferredFormat || '1024x1024';
    if (logoUrl !== undefined) updates.logo_url = logoUrl || null;
    if (firstProductUrl !== undefined) updates.first_product_url = firstProductUrl || null;
    if (hasCompletedOnboarding !== undefined) updates.has_completed_onboarding = Boolean(hasCompletedOnboarding);

    const { data: updatedProfile, error } = await supabaseAdmin
      .from('profiles')
      .upsert(updates)
      .select()
      .single();

    if (error) {
      console.error('Erreur mise à jour profil:', error);
      return NextResponse.json({ error: 'Impossible de mettre à jour le profil.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    });
  } catch (err) {
    console.error('Erreur POST /api/onboarding/profile:', err);
    return NextResponse.json({ error: err.message || 'Erreur interne' }, { status: 500 });
  }
}
