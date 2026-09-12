import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { 
  verifyAdminRequest, 
  logAdminAction, 
  IDEOGRAM_COST_PER_REQUEST_FCFA, 
  IDEOGRAM_COST_PER_REQUEST_USD 
} from '@/lib/admin';
import { CREDIT_PACKS } from '@/config/constants';

export async function GET(request) {
  try {
    const adminCheck = await verifyAdminRequest(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { error: 'Accès administrateur refusé.' },
        { status: 403 }
      );
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Exécution parallèle des requêtes principales Supabase
    const [
      profilesRes,
      genImagesRes,
      txRes,
      creditsRes
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, created_at, email, display_name'),
      supabaseAdmin.from('generated_images').select('id, user_id, date_creation, credits_utilises, is_admin, type_creation'),
      supabaseAdmin.from('transactions').select('id, user_id, type, montant_fcfa, credits_debites, credits_ajoutes, pack_id, date_transaction'),
      supabaseAdmin.from('credits').select('id, user_id, pack_id, montant_achete, credits_initiaux, credits_restants, date_achat, date_expiration')
    ]);

    const users = profilesRes.data || [];
    const generations = genImagesRes.data || [];
    const transactions = txRes.data || [];
    const creditLots = creditsRes.data || [];

    // ─── Indicateurs Utilisateurs ───────────────────────────────────
    const totalUsers = users.length;
    const newUsersToday = users.filter((u) => u.created_at >= startOfToday).length;
    const newUsersThisWeek = users.filter((u) => u.created_at >= sevenDaysAgo).length;
    const newUsersThisMonth = users.filter((u) => u.created_at >= thirtyDaysAgo).length;

    // Utilisateurs actifs : ayant effectué au moins 1 génération ou 1 transaction
    const activeUserIds = new Set([
      ...generations.map((g) => g.user_id),
      ...transactions.map((t) => t.user_id),
    ]);
    const activeUsersCount = activeUserIds.size;

    // ─── Indicateurs Générations ────────────────────────────────────
    const totalGenerations = generations.length;
    const genToday = generations.filter((g) => g.date_creation >= startOfToday).length;
    const genThisWeek = generations.filter((g) => g.date_creation >= sevenDaysAgo).length;
    const genThisMonth = generations.filter((g) => g.date_creation >= thirtyDaysAgo).length;

    const adminGenerations = generations.filter((g) => g.is_admin === true);
    const paidGenerations = generations.filter((g) => g.is_admin !== true);

    // ─── Indicateurs Chiffre d'Affaires & Transactions FedaPay ───────
    // Achats validés
    const paidPurchases = transactions.filter(
      (t) => (t.type === 'achat_pack' || t.type === 'achat') && (t.montant_fcfa || 0) > 0
    );
    const pendingPurchases = transactions.filter((t) => t.type === 'achat_pending');

    const caTotal = paidPurchases.reduce((sum, t) => sum + (t.montant_fcfa || 0), 0);
    const caToday = paidPurchases
      .filter((t) => t.date_transaction >= startOfToday)
      .reduce((sum, t) => sum + (t.montant_fcfa || 0), 0);
    const caThisWeek = paidPurchases
      .filter((t) => t.date_transaction >= sevenDaysAgo)
      .reduce((sum, t) => sum + (t.montant_fcfa || 0), 0);
    const caThisMonth = paidPurchases
      .filter((t) => t.date_transaction >= thirtyDaysAgo)
      .reduce((sum, t) => sum + (t.montant_fcfa || 0), 0);

    const successfulPaymentsCount = paidPurchases.length;
    const failedOrPendingPaymentsCount = pendingPurchases.length;
    const averageBasket = successfulPaymentsCount > 0 
      ? Math.round(caTotal / successfulPaymentsCount) 
      : 0;

    // ─── Indicateurs Crédits ─────────────────────────────────────────
    const totalCreditsPurchased = creditLots.reduce((sum, c) => sum + (c.credits_initiaux || 0), 0);
    const totalCreditsRemaining = creditLots.reduce((sum, c) => sum + (c.credits_restants || 0), 0);
    const totalCreditsConsumed = creditLots.reduce(
      (sum, c) => sum + Math.max(0, (c.credits_initiaux || 0) - (c.credits_restants || 0)), 
      0
    );

    // ─── Analyse des 4 Forfaits ──────────────────────────────────────
    const packsAnalysis = CREDIT_PACKS.map((pack) => {
      const packPurchases = paidPurchases.filter((t) => t.pack_id === pack.id);
      const salesCount = packPurchases.length;
      const revenue = packPurchases.reduce((sum, t) => sum + (t.montant_fcfa || pack.price_fcfa), 0);
      const creditsDistributed = packPurchases.reduce((sum, t) => sum + (t.credits_ajoutes || pack.credits_credited), 0);
      const uniqueUsers = new Set(packPurchases.map((t) => t.user_id)).size;

      return {
        id: pack.id,
        name: pack.name,
        price_fcfa: pack.price_fcfa,
        sales_count: salesCount,
        revenue_fcfa: revenue,
        credits_distributed: creditsDistributed,
        unique_users: uniqueUsers,
      };
    });

    // Classement des forfaits
    const sortedBySales = [...packsAnalysis].sort((a, b) => b.sales_count - a.sales_count);
    const sortedByRevenue = [...packsAnalysis].sort((a, b) => b.revenue_fcfa - a.revenue_fcfa);
    const sortedByCredits = [...packsAnalysis].sort((a, b) => b.credits_distributed - a.credits_distributed);

    const packRankings = {
      most_sold: sortedBySales[0] || null,
      most_revenue: sortedByRevenue[0] || null,
      most_credits: sortedByCredits[0] || null,
    };

    // ─── Coûts IA Ideogram 4.0 ──────────────────────────────────────
    const aiCosts = {
      provider: 'Ideogram',
      model: 'IDEOGRAM 4.0',
      unit_cost_fcfa: IDEOGRAM_COST_PER_REQUEST_FCFA,
      unit_cost_usd: IDEOGRAM_COST_PER_REQUEST_USD,
      requests_today: genToday,
      requests_this_week: genThisWeek,
      requests_this_month: genThisMonth,
      requests_total: totalGenerations,
      cost_today_fcfa: genToday * IDEOGRAM_COST_PER_REQUEST_FCFA,
      cost_week_fcfa: genThisWeek * IDEOGRAM_COST_PER_REQUEST_FCFA,
      cost_month_fcfa: genThisMonth * IDEOGRAM_COST_PER_REQUEST_FCFA,
      cost_total_fcfa: totalGenerations * IDEOGRAM_COST_PER_REQUEST_FCFA,
      cost_today_usd: (genToday * IDEOGRAM_COST_PER_REQUEST_USD).toFixed(2),
      cost_week_usd: (genThisWeek * IDEOGRAM_COST_PER_REQUEST_USD).toFixed(2),
      cost_month_usd: (genThisMonth * IDEOGRAM_COST_PER_REQUEST_USD).toFixed(2),
      cost_total_usd: (totalGenerations * IDEOGRAM_COST_PER_REQUEST_USD).toFixed(2),
      is_estimation: true,
      estimation_note: 'Estimation calculée à partir du tarif unitaire Ideogram 4.0 (0.08 $ US ~ 48 FCFA par image).',
    };

    // ─── Rentabilité (Marge Brute Estimée) ───────────────────────────
    const fedapayEstimatedFees = Math.round(caTotal * 0.025); // ~2.5% de frais opérateur moyens
    const estimatedAiCostTotal = aiCosts.cost_total_fcfa;
    const estimatedGrossMarginFcfa = caTotal - estimatedAiCostTotal - fedapayEstimatedFees;
    const estimatedGrossMarginPct = caTotal > 0 
      ? Math.round((estimatedGrossMarginFcfa / caTotal) * 100) 
      : 0;

    const profitability = {
      ca_reel_fcfa: caTotal,
      cout_ia_estime_fcfa: estimatedAiCostTotal,
      frais_operateurs_estimes_fcfa: fedapayEstimatedFees,
      marge_estimee_fcfa: estimatedGrossMarginFcfa,
      marge_estimee_pct: estimatedGrossMarginPct,
      data_status: {
        ca_is_real: true,
        costs_are_estimated: true,
      },
    };

    // ─── Séries Temporelles pour Graphiques (Derniers 14 jours) ─────
    const dailySeries = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).toISOString();

      const dayUsers = users.filter((u) => u.created_at >= dayStart && u.created_at <= dayEnd).length;
      const dayGenerations = generations.filter((g) => g.date_creation >= dayStart && g.date_creation <= dayEnd).length;
      const dayRevenue = paidPurchases
        .filter((t) => t.date_transaction >= dayStart && t.date_transaction <= dayEnd)
        .reduce((sum, t) => sum + (t.montant_fcfa || 0), 0);

      dailySeries.push({
        date: dateStr,
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        users: dayUsers,
        generations: dayGenerations,
        revenue: dayRevenue,
        ai_cost: dayGenerations * IDEOGRAM_COST_PER_REQUEST_FCFA,
      });
    }

    // Journaliser l'accès au tableau de bord
    logAdminAction({
      adminEmail: adminCheck.email,
      adminUserId: adminCheck.userId,
      action: 'view_dashboard_stats',
      target: 'dashboard',
      result: 'success',
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      kpis: {
        users: {
          total: totalUsers,
          new_today: newUsersToday,
          new_week: newUsersThisWeek,
          new_month: newUsersThisMonth,
          active: activeUsersCount,
        },
        generations: {
          total: totalGenerations,
          today: genToday,
          week: genThisWeek,
          month: genThisMonth,
          paid_count: paidGenerations.length,
          admin_count: adminGenerations.length,
        },
        revenue: {
          total_fcfa: caTotal,
          today_fcfa: caToday,
          week_fcfa: caThisWeek,
          month_fcfa: caThisMonth,
        },
        payments: {
          successful: successfulPaymentsCount,
          failed_or_pending: failedOrPendingPaymentsCount,
          average_basket_fcfa: averageBasket,
          total_packs_sold: successfulPaymentsCount,
        },
        credits: {
          total_purchased: totalCreditsPurchased,
          total_consumed: totalCreditsConsumed,
          total_remaining: totalCreditsRemaining,
        },
      },
      packs_analysis: packsAnalysis,
      pack_rankings: packRankings,
      ai_costs: aiCosts,
      profitability: profitability,
      daily_series: dailySeries,
    });
  } catch (error) {
    console.error('Erreur API /api/admin/stats:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors du calcul des statistiques admin.' },
      { status: 500 }
    );
  }
}
