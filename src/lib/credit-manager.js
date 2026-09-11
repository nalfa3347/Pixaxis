import { supabaseAdmin } from './supabase-server';
import { getPackById, calculateExpirationDate } from '@/config/constants';

export async function getActiveLots(userId) {
  if (!userId) return [];

  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('credits')
    .select('*')
    .eq('user_id', userId)
    .gt('credits_restants', 0)
    .gt('date_expiration', now)
    .order('date_expiration', { ascending: true });

  if (error) {
    console.error('Erreur lors de la récupération des lots actifs:', error);
    throw new Error('Impossible de récupérer le solde de crédits');
  }

  return (data || []).map((lot) => {
    const pack = getPackById(lot.pack_id);
    return {
      ...lot,
      pack_name: pack?.name || lot.pack_id,
      images_restantes: Math.floor(lot.credits_restants / lot.cout_par_generation),
    };
  });
}

export async function getFefoActiveLot(userId) {
  const activeLots = await getActiveLots(userId);
  return activeLots.length > 0 ? activeLots[0] : null;
}

export async function getUserCreditSummary(userId) {
  const activeLots = await getActiveLots(userId);
  const totalCredits = activeLots.reduce((sum, lot) => sum + (lot.credits_restants || 0), 0);
  const fefoLot = activeLots.length > 0 ? activeLots[0] : null;

  return {
    totalCredits,
    activeLots,
    fefoLot,
  };
}

export async function checkRepurchaseRestriction(userId, packId) {
  if (!userId || !packId) {
    return { allowed: false, reason: 'Paramètres manquants' };
  }

  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('credits')
    .select('*')
    .eq('user_id', userId)
    .eq('pack_id', packId)
    .gt('credits_restants', 0)
    .gt('date_expiration', now)
    .order('date_expiration', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Erreur vérification restriction rachat:', error);
    throw new Error('Erreur de vérification des droits d’achat');
  }

  if (data && data.length > 0) {
    const activeLot = data[0];
    const pack = getPackById(packId);
    return {
      allowed: false,
      reason: `Vous avez encore ${activeLot.credits_restants} crédits actifs sur le pack ${pack?.name || packId}. Ce pack redeviendra achetable une fois épuisé ou expiré.`,
      existingLot: activeLot,
    };
  }

  return { allowed: true };
}

export async function deductCreditsForGeneration({ userId, creditLotId, cost, generatedImageId }) {
  if (!userId || !creditLotId || !cost) {
    throw new Error('Paramètres manquants pour la déduction de crédits');
  }

  const { data: lot, error: fetchErr } = await supabaseAdmin
    .from('credits')
    .select('*')
    .eq('id', creditLotId)
    .eq('user_id', userId)
    .single();

  if (fetchErr || !lot) {
    throw new Error('Lot de crédits introuvable');
  }

  if (lot.credits_restants < cost) {
    throw new Error(`Solde insuffisant dans ce lot (${lot.credits_restants} crédits restants, coût : ${cost})`);
  }

  const newBalance = lot.credits_restants - cost;

  const { data: updatedLot, error: updateErr } = await supabaseAdmin
    .from('credits')
    .update({ credits_restants: newBalance })\n    .eq('id', creditLotId)\n    .select()\n    .single();\n\n  if (updateErr) {\n    console.error('Erreur mise à jour crédits:', updateErr);\n    throw new Error('Échec de la mise à jour du solde de crédits');\n  }\n\n  await supabaseAdmin\n    .from('transactions')\n    .insert({\n      user_id: userId,\n      type: 'generation',\n      credits_debites: cost,\n      pack_id: lot.pack_id,\n      credit_lot_id: creditLotId,\n      generated_image_id: generatedImageId || null,\n    });\n\n  return updatedLot;\n}\n\nexport async function creditUserAccountFromPayment({ userId, packId, fedapayTransactionId, montantFcfa }) {\n  if (!userId || !packId || !fedapayTransactionId) {\n    throw new Error('Paramètres manquants pour créditer le compte');\n  }\n\n  const { data: existingLot } = await supabaseAdmin\n    .from('credits')\n    .select('*')\n    .eq('fedapay_transaction_id', String(fedapayTransactionId))\n    .maybeSingle();\n\n  if (existingLot) {\n    return { credited: false, lot: existingLot, alreadyProcessed: true };\n  }\n\n  const pack = getPackById(packId);\n  if (!pack) throw new Error(`Pack inconnu : ${packId}`);\n\n  const dateExpiration = calculateExpirationDate(pack);\n\n  const { data: newLot, error: insertErr } = await supabaseAdmin\n    .from('credits')\n    .insert({\n      user_id: userId,\n      pack_id: pack.id,\n      montant_achete: pack.price_fcfa,\n      credits_initiaux: pack.credits_credited,\n      credits_restants: pack.credits_credited,\n      cout_par_generation: pack.cost_per_generation,\n      date_achat: new Date().toISOString(),\n      date_expiration: dateExpiration.toISOString(),\n      fedapay_transaction_id: String(fedapayTransactionId),\n    })\n    .select()\n    .single();\n\n  if (insertErr) {\n    if (insertErr.code === '23505') {\n      const { data: lot } = await supabaseAdmin\n        .from('credits')\n        .select('*')\n        .eq('fedapay_transaction_id', String(fedapayTransactionId))\n        .single();\n      return { credited: false, lot, alreadyProcessed: true };\n    }\n    console.error('Erreur insertion lot crédits:', insertErr);\n    throw new Error('Échec de la création du lot de crédits');\n  }\n\n  await supabaseAdmin\n    .from('transactions')\n    .delete()\n    .eq('fedapay_transaction_id', String(fedapayTransactionId))\n    .eq('type', 'achat_pending');\n\n  await supabaseAdmin\n    .from('transactions')\n    .insert({\n      user_id: userId,\n      type: 'achat_pack',\n      montant_fcfa: pack.price_fcfa,\n      credits_ajoutes: pack.credits_credited,\n      pack_id: pack.id,\n      credit_lot_id: newLot.id,\n      fedapay_transaction_id: String(fedapayTransactionId),\n    });\n\n  return {\n    credited: true,\n    lot: newLot,\n    alreadyProcessed: false,\n  };\n}\n