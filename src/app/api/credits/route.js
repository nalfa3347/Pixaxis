import { NextResponse } from 'next/server';
import { getUserCreditSummary } from '@/lib/credit-manager';
import { supabaseAdmin, resolveUser } from '@/lib/supabase-server';
import { CREDIT_PACKS } from '@/config/constants';

// Cache en mémoire (10s TTL par utilisateur)
const creditsCache = new Map();
const CACHE_TTL = 10000;

export async function GET(request) {
  try {
    const user = await resolveUser(request);
    if (!user) {
      const packRestrictions = {};
      for (const pack of CREDIT_PACKS) {
        packRestrictions[pack.id] = { can_purchase: true, active_lot: null, reason: null };
      }
      return NextResponse.json({
        total_credits: 0,
        active_lots: [],
        fefo_lot: null,
        pack_restrictions: packRestrictions,
        transactions: [],
        authenticated: false,
      });
    }

    const userId = user.id;
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('force') === 'true';

    // Vérifier le cache (sauf si force refresh)
    if (!forceRefresh) {
      const cached = creditsCache.get(userId);
      if (cached && Date.now() - cached.time < CACHE_TTL) {
        return NextResponse.json(cached.data);
      }
    }

    // Exécution parallèle des requêtes pour diviser le temps de latence réseau
    const [creditSummary, txResult] = await Promise.all([
      getUserCreditSummary(userId),
      supabaseAdmin
        .from('transactions')
        .select('id, type, credits_debites, credits_ajoutes, montant_fcfa, pack_id, date_transaction')
        .eq('user_id', userId)
        .order('date_transaction', { ascending: false })
        .limit(20),
    ]);

    const { totalCredits, activeLots, fefoLot } = creditSummary;
    const transactions = txResult.data || [];

    // Calcul de l'état de restriction de rachat pour chaque pack
    const packRestrictions = {};
    for (const pack of CREDIT_PACKS) {
      const activeLotForPack = activeLots.find(
        (lot) => lot.pack_id === pack.id && lot.credits_restants > 0
      );
      packRestrictions[pack.id] = {
        can_purchase: !activeLotForPack,
        active_lot: activeLotForPack || null,
        reason: activeLotForPack 
          ? `Vous avez encore ${activeLotForPack.credits_restants} crédits actifs sur ce pack.`
          : null,
      };
    }

    const result = {
      total_credits: totalCredits,
      active_lots: activeLots,
      fefo_lot: fefoLot,
      pack_restrictions: packRestrictions,
      transactions: transactions,
    };

    // Mettre en cache
    creditsCache.set(userId, { data: result, time: Date.now() });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erreur API /api/credits:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération des crédits' },
      { status: 500 }
    );
  }
}

