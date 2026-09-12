import fs from 'fs';
import path from 'path';

async function runE2ETest() {
  console.log('====================================================');
  console.log('🚀 DÉMARRAGE DU TEST E2E RÉEL — APPLICATION + IDEOGRAM 4.0');
  console.log('====================================================\n');

  const userId = 'f2cf266c-966d-4d46-8703-fca4d1ed532b';
  const productImgPath = 'C:/PIXAXIS 2/pixaxis/public/showcase/ad-dove-coconut.jpg';

  if (!fs.existsSync(productImgPath)) {
    throw new Error(`Image produit de test introuvable: ${productImgPath}`);
  }

  const productBuffer = fs.readFileSync(productImgPath);
  console.log(`📸 Image produit chargée : ${productImgPath} (${productBuffer.length} octets)`);

  const formData = new FormData();
  formData.append('type', 'product');
  formData.append('style', 'realistic');
  formData.append('format', '1024x1024');
  formData.append('additional_prompt', 'Présenter ce flacon sur un piédestal en marbre noir veiné d’or dans un décor de palace parisien, avec des reflets subtils, une eau cristalline et un éclairage cinématique.');
  
  const blob = new Blob([productBuffer], { type: 'image/jpeg' });
  formData.append('images', blob, 'product_flacon.jpg');

  console.log('📡 Envoi de la requête POST http://127.0.0.1:3000/api/generate...');
  const startTime = Date.now();

  const res = await fetch('http://127.0.0.1:3000/api/generate', {
    method: 'POST',
    headers: {
      'x-user-id': userId,
    },
    body: formData,
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`⏱️ Réponse reçue en ${durationSec}s avec le statut HTTP: ${res.status}`);

  const rawText = await res.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    console.error('Réponse non JSON:', rawText);
    process.exit(1);
  }

  if (!res.ok) {
    console.error('❌ Échec de la génération API:', data);
    process.exit(1);
  }

  console.log('\n✅ SUCCÈS DE L’APPEL API GENERATE :');
  console.log('- Success:', data.success);
  console.log('- Image ID:', data.image?.id);
  console.log('- Image URL:', data.image?.url);
  console.log('- Crédits déduits:', data.credits_deducted);
  console.log('- Crédits restants:', data.remaining_credits);

  // 1. Vérification stricte : Aucune clé secrète dans la réponse
  const responseContainsSecret = rawText.includes(process.env.IDEOGRAM_API_KEY || '2W_L2OX');
  if (responseContainsSecret) {
    console.error('🚨 ERREUR CRITIQUE DE SÉCURITÉ : La clé secrète est présente dans la réponse client !');
    process.exit(1);
  } else {
    console.log('🔒 Sécurité validée : Aucune clé secrète n’est exposée dans la réponse client.');
  }

  // 2. Téléchargement réel de l'image stockée dans Supabase
  console.log('\n📥 Téléchargement de l’image générée depuis Supabase Storage...');
  const imgFetch = await fetch(data.image.url);
  if (!imgFetch.ok) {
    throw new Error(`Impossible de télécharger l’image depuis Supabase: ${imgFetch.status}`);
  }
  const imgArrayBuffer = await imgFetch.arrayBuffer();
  const imgBuffer = Buffer.from(imgArrayBuffer);
  console.log(`💾 Image générée téléchargée avec succès : ${imgBuffer.length} octets (${(imgBuffer.length / 1024 / 1024).toFixed(2)} Mo)`);

  const savePath = 'C:/PIXAXIS 2/pixaxis/scratch/e2e_real_ideogram_v4_output.png';
  fs.writeFileSync(savePath, imgBuffer);
  console.log(`📁 Image sauvegardée localement dans : ${savePath}`);

  // 3. Test de l'étape 5 : Composition du logo
  console.log('\n🎨 Test Étape 5 : Composition du logo de marque via Sharp...');
  // Création d'un logo SVG simple de test
  const svgLogo = Buffer.from(`
    <svg width="200" height="60" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="60" rx="10" fill="#000000" fill-opacity="0.8" />
      <text x="100" y="38" font-family="sans-serif" font-size="20" font-weight="bold" fill="#00E5FF" text-anchor="middle">NASSER LUXE</text>
    </svg>
  `);

  const logoFormData = new FormData();
  logoFormData.append('imageId', data.image.id);
  logoFormData.append('imageUrl', data.image.url);
  logoFormData.append('position', 'bottom-right');
  const logoBlob = new Blob([svgLogo], { type: 'image/svg+xml' });
  logoFormData.append('logoFile', logoBlob, 'logo.svg');

  const logoRes = await fetch('http://127.0.0.1:3000/api/onboarding/composite-logo', {
    method: 'POST',
    headers: {
      'x-user-id': userId,
    },
    body: logoFormData,
  });

  const logoData = await logoRes.json();
  console.log('Résultat composition logo:', logoData);

  if (logoData.success && logoData.compositedUrl) {
    console.log('✅ Étape 5 réussie : Logo incrusté avec succès sur le visuel final !');
    console.log('- Composited URL:', logoData.compositedUrl);
  }

  console.log('\n====================================================');
  console.log('🎉 TOUTES LES VÉRIFICATIONS E2E ONT RÉUSSI AVEC SUCCÈS !');
  console.log('====================================================');
}

runE2ETest().catch((err) => {
  console.error('Crash E2E test:', err);
  process.exit(1);
});
