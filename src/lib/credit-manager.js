import { supabaseAdmin } from './supabase-server';
import { getPackById, calculateExpirationDate } from '@/config/constants';

/**
 * Récupère tous les lots actifs d'un utilisateur, triés par date d'expiration la plus proche (FEFO).
 * 
 * @param {string} userId - UUID de l'utilisateur
 * @returns {Promise<Array>} Liste des lots actifs
 */
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

  // Enrichir chaque lot avec les métadonnées du pack
  return (data || []).map((lot) => {
    const pack = getPackById(lot.pack_id);
    return {
      ...lot,
      pack_name: pack?.name || lot.pack_id,
      images_restantes: Math.floor(lot.credits_restants / lot.cout_par_generation),
    };
  });
}

/**
 * Récupère le lot actif prioritaire (celui qui expire le plus tôt — FEFO).
 * C'est ce lot qui paiera la prochaine génération.
 * 
 * @param {string} userId - UUID de l'utilisateur
 * @returns {Promise<object|null>} Le lot FEFO ou null si aucun lot actif
 */
export async function getFefoActiveLot(userId) {
  const activeLots = await getActiveLots(userId);
  return activeLots.length > 0 ? activeLots[0] : null;
}

/**
 * Calcule le solde total de crédits actifs de l'utilisateur.
 * 
 * @param {string} userId - UUID de l'utilisateur
 * @returns {Promise<{ totalCredits: number, activeLots: Array, fefoLot: object|null }>}
 */
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

/**
 * Vérifie la restriction de rachat du même pack.
 * Un utilisateur ne peut pas acheter un pack s'il possède déjà un lot actif
 * de ce même pack (non expiré ET credits_restants > 0).
 * 
 * @param {string} userId - UUID de l'utilisateur
 * @param {string} packId - Identifiant du pack
 * @returns {Promise<{ allowed: boolean, reason?: string, existingLot?: object }>}
 */
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

/**
 * Déduit les crédits d'un lot après une génération d'image réussie.
 * ATTENTION : Ne JAMAIS appeler avant confirmation que la génération a réussi.
 * 
 * @param {object} params
 * @param {string} params.userId - UUID de l'utilisateur
 * @param {string} params.creditLotId - ID du lot qui finance la génération
 * @param {number} params.cost - Coût de la génération
 * @param {string} [params.generatedImageId] - ID de l'image générée
 * @returns {Promise<object>} Le lot mis à jour
 */
export async function deductCreditsForGeneration({ userId, creditLotId, cost, generatedImageId }) {
  if (!userId || !creditLotId || !cost) {
    throw new Error('Paramètres manquants pour la déduction de crédits');
  }

  // 1. Relire le lot pour s'assurer du solde actuel
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

  // 2. Mettre à jour le solde du lot
  const { data: updatedLot, error: updateErr } = await supabaseAdmin
    .from('credits')
    .update({ credits_restants: newBalance })
    .eq('id', creditLotId)
    .select()
    .single();

  if (updateErr) {
    console.error('Erreur mise à jour crédits:', updateErr);
    throw new Error('Échec de la mise à jour du solde de crédits');
  }

  // 3. Enregistrer la transaction
  const { error: txErr } = await supabaseAdmin
    .from('transactions')
    .insert({
      user_id: userId,
      type: 'generation',
      credits_debites: cost,
      pack_id: lot.pack_id,
      credit_lot_id: creditLotId,
      generated_image_id: generatedImageId || null,
    });

  if (txErr) {
    console.warn('Erreur enregistrement transaction de génération:', txErr);
  }

  return updatedLot;
}

/**
 * Crédite le compte utilisateur suite à un paiement FedaPay confirmé.
 * Avec protection d'idempotence stricte sur fedapay_transaction_id.
 * 
 * @param {object} params
 * @param {string} params.userId - UUID de l'utilisateur
 * @param {string} params.packId - Identifiant du pack acheté
 * @param {string} params.fedapayTransactionId - Identifiant unique de transaction FedaPay
 * @param {number} [params.montantFcfa] - Montant payé en FCFA
 * @returns {Promise<{ credited: boolean, lot: object, alreadyProcessed: boolean }>}
 */
export async function creditUserAccountFromPayment({ userId, packId, fedapayTransactionId, montantFcfa }) {
  if (!userId || !packId || !fedapayTransactionId) {
    throw new Error('Paramètres manquants pour créditer le compte');
  }

  // 1. Vérification d'idempotence : vérifier si cette transaction a déjà été traitée
  const { data: existingLot } = await supabaseAdmin
    .from('credits')
    .select('*')
    .eq('fedapay_transaction_id', String(fedapayTransactionId))
    .maybeSingle();

  if (existingLot) {
    return {
      credited: false,
      lot: existingLot,
      alreadyProcessed: true,
    };
  }

  // 2. Récupérer la définition stricte du pack depuis constants.js
  const pack = getPackById(packId);
  if (!pack) {
    throw new Error(`Pack inconnu : ${packId}`);
  }

  // 3. Calculer la date d'expiration exacte
  const dateExpiration = calculateExpirationDate(pack);

  // 4. Insérer le nouveau lot de crédits
  const { data: newLot, error: insertErr } = await supabaseAdmin
    .from('credits')
    .insert({
      user_id: userId,
      pack_id: pack.id,
      montant_achete: pack.price_fcfa,
      credits_initiaux: pack.credits_credited,
      credits_restants: pack.credits_credited,
      cout_par_generation: pack.cost_per_generation,
      date_achat: new Date().toISOString(),
      date_expiration: dateExpiration.toISOString(),
      fedapay_transaction_id: String(fedapayTransactionId),
    })
    .select()
    .single();

  if (insertErr) {
    // Si violation de contrainte unique fedapay_transaction_id (concurrence)
    if (insertErr.code === '23505') {
      const { data: lot } = await supabaseAdmin
        .from('credits')
        .select('*')
        .eq('fedapay_transaction_id', String(fedapayTransactionId))
        .single();
      return { credited: false, lot, alreadyProcessed: true };
    }
    console.error('Erreur insertion lot crédits:', insertErr);
    throw new Error('Échec de la création du lot de crédits');
  }

  // 5. Nettoyer l'éventuelle transaction d'attente (achat_pending) et enregistrer l'achat confirmé
  await supabaseAdmin
    .from('transactions')
    .delete()
    .eq('fedapay_transaction_id', String(fedapayTransactionId))
    .eq('type', 'achat_pending');

  await supabaseAdmin
    .from('transactions')
    .insert({
      user_id: userId,
      type: 'achat_pack',
      montant_fcfa: pack.price_fcfa,
      credits_ajoutes: pack.credits_credited,
      pack_id: pack.id,
      credit_lot_id: newLot.id,
      fedapay_transaction_id: String(fedapayTransactionId),
    });

  return {
    credited: true,
    lot: newLot,
    alreadyProcessed: false,
  };
}
