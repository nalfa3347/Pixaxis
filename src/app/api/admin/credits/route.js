import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyAdminRequest, logAdminAction } from '@/lib/admin';

export async function GET(request) {
  try {
    const adminCheck = await verifyAdminRequest(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: 'Accès administrateur refusé.' }, { status: 403 });
    }

    const [creditsRes, txRes, profilesRes] = await Promise.all([
      supabaseAdmin
        .from('credits')
        .select('*')
        .order('date_achat', { ascending: false }),
      supabaseAdmin
        .from('transactions')
        .select('*')
        .order('date_transaction', { ascending: false })
        .limit(200),
      supabaseAdmin
        .from('profiles')
        .select('id, display_name, email')
    ]);

    const creditLots = creditsRes.data || [];
    const transactions = txRes.data || [];
    const profiles = profilesRes.data || [];
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    const now = new Date();

    // ─── Synthèse globale des crédits ──────────────────────────────
    const totalAchetesFcfa = creditLots.reduce((sum, c) => sum + (c.montant_achete || 0), 0);
    const totalAttribues = creditLots.reduce((sum, c) => sum + (c.credits_initiaux || 0), 0);
    const totalRestants = creditLots.reduce((sum, c) => sum + (c.credits_restants || 0), 0);
    const totalConsommes = Math.max(0, totalAttribues - totalRestants);

    // Lots expirés
    const expiredLots = creditLots.filter(
      (c) => new Date(c.date_expiration) < now && (c.credits_restants || 0) > 0
    );
    const totalExpires = expiredLots.reduce((sum, c) => sum + (c.credits_restants || 0), 0);

    // ─── Historique des mouvements (Grand Livre) ───────────────────
    const ledger = transactions.map((t) => {
      const user = profileMap.get(t.user_id);
      const isPurchase = t.type === 'achat_pack' || t.type === 'achat';
      const isGeneration = t.type === 'generation';
      const isAdjustment = t.type === 'ajustement_admin';

      let operationLabel = 'Opération';
      let montantImpact = 0;
      let impactType = 'neutral';

      if (isPurchase) {
        operationLabel = `Achat pack (${t.pack_id || 'Pack'})`;
        montantImpact = +(t.credits_ajoutes || 0);
        impactType = 'credit';
      } else if (isGeneration) {
        operationLabel = 'Génération d’image IA';
        montantImpact = -(t.credits_debites || 0);
        impactType = 'debit';
      } else if (isAdjustment) {
        operationLabel = 'Ajustement administrateur';
        montantImpact = t.credits_ajoutes ? +t.credits_ajoutes : -(t.credits_debites || 0);
        impactType = montantImpact >= 0 ? 'credit' : 'debit';
      } else {
        operationLabel = t.type || 'Mouvement';
        montantImpact = t.credits_ajoutes || -(t.credits_debites || 0);
      }

      return {
        id: t.id,
        user_id: t.user_id,
        user_name: user?.display_name || 'Utilisateur inconnu',
        user_email: user?.email || 'Sans email',
        type_operation: operationLabel,
        type_brut: t.type,
        montant_credits: montantImpact,
        impact_type: impactType,
        date: t.date_transaction,
        reference: t.fedapay_transaction_id || t.generated_image_id || t.credit_lot_id || t.id,
        pack_id: t.pack_id || null,
      };
    });

    logAdminAction({
      adminEmail: adminCheck.email,
      adminUserId: adminCheck.userId,
      action: 'view_credits_ledger',
      target: 'credits_page',
      result: 'success',
      metadata: { totalAttribues, totalConsommes, totalRestants },
    });

    return NextResponse.json({
      success: true,
      summary: {
        total_achetes_fcfa: totalAchetesFcfa,
        total_attribues: totalAttribues,
        total_consommes: totalConsommes,
        total_restants: totalRestants,
        total_expires: totalExpires,
        lots_actifs_count: creditLots.filter((c) => (c.credits_restants || 0) > 0).length,
      },
      ledger: ledger,
      lots: creditLots.map((lot) => ({
        ...lot,
        user_name: profileMap.get(lot.user_id)?.display_name || 'Utilisateur inconnu',
        user_email: profileMap.get(lot.user_id)?.email || 'Sans email',
        is_expired: new Date(lot.date_expiration) < now,
      })),
    });
  } catch (error) {
    console.error('Erreur API /api/admin/credits:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération des crédits admin.' },
      { status: 500 }
    );
  }
}
