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

/**
 * Récupère la liste blanche des adresses emails administrateurs.
 * Source stricte : variable d'environnement ADMIN_EMAILS.
 * 
 * @returns {string[]} Liste des emails admin en minuscules
 */
export function getAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
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
  return adminList.includes(email.trim().toLowerCase());
}

/**
 * Vérifie les autorisations administrateur pour une requête entrante.
 * Contrôle rigoureux en 3 étapes :
 * 1. Session / token authentifié valide auprès de Supabase
 * 2. Résolution de l'adresse email réelle de l'utilisateur (JWT > table profiles > auth.admin)
 * 3. Appartenance stricte à la variable d'environnement ADMIN_EMAILS
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

    let email = user.email ? user.email.trim().toLowerCase() : null;

    // Si l'email n'est pas directement présent dans l'objet résolu, vérifier dans la table profiles
    if (!email) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.email) {
        email = profile.email.trim().toLowerCase();
      }
    }

    // Fallback supplémentaire : interroger Supabase Auth Admin
    if (!email) {
      const { data: authData } = await supabaseAdmin.auth.admin.getUserById(user.id);
      if (authData?.user?.email) {
        email = authData.user.email.trim().toLowerCase();
      }
    }

    if (!email || !isAdminEmail(email)) {
      return { 
        isAdmin: false, 
        error: 'Accès refusé. Ce compte ne dispose pas des privilèges administrateur.', 
        status: 403,
        userId: user.id 
      };
    }

    return { 
      isAdmin: true, 
      user: { ...user, email }, 
      email, 
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
