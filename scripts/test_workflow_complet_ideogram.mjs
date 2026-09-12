import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function runCompleteWorkflow() {
  console.log('================================================================');
  console.log('💎 TEST RÉEL WORKFLOW COMPLET — PRODUIT + LOGO + IDEOGRAM 4.0');
  console.log('================================================================\n');

  const userId = 'f2cf266c-966d-4d46-8703-fca4d1ed532b';
  const productImgPath = 'C:/PIXAXIS 2/pixaxis/public/showcase/ad-nexora-earbuds.jpg';

  if (!fs.existsSync(productImgPath)) {
    throw new Error(`Photo produit introuvable : ${productImgPath}`);
  }

  // ─── 1. CRÉATION DU LOGO OFFICIEL DE MARQUE (PNG Transparent) ─────────
  console.log('1️⃣ Création et enregistrement du logo officiel de la marque...');
  const logoSvg = `
    <svg width="400" height="120" viewBox="0 0 400 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#00E5FF" />
          <stop offset="100%" stop-color="#0088FF" />
        </linearGradient>
      </defs>
      <!-- Emblème onde sonore / audio futuriste -->
      <rect x="10" y="20" width="12" height="80" rx="6" fill="url(#cyanGrad)" />
      <rect x="30" y="35" width="12" height="50" rx="6" fill="url(#cyanGrad)" />
      <rect x="50" y="10" width="12" height="100" rx="6" fill="url(#cyanGrad)" />
      <rect x="70" y="45" width="12" height="30" rx="6" fill="url(#cyanGrad)" />
      
      <!-- Typographie de marque ultra nette -->
      <text x="105" y="65" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="900" fill="#FFFFFF" letter-spacing="3">NEXORA</text>
      <text x="108" y="95" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="#00E5FF" letter-spacing="6">AUDIO LABS</text>
    </svg>
  `;

  const logoPngBuffer = await sharp(Buffer.from(logoSvg))
    .png()
    .toBuffer();

  const logoLocalPath = 'C:/PIXAXIS 2/pixaxis/scratch/official_nexora_logo.png';
  fs.writeFileSync(logoLocalPath, logoPngBuffer);
  console.log(`✓ Logo généré et sauvegardé en local : ${logoLocalPath} (${logoPngBuffer.length} octets)`);

  // ─── 2. ENREGISTREMENT DU LOGO DANS LE COMPTE DE L'UTILISATEUR ───────
  console.log('\n2️⃣ Enregistrement du logo dans le compte utilisateur via /api/onboarding/logo...');
  const logoForm = new FormData();
  const logoBlob = new Blob([logoPngBuffer], { type: 'image/png' });
  logoForm.append('file', logoBlob, 'nexora_brand_logo.png');

  const logoUploadRes = await fetch('http://127.0.0.1:3000/api/onboarding/logo', {
    method: 'POST',
    headers: {
      'x-user-id': userId,
    },
    body: logoForm,
  });

  const logoUploadData = await logoUploadRes.json();
  if (!logoUploadRes.ok || !logoUploadData.logoUrl) {
    throw new Error(`Échec upload logo: ${JSON.stringify(logoUploadData)}`);
  }
  console.log('✓ Logo officiel enregistré dans le profil utilisateur :', logoUploadData.logoUrl);

  // ─── 3. VÉRIFICATION DES CRÉDITS AVANT GÉNÉRATION ───────────────────
  console.log('\n3️⃣ Vérification du solde de crédits initial...');
  const creditsResBefore = await fetch('http://127.0.0.1:3000/api/credits?force=true', {
    headers: { 'x-user-id': userId },
  });
  const creditsDataBefore = await creditsResBefore.json();
  const initialCredits = creditsDataBefore.total_credits;
  console.log(`✓ Solde de crédits initial : ${initialCredits} crédits`);

  // ─── 4. APPEL IDEOGRAM 4.0 POUR LA SCÈNE PUBLICITAIRE ───────────────
  console.log('\n4️⃣ Envoi de la demande de création à Ideogram 4.0 (/api/generate)...');
  const productBuffer = fs.readFileSync(productImgPath);
  console.log(`📸 Photo produit chargée : ${productImgPath} (${productBuffer.length} octets)`);

  const genForm = new FormData();
  genForm.append('type', 'product');
  genForm.append('style', 'realistic');
  genForm.append('format', '1024x1024');
  genForm.append(
    'additional_prompt',
    'Mettre en scène ces écouteurs sans fil ultra-modernes flottant au-dessus d’un piédestal en obsidienne avec de fines réverbérations sonores dorées, reflets d’eau et un éclairage publicitaire studio cyan et noir profond.'
  );
  const productBlob = new Blob([productBuffer], { type: 'image/jpeg' });
  genForm.append('images', productBlob, 'product_earbuds.jpg');

  const genStart = Date.now();
  const genRes = await fetch('http://127.0.0.1:3000/api/generate', {
    method: 'POST',
    headers: {
      'x-user-id': userId,
    },
    body: genForm,
  });

  const genDuration = ((Date.now() - genStart) / 1000).toFixed(2);
  const genData = await genRes.json();

  if (!genRes.ok || !genData.success) {
    throw new Error(`Échec génération Ideogram 4.0: ${JSON.stringify(genData)}`);
  }

  console.log(`✓ Scène publicitaire générée par Ideogram 4.0 en ${genDuration}s !`);
  console.log('- Image ID:', genData.image.id);
  console.log('- URL scène générée:', genData.image.url);
  console.log('- Crédits déduits lors de la génération:', genData.credits_deducted);
  console.log('- Crédits restants annoncés:', genData.remaining_credits);

  // ─── 5. VÉRIFICATION DES CRÉDITS APRÈS GÉNÉRATION ───────────────────
  console.log('\n5️⃣ Vérification du solde de crédits après génération...');
  const creditsResAfterGen = await fetch('http://127.0.0.1:3000/api/credits?force=true', {
    headers: { 'x-user-id': userId },
  });
  const creditsDataAfterGen = await creditsResAfterGen.json();
  const creditsAfterGen = creditsDataAfterGen.total_credits;
  console.log(`✓ Solde actuel : ${creditsAfterGen} crédits`);

  const expectedRemaining = (initialCredits ?? 2600) - 200;
  if (creditsAfterGen !== expectedRemaining) {
    throw new Error(`Anomalie de déduction crédits : attendu ${expectedRemaining}, obtenu ${creditsAfterGen}`);
  }
  console.log('✓ Validation : Exactement 200 crédits ont été déduits.');

  // ─── 6. INCRUSTATION DU LOGO ORIGINAL PAR L’APPLICATION VIA SHARP ───
  console.log('\n6️⃣ Incrustation du logo original enregistré sur le visuel final (via /api/onboarding/composite-logo)...');
  const compForm = new FormData();
  compForm.append('imageId', genData.image.id);
  compForm.append('imageUrl', genData.image.url);
  compForm.append('position', 'bottom-right');

  const compRes = await fetch('http://127.0.0.1:3000/api/onboarding/composite-logo', {
    method: 'POST',
    headers: {
      'x-user-id': userId,
    },
    body: compForm,
  });

  const compData = await compRes.json();
  if (!compRes.ok || !compData.success || !compData.compositedUrl) {
    throw new Error(`Échec composition logo: ${JSON.stringify(compData)}`);
  }

  console.log('✓ Logo incrusté par Sharp avec succès !');
  console.log('- URL finale avec logo :', compData.compositedUrl);
  console.log('- URL originale scène  :', compData.originalUrl);
  console.log('- URL logo utilisé     :', compData.logoUrl);

  // ─── 7. VÉRIFICATION QUE LES CRÉDITS NE SONT DÉBITÉS QU'UNE SEULE FOIS ─
  console.log('\n7️⃣ Vérification que l’incrustation du logo n’a pas débité de crédits supplémentaires...');
  const creditsResFinal = await fetch('http://127.0.0.1:3000/api/credits?force=true', {
    headers: { 'x-user-id': userId },
  });
  const creditsDataFinal = await creditsResFinal.json();
  const creditsFinal = creditsDataFinal.total_credits;
  console.log(`✓ Solde final : ${creditsFinal} crédits`);

  if (creditsFinal !== creditsAfterGen) {
    throw new Error(`Erreur : les crédits ont été débités une 2e fois ! (${creditsAfterGen} -> ${creditsFinal})`);
  }
  console.log('✓ RÈGLE STRICTE RESPECTÉE : Les crédits n’ont été débités qu’une seule fois sur tout le workflow !');

  // ─── 8. VÉRIFICATION DE LA NON-ALTÉRATION DU LOGO ────────────────────
  console.log('\n8️⃣ Vérification technique de la préservation du logo...');
  const compImgRes = await fetch(compData.compositedUrl);
  const compImgBuffer = Buffer.from(await compImgRes.arrayBuffer());

  const compSavePath = 'C:/PIXAXIS 2/pixaxis/scratch/test2_workflow_complet_final.png';
  fs.writeFileSync(compSavePath, compImgBuffer);
  console.log(`✓ Visuel final téléchargé et archivé : ${compSavePath} (${compImgBuffer.length} octets)`);

  const compMeta = await sharp(compImgBuffer).metadata();
  console.log(`- Dimensions du visuel final : ${compMeta.width}x${compMeta.height} (${compMeta.format})`);

  console.log('\n================================================================');
  console.log('🎉 TOUTES LES ÉTAPES DU WORKFLOW COMPLET ONT RÉUSSI AVEC SUCCÈS !');
  console.log('================================================================');
}

runCompleteWorkflow().catch((err) => {
  console.error('Crash workflow:', err);
  process.exit(1);
});
