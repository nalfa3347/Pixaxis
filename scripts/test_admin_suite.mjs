import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = 'http://localhost:3000';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   PIXAXIS — SUITE DE TESTS AUTOMATISÉS ESPACE ADMIN');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ SUCCÈS : ${message}`);
      passed++;
    } else {
      console.error(`  ✕ ÉCHEC : ${message}`);
      failed++;
    }
  }

  // 1. Récupération de l'admin et d'un utilisateur normal
  const adminEmail = 'nasserpillar4@gmail.com';
  const normalEmail = 'phone_22892594526@pixaxis.com';

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', adminEmail)
    .single();

  const { data: normalProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', normalEmail)
    .single();

  assert(adminProfile && adminProfile.id, `Profil admin (${adminEmail}) trouvé : ${adminProfile?.id}`);
  assert(normalProfile && normalProfile.id, `Profil normal (${normalEmail}) trouvé : ${normalProfile?.id}`);

  const adminUserId = adminProfile.id;
  const normalUserId = normalProfile.id;

  // ─── TEST 1 : Blocage des non-authentifiés (HTTP 401) ─────────────
  console.log('\n--- TEST 1 : Blocage des requêtes non-authentifiées ---');
  const resNoAuth = await fetch(`${APP_URL}/api/admin/stats`);
  assert(resNoAuth.status === 401 || resNoAuth.status === 403, `Requête sans auth bloquée (HTTP ${resNoAuth.status})`);

  // ─── TEST 2 : Blocage strict des utilisateurs normaux (HTTP 403) ──
  console.log('\n--- TEST 2 : Blocage strict des utilisateurs normaux sur toutes les routes admin ---');
  const adminEndpoints = [
    '/api/admin/check',
    '/api/admin/stats',
    '/api/admin/users',
    `/api/admin/users/${adminUserId}`,
    '/api/admin/payments',
    '/api/admin/credits',
    '/api/admin/generations',
    '/api/admin/audit',
  ];

  for (const endpoint of adminEndpoints) {
    const res = await fetch(`${APP_URL}${endpoint}`, {
      headers: { 'x-user-id': normalUserId },
    });
    assert(res.status === 403, `Utilisateur normal bloqué sur ${endpoint} (HTTP ${res.status})`);
  }

  // ─── TEST 3 : Accès autorisé pour l'administrateur (HTTP 200) ─────
  console.log('\n--- TEST 3 : Accès autorisé pour l’administrateur sur toutes les routes admin ---');
  for (const endpoint of adminEndpoints) {
    const res = await fetch(`${APP_URL}${endpoint}`, {
      headers: { 'x-user-id': adminUserId },
    });
    assert(res.status === 200, `Admin autorisé sur ${endpoint} (HTTP ${res.status})`);
    if (res.status === 200) {
      const data = await res.json();
      assert(data.success === true || data.isAdmin === true, `Données valides retournées par ${endpoint}`);
    }
  }

  // ─── TEST 4 : Exactitude des Statistiques Admin ───────────────────
  console.log('\n--- TEST 4 : Validation des indicateurs de statistiques ---');
  const statsRes = await fetch(`${APP_URL}/api/admin/stats`, {
    headers: { 'x-user-id': adminUserId },
  });
  const stats = await statsRes.json();

  assert(typeof stats.kpis?.revenue?.total_fcfa === 'number', `Chiffre d’affaires calculé : ${stats.kpis?.revenue?.total_fcfa} FCFA`);
  assert(typeof stats.kpis?.users?.total === 'number', `Nombre total d’utilisateurs : ${stats.kpis?.users?.total}`);
  assert(typeof stats.kpis?.generations?.total === 'number', `Nombre total de générations : ${stats.kpis?.generations?.total}`);
  assert(Array.isArray(stats.packs_analysis) && stats.packs_analysis.length === 4, `Analyse des 4 forfaits retournée (${stats.packs_analysis?.length} forfaits)`);
  assert(stats.ai_costs && stats.ai_costs.provider === 'Ideogram', `Suivi des coûts IA Ideogram configuré`);
  assert(stats.profitability && typeof stats.profitability.marge_estimee_fcfa === 'number', `Calcul de rentabilité présent : marge estimée ${stats.profitability.marge_estimee_fcfa} FCFA`);

  // ─── TEST 5 : Génération gratuite pour l'administrateur ────────────
  console.log('\n--- TEST 5 : Accès gratuit aux générations pour l’administrateur ---');
  // Vérifier d'abord que le compte admin n'a pas besoin de forfait payant actif
  const genRes = await fetch(`${APP_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': adminUserId,
    },
    body: JSON.stringify({
      type: 'logo',
      style: 'minimalist',
      format: '1024x1024',
      additional_prompt: 'Test admin free generation validation',
    }),
  });

  const genData = await genRes.json();
  assert(genRes.status === 200, `Génération admin réussie sans prérequis de crédits payants (HTTP ${genRes.status})`);
  assert(genData.is_admin === true, `Flag is_admin = true présent dans la réponse`);
  assert(genData.credits_deducted === 0, `Aucun crédit commercial déduit (credits_deducted = ${genData.credits_deducted})`);

  // Vérifier en base que l'image a bien été enregistrée avec is_admin = true
  if (genData.image?.id) {
    const { data: dbImg } = await supabase
      .from('generated_images')
      .select('*')
      .eq('id', genData.image.id)
      .single();

    assert(dbImg && dbImg.is_admin === true, `Enregistrement en base de données avec is_admin = true vérifié`);
    assert(dbImg && dbImg.credits_utilises === 0, `Enregistrement en base avec credits_utilises = 0 vérifié`);
  }

  // ─── TEST 6 : Paiement toujours obligatoire pour utilisateur normal
  console.log('\n--- TEST 6 : Maintien strict du paiement obligatoire pour utilisateur normal ---');
  const normalGenRes = await fetch(`${APP_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': normalUserId,
    },
    body: JSON.stringify({
      type: 'logo',
      style: 'minimalist',
      format: '1024x1024',
      additional_prompt: 'Test normal user generation',
    }),
  });

  assert(normalGenRes.status === 402, `Génération refusée pour utilisateur normal sans crédits (HTTP ${normalGenRes.status})`);

  // ─── TEST 7 : Vérification du Journal d'Audit ─────────────────────
  console.log('\n--- TEST 7 : Journalisation des actions d’administration ---');
  const auditRes = await fetch(`${APP_URL}/api/admin/audit`, {
    headers: { 'x-user-id': adminUserId },
  });
  const auditData = await auditRes.json();
  assert(Array.isArray(auditData.logs) && auditData.logs.length > 0, `Journaux d’audit enregistrés en base (${auditData.logs?.length} entrées)`);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`   RÉSULTATS : ${passed} TESTS RÉUSSIS, ${failed} ÉCHECS`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Erreur fatale test admin:', err);
  process.exit(1);
});
