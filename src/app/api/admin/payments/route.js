import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyAdminRequest, logAdminAction } from '@/lib/admin';
import { getPackById } from '@/config/constants';

export async function GET(request) {
  try {
    const adminCheck = await verifyAdminRequest(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: 'Accès administrateur refusé.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'all'; // all | reussi | en_attente | echoue
    const periodFilter = searchParams.get('period') || 'all'; // all | today | 7d | 30d

    // Récupérer toutes les transactions de type achat ainsi que les profils pour associer les noms
    const [txRes, profilesRes] = await Promise.all([
      supabaseAdmin
        .from('transactions')
        .select('*')
        .in('type', ['achat_pack', 'achat', 'achat_pending', 'paiement_echoue'])
        .order('date_transaction', { ascending: false }),
      supabaseAdmin
        .from('profiles')
        .select('id, display_name, email, phone')
    ]);

    const transactions = txRes.data || [];
    const profiles = profilesRes.data || [];
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Formater chaque transaction
    const formatted = transactions.map((t) => {
      const user = profileMap.get(t.user_id);
      const isApproved = (t.type === 'achat_pack' || t.type === 'achat') && (t.montant_fcfa || 0) > 0;
      const isPending = t.type === 'achat_pending';
      const isFailed = t.type === 'paiement_echoue';
      
      const pack = t.pack_id ? getPackById(t.pack_id) : null;
      const packName = pack?.name || t.pack_id || 'Pack standard';

      let statutStandard = 'en_attente';
      if (isApproved) statutStandard = 'reussi';
      else if (isFailed) statutStandard = 'echoue';

      return {
        id: t.id,
        fedapay_transaction_id: t.fedapay_transaction_id || null,
        user_id: t.user_id,
        user_name: user?.display_name || 'Utilisateur inconnu',
        user_email: user?.email || 'Sans email',
        user_phone: user?.phone || null,
        pack_id: t.pack_id,
        forfait: packName,
        montant_fcfa: t.montant_fcfa || pack?.price_fcfa || 0,
        credits_attribues: t.credits_ajoutes || pack?.credits_credited || 0,
        statut: statutStandard,
        date: t.date_transaction,
        type_brut: t.type,
      };
    });

    // Filtre par période
    let filtered = formatted;
    if (periodFilter === 'today') {
      filtered = filtered.filter((t) => t.date >= startOfToday);
    } else if (periodFilter === '7d') {
      filtered = filtered.filter((t) => t.date >= sevenDaysAgo);
    } else if (periodFilter === '30d') {
      filtered = filtered.filter((t) => t.date >= thirtyDaysAgo);
    }

    // Filtre par statut
    if (statusFilter === 'reussi') {
      filtered = filtered.filter((t) => t.statut === 'reussi');
    } else if (statusFilter === 'en_attente') {
      filtered = filtered.filter((t) => t.statut === 'en_attente');
    } else if (statusFilter === 'echoue') {
      filtered = filtered.filter((t) => t.statut === 'echoue');
    }

    // Calcul des totaux globaux
    const totalReussi = formatted.filter((t) => t.statut === 'reussi');
    const totalEchoueOrPending = formatted.filter((t) => t.statut !== 'reussi');
    const montantTotalPaye = totalReussi.reduce((sum, t) => sum + (t.montant_fcfa || 0), 0);

    logAdminAction({
      adminEmail: adminCheck.email,
      adminUserId: adminCheck.userId,
      action: 'view_payments',
      target: `status_${statusFilter}_period_${periodFilter}`,
      result: 'success',
      metadata: { count: filtered.length, montantTotalPaye },
    });

    return NextResponse.json({
      success: true,
      summary: {
        montant_total_paye: montantTotalPaye,
        transactions_reussies: totalReussi.length,
        transactions_echouees: totalEchoueOrPending.length,
        total_transactions: formatted.length,
      },
      payments: filtered,
    });
  } catch (error) {
    console.error('Erreur API /api/admin/payments:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération des paiements.' },
      { status: 500 }
    );
  }
}
