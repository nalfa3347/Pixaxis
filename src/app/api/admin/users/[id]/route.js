import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyAdminRequest, logAdminAction } from '@/lib/admin';

export async function GET(request, { params }) {
  try {
    const adminCheck = await verifyAdminRequest(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: 'Accès administrateur refusé.' }, { status: 403 });
    }

    const { id: targetUserId } = await params;
    if (!targetUserId) {
      return NextResponse.json({ error: 'ID utilisateur manquant' }, { status: 400 });
    }

    // Récupérer toutes les données isolées de l'utilisateur
    const [profileRes, creditsRes, txRes, genRes, importedRes] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle(),
      supabaseAdmin
        .from('credits')
        .select('*')
        .eq('user_id', targetUserId)
        .order('date_achat', { ascending: false }),
      supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('user_id', targetUserId)
        .order('date_transaction', { ascending: false }),
      supabaseAdmin
        .from('generated_images')
        .select('*')
        .eq('user_id', targetUserId)
        .order('date_creation', { ascending: false }),
      supabaseAdmin
        .from('imported_images')
        .select('*')
        .eq('user_id', targetUserId)
        .order('date_import', { ascending: false })
    ]);

    const profile = profileRes.data;
    if (!profile) {
      return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
    }

    const creditLots = creditsRes.data || [];
    const transactions = txRes.data || [];
    const generations = genRes.data || [];
    const importedImages = importedRes.data || [];

    // Calcul des totaux
    const creditsAchetes = creditLots.reduce((sum, c) => sum + (c.credits_initiaux || 0), 0);
    const creditsRestants = creditLots.reduce((sum, c) => sum + (c.credits_restants || 0), 0);
    const creditsConsommes = Math.max(0, creditsAchetes - creditsRestants);

    const paidTx = transactions.filter(
      (t) => (t.type === 'achat_pack' || t.type === 'achat') && (t.montant_fcfa || 0) > 0
    );
    const totalPayeFcfa = paidTx.reduce((sum, t) => sum + (t.montant_fcfa || 0), 0);

    // Journaliser l'accès à la fiche utilisateur
    logAdminAction({
      adminEmail: adminCheck.email,
      adminUserId: adminCheck.userId,
      action: 'view_user_dossier',
      target: targetUserId,
      result: 'success',
      metadata: { target_email: profile.email },
    });

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        nom: profile.display_name || 'Utilisateur',
        email: profile.email || 'Non renseigné',
        telephone: profile.phone || null,
        nom_business: profile.business_name || null,
        adresse_business: profile.business_address || null,
        marketing_pitch: profile.marketing_pitch || null,
        format_prefere: profile.preferred_format || '1024x1024',
        logo_url: profile.logo_url || null,
        premier_produit_url: profile.first_product_url || null,
        has_completed_onboarding: profile.has_completed_onboarding || false,
        date_creation: profile.created_at,
        updated_at: profile.updated_at,
      },
      summary: {
        total_paye_fcfa: totalPayeFcfa,
        credits_achetes: creditsAchetes,
        credits_consommes: creditsConsommes,
        credits_restants: creditsRestants,
        nombre_generations: generations.length,
        generations_admin_count: generations.filter((g) => g.is_admin === true).length,
      },
      transactions: transactions,
      credit_lots: creditLots,
      generations: generations,
      imported_images: importedImages,
    });
  } catch (error) {
    console.error('Erreur API /api/admin/users/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération de la fiche utilisateur.' },
      { status: 500 }
    );
  }
}
