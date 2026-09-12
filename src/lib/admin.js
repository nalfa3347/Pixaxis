import { supabaseAdmin, resolveUser } from './supabase-server.js';

/**
 * PIXAXIS — Module d'administration et sécurité serveur.
 * 
 * RÈGLES STRICTES :
 * 1. Ne jamais faire confiance à un flag frontend.
 * 2. La vérification admin est effectuée exclusivement côté serveur.
 * 3. Aucune adresse email admin n'est exposée au client.
 */

// Coût estimé par requête Ideogram 4.0 (0.08 $ US ~ 48 FCFA)
export const IDEOGRAM_COST_PER_REQUEST_USD = 0.08;
export const USD_TO_FCFA_RATE = 600;
export const IDEOGRAM_COST_PER_REQUEST_FCFA = Math.round(IDEOGRAM_COST_PER_REQUEST_USD * USD_TO_FCFA_RATE);

// Liste de secours stricte (garantit le bon fonctionnement en production Vercel même sans config manuelle d'env)
export const DEFAULT_ADMIN_EMAILS = [
  'nasserpillar4@gmail.com',
  'nasserpillarrr@gmail.com',
  'admin@pixaxis.ai',
];

export const DEFAULT_ADMIN_PHONES = [
  '+22892880010',
  '22892880010',
  '92880010',
];

export const DEFAULT_ADMIN_USER_IDS = [
  '29380877-1178-4053-80be-6861a891d0b9', // Nasser (Admin) nasserpillar4@gmail.com
  '7a94b97c-0894-4f95-8f7f-e1679dd9ae5b', // Nasser nasserpillarrr@gmail.com / +22892880010
  'f2cf266c-966d-4d46-8703-fca4d1ed532b', // Nasser phone_22892880010@pixaxis.com
];

/**
 * Récupère la liste blanche des adresses emails administrateurs.
 * Combine les valeurs par défaut et la variable d'environnement ADMIN_EMAILS.
 * 
 * @returns {string[]} Liste des emails admin en minuscules
 */
export function getAdminEmails() {
  const envRaw = process.env.ADMIN_EMAILS || '';
  const fromEnv = envRaw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);

  const combined = new Set([...DEFAULT_ADMIN_EMAILS, ...fromEnv]);
  return Array.from(combined);
}

/**
 * Vérifie si une adresse email est dans la liste blanche administrateur.
 * 
 * @param {string} email - Adresse email à vérifier
 * @returns {boolean}
 */
export function isAdminEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const adminList = getAdminEmails();
  const normalized = email.trim().toLowerCase();
  if (adminList.includes(normalized)) return true;
  // Détection des comptes basés sur le téléphone de l'administrateur
  if (normalized === 'phone_22892880010@pixaxis.com') return true;
  return false;
}

/**
 * Vérifie si un numéro de téléphone appartient à l'administrateur.
 * 
 * @param {string} phone - Numéro de téléphone
 * @returns {boolean}
 */
export function isAdminPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const clean = phone.replace(/\s+/g, '').replace(/^\+/, '');
  return DEFAULT_ADMIN_PHONES.some((p) => {
    const pClean = p.replace(/\s+/g, '').replace(/^\+/, '');
    return clean === pClean;
  });
}

/**
 * Vérifie les autorisations administrateur pour une requête entrante.
 * Contrôle rigoureux en multi-niveaux :
 * 1. Session / token authentifié valide auprès de Supabase
 * 2. Contrôle de l'identifiant utilisateur direct (DEFAULT_ADMIN_USER_IDS)
 * 3. Résolution de l'adresse email et téléphone réels de l'utilisateur (JWT > table profiles > auth.admin)
 * 4. Appartenance à la whitelist administrateur (Email, Téléphone ou UUID)
 * 
 * @param {Request} request - Requête HTTP entrante
 * @returns {Promise<{ isAdmin: boolean, error?: string, status?: number, user?: object, email?: string, userId?: string }>}
 */
export async function verifyAdminRequest(request) {
  try {
    const user = await resolveUser(request);
    if (!user || !user.id) {
      return { 
        isAdmin: false, 
        error: 'Non authentifié. Veuillez vous connecter avec un compte administrateur.', 
        status: 401 
      };
    }

    // 1. Accès direct par UUID administrateur
    if (DEFAULT_ADMIN_USER_IDS.includes(user.id)) {
      return { 
        isAdmin: true, 
        user: { ...user, email: user.email || 'nasserpillar4@gmail.com' }, 
        email: user.email || 'nasserpillar4@gmail.com', 
        userId: user.id 
      };
    }

    let email = user.email ? user.email.trim().toLowerCase() : null;
    let phone = user.phone ? user.phone.trim() : null;

    // 2. Recherche dans la table profiles
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, phone')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      if (!email && profile.email) email = profile.email.trim().toLowerCase();
      if (!phone && profile.phone) phone = profile.phone.trim();
    }

    // 3. Fallback Supabase Auth Admin
    if (!email || !phone) {
      const { data: authData } = await supabaseAdmin.auth.admin.getUserById(user.id);
      if (authData?.user) {
        if (!email && authData.user.email) email = authData.user.email.trim().toLowerCase();
        if (!phone && authData.user.phone) phone = authData.user.phone.trim();
      }
    }

    // 4. Contrôle email et téléphone
    const hasAdminEmail = email && isAdminEmail(email);
    const hasAdminPhone = phone && isAdminPhone(phone);

    if (!hasAdminEmail && !hasAdminPhone) {
      return { 
        isAdmin: false, 
        error: 'Accès refusé. Ce compte ne dispose pas des privilèges administrateur.', 
        status: 403,
        userId: user.id 
      };
    }

    return { 
      isAdmin: true, 
      user: { ...user, email: email || 'nasserpillar4@gmail.com' }, 
      email: email || 'nasserpillar4@gmail.com', 
      userId: user.id 
    };
  } catch (err) {
    console.error('Erreur lors de la vérification admin:', err);
    return { 
      isAdmin: false, 
      error: 'Erreur serveur lors du contrôle des privilèges administrateur.', 
      status: 500 
    };
  }
}

/**
 * Enregistre une action sensible d'un administrateur dans le journal d'audit.
 * 
 * @param {object} params
 * @param {string} params.adminEmail - Email de l'administrateur
 * @param {string} [params.adminUserId] - UUID de l'administrateur
 * @param {string} params.action - Action effectuée (ex: 'view_dashboard', 'view_user', 'adjust_credits')
 * @param {string} [params.target] - Cible de l'action (ex: 'user_123', 'tx_456', 'dashboard')
 * @param {string} params.result - Résultat ('success', 'denied', 'error')
 * @param {object} [params.metadata] - Données contextuelles supplémentaires
 */
export async function logAdminAction({ adminEmail, adminUserId, action, target, result, metadata = {} }) {
  try {
    await supabaseAdmin
      .from('admin_audit_logs')
      .insert({
        admin_email: adminEmail || 'unknown_admin',
        admin_user_id: adminUserId || null,
        action,
        target: target || null,
        result: result || 'success',
        metadata,
      });
  } catch (err) {
    console.warn('Impossible d’enregistrer le log d’audit admin:', err);
  }
}
