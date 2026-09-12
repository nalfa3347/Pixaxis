import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// ─── 1. Chargement des variables d'environnement ───
const envPath = path.resolve('C:/PIXAXIS 2/pixaxis/.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    env[key] = val;
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
const BASE_URL = 'http://localhost:3000';

const results = [];
function recordTest(testNumber, name, passed, details = '') {
  results.push({ testNumber, name, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [Cas ${testNumber}/15] ${name} ${details ? `(${details})` : ''}`);
}

async function runFull15Suite() {
  console.log('\n================================================================');
  console.log('🚀 DÉMARRAGE DE LA SUITE DE VALIDATION COMPLÈTE PIXAXIS (15 CAS)');
  console.log('================================================================\n');

  const timestamp = Date.now();
  const userAEmail = `pix_test_a_${timestamp}@pixaxis-test.com`;
  const userBEmail = `pix_test_b_${timestamp}@pixaxis-test.com`;
  const testPassword = 'Password123!Secure';

  let userAId = null;
  let userBId = null;
  let userAGeneratedImageId = null;
  let userAGeneratedUrl = null;
  let userACompositedUrl = null;

  try {
    // ══════════════════════════════════════════════════════════
    // CAS 1 : NOUVEL UTILISATEUR (0 CRÉDIT, PAIEMENT REQUIS)
    // ══════════════════════════════════════════════════════════
    const signupRes = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'signup',
        method: 'email',
        email: userAEmail,
        password: testPassword,
        fullName: 'Client Test Studio A',
      }),
    });
    const signupData = await signupRes.json();
    userAId = signupData.userId;

    // Vérifier les crédits initiaux en base : STRICTEMENT 0
    const { data: initialCredits } = await supabaseAdmin
      .from('credits')
      .select('*')
      .eq('user_id', userAId);

    const totalInit = (initialCredits || []).reduce((acc, c) => acc + (c.credits_restants || 0), 0);
    const pass1 = signupData.success && signupData.requiresPlan === true && totalInit === 0;
    recordTest(1, 'Nouvel utilisateur créé sans crédits gratuits', pass1, `ID: ${userAId}, Crédits: ${totalInit}`);

    // ══════════════════════════════════════════════════════════
    // CAS 2 : PAIEMENT INITIALISÉ ET CONFIRMÉ
    // ══════════════════════════════════════════════════════════
    // 2a. Vérifier qu'une transaction non approuvée est bien rejetée (aucun crédit)
    const fakeVerifyRes = await fetch(`${BASE_URL}/api/checkout/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction_id: 'unconfirmed_tx_999999' }),
    });
    const fakeVerifyData = await fakeVerifyRes.json();
    const rejectedUnapproved = !fakeVerifyData.approved;

    // 2b. Initialisation du checkout FedaPay avec test_mode
    const checkoutRes = await fetch(`${BASE_URL}/api/checkout/fedapay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userAId,
      },
      body: JSON.stringify({ pack_id: 'createur', test_mode: true }),
    });
    const checkoutData = await checkoutRes.json();
    const txId = checkoutData.transaction_id;

    // 2c. Confirmation du paiement côté serveur
    const verifyRes = await fetch(`${BASE_URL}/api/checkout/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction_id: txId }),
    });
    const verifyData = await verifyRes.json();
    const pass2 = rejectedUnapproved && checkoutData.success && verifyData.approved === true && verifyData.credited === true;
    recordTest(2, 'Paiement forfait initialisé et confirmé', pass2, `Tx: ${txId}, Pack: createur`);

    // ══════════════════════════════════════════════════════════
    // CAS 3 : ATTRIBUTION DES CRÉDITS EN BDD
    // ══════════════════════════════════════════════════════════
    const { data: userACredits } = await supabaseAdmin
      .from('credits')
      .select('*')
      .eq('user_id', userAId)
      .gt('credits_restants', 0);

    const creditedAmount = (userACredits || []).reduce((acc, c) => acc + c.credits_restants, 0);
    const pass3 = creditedAmount === 3060; // Pack créateur = 3060 crédits
    recordTest(3, 'Attribution réelle des crédits en BDD', pass3, `Solde: ${creditedAmount} crédits`);

    // ══════════════════════════════════════════════════════════
    // CAS 4 : ONBOARDING DÉBLOQUÉ
    // ══════════════════════════════════════════════════════════
    const creditsApiRes = await fetch(`${BASE_URL}/api/credits`, {
      headers: { 'x-user-id': userAId },
    });
    const creditsApiData = await creditsApiRes.json();
    const pass4 = creditsApiData.total_credits === 3060 && creditsApiData.active_lots?.length > 0;
    recordTest(4, 'Accès Onboarding débloqué avec solde payé', pass4, `API total_credits: ${creditsApiData.total_credits}`);

    // ══════════════════════════════════════════════════════════
    // CAS 5 : SKIP DE TOUS LES CHAMPS FACULTATIFS
    // ══════════════════════════════════════════════════════════
    const skipProfileRes = await fetch(`${BASE_URL}/api/onboarding/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userAId,
      },
      body: JSON.stringify({
        preferredFormat: '1024x1792', // Choix format seul, sans obligation sur le reste
        hasCompletedOnboarding: false,
      }),
    });
    const skipProfileData = await skipProfileRes.json();
    const pass5 = skipProfileRes.ok && skipProfileData.success === true;
    recordTest(5, 'Passage fluide des champs facultatifs', pass5, 'Format vertical 9:16 sélectionné');

    // ══════════════════════════════════════════════════════════
    // CAS 6 : AJOUT D’UN PRODUIT (UPLOAD, SHARP 2048PX, STORAGE)
    // ══════════════════════════════════════════════════════════
    // Créer un buffer image de test produit vertical 9:16 (720x1280 PNG)
    const productBuffer = await sharp({
      create: {
        width: 720,
        height: 1280,
        channels: 4,
        background: { r: 15, g: 15, b: 25, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const productForm = new FormData();
    productForm.append('file', new Blob([productBuffer], { type: 'image/png' }), 'test_earbuds_product.png');

    const uploadProdRes = await fetch(`${BASE_URL}/api/onboarding/product`, {
      method: 'POST',
      headers: { 'x-user-id': userAId },
      body: productForm,
    });
    const uploadProdData = await uploadProdRes.json();
    const pass6 = uploadProdRes.ok && uploadProdData.success && Boolean(uploadProdData.url);
    recordTest(6, 'Ajout et optimisation serveur du produit', pass6, uploadProdData.url ? `URL: ${uploadProdData.url.slice(0, 45)}...` : '');

    // ══════════════════════════════════════════════════════════
    // CAS 7 : GÉNÉRATION RÉELLE IDEOGRAM 4.0
    // ══════════════════════════════════════════════════════════
    console.log('   ⏳ Appel réel Ideogram 4.0 en cours (modèle officiel)...');
    const genForm = new FormData();
    genForm.append('type', 'product');
    genForm.append('style', 'realistic');
    genForm.append('format', '1024x1792');
    genForm.append('additional_prompt', 'Luxury wireless earbuds floating above dark obsidian with volumetric cyan studio lights and realistic reflections.');
    genForm.append('images', new Blob([productBuffer], { type: 'image/png' }), 'product.png');

    const genRes = await fetch(`${BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'x-user-id': userAId },
      body: genForm,
    });
    const genData = await genRes.json();
    userAGeneratedImageId = genData.image?.id;
    userAGeneratedUrl = genData.image?.url;
    const pass7 = genRes.ok && Boolean(userAGeneratedUrl);
    recordTest(7, 'Génération publicitaire réelle Ideogram 4.0', pass7, userAGeneratedUrl ? `Image ID: ${userAGeneratedImageId}` : genData.error);

    // ══════════════════════════════════════════════════════════
    // CAS 8 : STOCKAGE SUPABASE (STORAGE + DB)
    // ══════════════════════════════════════════════════════════
    const { data: dbImage } = await supabaseAdmin
      .from('generated_images')
      .select('*')
      .eq('id', userAGeneratedImageId)
      .eq('user_id', userAId)
      .single();

    const pass8 = Boolean(dbImage && dbImage.url === userAGeneratedUrl);
    recordTest(8, 'Stockage Supabase Storage & DB vérifié', pass8, `DB id: ${dbImage?.id}`);

    // ══════════════════════════════════════════════════════════
    // CAS 9 : AJOUT DU LOGO ORIGINAL (COMPOSITION SHARP)
    // ══════════════════════════════════════════════════════════
    // Génération d'un logo de test transparent
    const logoBufferA = await sharp({
      create: {
        width: 240,
        height: 80,
        channels: 4,
        background: { r: 0, g: 229, b: 255, alpha: 0.9 },
      },
    })
      .png()
      .toBuffer();

    const logoForm = new FormData();
    logoForm.append('imageId', userAGeneratedImageId);
    logoForm.append('imageUrl', userAGeneratedUrl);
    logoForm.append('logoFile', new Blob([logoBufferA], { type: 'image/png' }), 'official_logo_a.png');

    const logoRes = await fetch(`${BASE_URL}/api/onboarding/composite-logo`, {
      method: 'POST',
      headers: { 'x-user-id': userAId },
      body: logoForm,
    });
    const logoData = await logoRes.json();
    userACompositedUrl = logoData.compositedUrl;
    const pass9 = logoRes.ok && logoData.success === true && Boolean(userACompositedUrl);
    recordTest(9, 'Incrustation du logo original sans altération IA', pass9, userACompositedUrl ? `Composited URL: ${userACompositedUrl.slice(0, 45)}...` : '');

    // ══════════════════════════════════════════════════════════
    // CAS 10 : RÉSULTAT FINAL ACCESSIBLE
    // ══════════════════════════════════════════════════════════
    const finalCheckRes = await fetch(userACompositedUrl, { method: 'HEAD' });
    const pass10 = finalCheckRes.ok;
    recordTest(10, 'Visuel final publicitaire accessible publiquement', pass10, `Status HTTP: ${finalCheckRes.status}`);

    // ══════════════════════════════════════════════════════════
    // CAS 11 : DÉBIT UNIQUE DES CRÉDITS (180 CRÉDITS DÉDUITS)
    // ══════════════════════════════════════════════════════════
    const { data: remainingCreditsRows } = await supabaseAdmin
      .from('credits')
      .select('*')
      .eq('user_id', userAId);

    const currentTotalCredits = (remainingCreditsRows || []).reduce((acc, c) => acc + c.credits_restants, 0);
    // 3060 crédits initiaux - 180 crédits (cout 1 génération pack créateur) = 2880
    // Logo composition = 0 crédit débité
    const pass11 = currentTotalCredits === 2880;
    recordTest(11, 'Débit unique des crédits (zéro surcoût logo)', pass11, `3060 - 180 = ${currentTotalCredits} (Attendu: 2880)`);

    // ══════════════════════════════════════════════════════════
    // CAS 12 : UTILISATEUR SANS CRÉDITS STRICTEMENT BLOQUÉ
    // ══════════════════════════════════════════════════════════
    const signupB = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'signup',
        method: 'email',
        email: userBEmail,
        password: testPassword,
        fullName: 'Client Test Studio B',
      }),
    });
    const signupBData = await signupB.json();
    userBId = signupBData.userId;

    // Tentative de génération sans avoir payé de forfait
    const uncreditedGenRes = await fetch(`${BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userBId,
      },
      body: JSON.stringify({
        type: 'product',
        style: 'realistic',
        format: '1024x1024',
      }),
    });
    const uncreditedData = await uncreditedGenRes.json();
    const pass12 = uncreditedGenRes.status === 402 && Boolean(uncreditedData.error);
    recordTest(12, 'Blocage strict utilisateur sans crédits', pass12, `Status HTTP 402: "${uncreditedData.error}"`);

    // ══════════════════════════════════════════════════════════
    // CAS 13 : REJET FICHIER > 5 MB AVEC MESSAGE EXACT
    // ══════════════════════════════════════════════════════════
    // Créer un buffer de 5.2 Mo
    const bigBuffer = Buffer.alloc(Math.floor(5.2 * 1024 * 1024));
    const bigForm = new FormData();
    bigForm.append('file', new Blob([bigBuffer], { type: 'image/png' }), 'too_large.png');

    const bigUploadRes = await fetch(`${BASE_URL}/api/onboarding/product`, {
      method: 'POST',
      headers: { 'x-user-id': userAId },
      body: bigForm,
    });
    const bigUploadData = await bigUploadRes.json();
    const pass13 = bigUploadRes.status === 400 && bigUploadData.error === 'Cette image est trop lourde. Taille maximale : 5 MB.';
    recordTest(13, 'Rejet image > 5 MB avec message exact', pass13, `Message: "${bigUploadData.error}"`);

    // ══════════════════════════════════════════════════════════
    // CAS 14 : SECOND UTILISATEUR AVEC UN AUTRE LOGO
    // ══════════════════════════════════════════════════════════
    // Créditer User B avec pack decouverte
    const checkoutBRes = await fetch(`${BASE_URL}/api/checkout/fedapay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userBId,
      },
      body: JSON.stringify({ pack_id: 'decouverte', test_mode: true }),
    });
    const checkoutBData = await checkoutBRes.json();
    await fetch(`${BASE_URL}/api/checkout/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction_id: checkoutBData.transaction_id }),
    });

    // User B enregistre son propre profil et logo
    const logoBufferB = await sharp({
      create: {
        width: 180,
        height: 60,
        channels: 4,
        background: { r: 255, g: 100, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const uploadLogoB = await fetch(`${BASE_URL}/api/onboarding/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userBId,
      },
      body: JSON.stringify({
        businessName: 'Entreprise B Distincte',
        logoUrl: 'https://fake.storage/userB_logo.png',
      }),
    });
    const logoBData = await uploadLogoB.json();

    const { data: profA } = await supabaseAdmin.from('profiles').select('business_name, logo_url').eq('id', userAId).single();
    const { data: profB } = await supabaseAdmin.from('profiles').select('business_name, logo_url').eq('id', userBId).single();

    const pass14 = profA?.business_name !== profB?.business_name && profB?.logo_url === 'https://fake.storage/userB_logo.png';
    recordTest(14, 'Second utilisateur avec profil et logo distincts', pass14, `User B: ${profB?.business_name}`);

    // ══════════════════════════════════════════════════════════
    // CAS 15 : ISOLATION STRICTE DES DONNÉES (AUCUN MÉLANGE)
    // ══════════════════════════════════════════════════════════
    // User A interroge ses images générées
    const imgsARes = await fetch(`${BASE_URL}/api/images?tab=created`, {
      headers: { 'x-user-id': userAId },
    });
    const imgsAData = await imgsARes.json();

    // User B interroge ses images générées
    const imgsBRes = await fetch(`${BASE_URL}/api/images?tab=created`, {
      headers: { 'x-user-id': userBId },
    });
    const imgsBData = await imgsBRes.json();

    const aContainsB = (imgsAData.images || []).some((img) => img.user_id === userBId);
    const bContainsA = (imgsBData.images || []).some((img) => img.user_id === userAId);
    const pass15 = !aContainsB && !bContainsA && (imgsAData.images || []).length >= 1 && (imgsBData.images || []).length === 0;

    recordTest(15, 'Isolation hermétique multi-utilisateurs vérifiée', pass15, `User A: ${imgsAData.images?.length} img, User B: ${imgsBData.images?.length} img`);

  } catch (error) {
    console.error('\n❌ Erreur inattendue durant les tests:', error);
  } finally {
    // ─── Nettoyage des données de test temporaires ───
    if (userAId) {
      await supabaseAdmin.from('generated_images').delete().eq('user_id', userAId);
      await supabaseAdmin.from('imported_images').delete().eq('user_id', userAId);
      await supabaseAdmin.from('credits').delete().eq('user_id', userAId);
      await supabaseAdmin.from('transactions').delete().eq('user_id', userAId);
      await supabaseAdmin.from('profiles').delete().eq('id', userAId);
      await supabaseAdmin.auth.admin.deleteUser(userAId);
    }
    if (userBId) {
      await supabaseAdmin.from('generated_images').delete().eq('user_id', userBId);
      await supabaseAdmin.from('imported_images').delete().eq('user_id', userBId);
      await supabaseAdmin.from('credits').delete().eq('user_id', userBId);
      await supabaseAdmin.from('transactions').delete().eq('user_id', userBId);
      await supabaseAdmin.from('profiles').delete().eq('id', userBId);
      await supabaseAdmin.auth.admin.deleteUser(userBId);
    }

    console.log('\n================================================================');
    const passedCount = results.filter((r) => r.passed).length;
    console.log(`RÉSUMÉ FINAL : ${passedCount}/${results.length} CAS VALIDÉS`);
    console.log('================================================================\n');

    if (passedCount === 15) {
      console.log('🎉 TOUS LES 15 CAS SONT CONFORMES ET TESTÉS AVEC SUCCÈS !');
      process.exit(0);
    } else {
      console.error('⚠️ Certains cas ont échoué.');
      process.exit(1);
    }
  }
}

runFull15Suite();
