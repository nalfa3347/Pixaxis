import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase URL ou clé serveur manquante dans les variables d’environnement.');
}

/**
 * Client Supabase côté serveur (API routes, webhook FedaPay, gestion des crédits).
 * Utilise la clé service_role ou la clé anon en fallback de dev.
 */
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Résout l'utilisateur connecté à partir des en-têtes de la requête :
 * 1. En-tête 'authorization': 'Bearer <token>' validé auprès de Supabase Auth
 * 2. En-tête 'x-user-id' (transmis par le client authentifié)
 * Retourne l'objet user ou null si non connecté.
 */
export async function resolveUser(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && user) return user;
    }
    const userIdHeader = request.headers.get('x-user-id');
    if (userIdHeader && userIdHeader !== '00000000-0000-0000-0000-000000000001') {
      return { id: userIdHeader };
    }
  } catch (err) {
    console.warn('Erreur lors de la résolution de l’utilisateur:', err);
  }
  return null;
}
