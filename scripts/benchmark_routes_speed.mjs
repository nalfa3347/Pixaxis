import http from 'http';

const BASE_URL = 'http://localhost:3000';
const PAGES = [
  { name: 'Accueil (Landing)', path: '/' },
  { name: 'Connexion / Auth', path: '/connexion' },
  { name: 'Onboarding Studio', path: '/onboarding' },
  { name: 'Création (Studio)', path: '/creer' },
  { name: 'Mes Images (Galerie)', path: '/mes-images' },
  { name: 'Profil & Forfaits', path: '/profil' },
  { name: 'Conditions d\'Utilisation (CGU)', path: '/cgu' },
  { name: 'Politique Confidentialité', path: '/confidentialite' },
  { name: 'Mentions Légales', path: '/mentions-legales' },
];

async function measurePage(path) {
  return new Promise((resolve) => {
    const start = performance.now();
    const req = http.get(`${BASE_URL}${path}`, (res) => {
      let data = '';
      const ttfb = performance.now() - start;
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const totalTime = performance.now() - start;
        resolve({
          status: res.statusCode,
          ttfbMs: Math.round(ttfb),
          totalMs: Math.round(totalTime),
          sizeKb: (Buffer.byteLength(data, 'utf8') / 1024).toFixed(1),
          success: res.statusCode === 200,
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        status: 0,
        ttfbMs: 0,
        totalMs: Math.round(performance.now() - start),
        sizeKb: '0',
        success: false,
        error: err.message,
      });
    });
  });
}

async function runBenchmark() {
  console.log('\n================================================================');
  console.log('⚡ BENCHMARK DE PERFORMANCE PIXAXIS — CHARGEMENT DES PAGES');
  console.log('   Objectif strict : < 3.0 secondes (3000 ms) | Cible visée : ~2.0s ou moins');
  console.log('================================================================\n');

  // Warmup pass
  console.log('🔄 Initialisation du cache serveur...');
  for (const p of PAGES) {
    await measurePage(p.path);
  }

  console.log('\n📊 MESURES DE VITESSE RÉELLES PAR ROUTE :\n');
  console.log('Page'.padEnd(34) + 'Statut'.padEnd(10) + 'TTFB'.padEnd(12) + 'Total (ms)'.padEnd(15) + 'Taille'.padEnd(12) + 'Objectif < 3s');
  console.log(''.padEnd(95, '-'));

  let allPassed = true;
  const results = [];

  for (const page of PAGES) {
    // 3 runs to get a stable average
    const run1 = await measurePage(page.path);
    const run2 = await measurePage(page.path);
    const run3 = await measurePage(page.path);

    const avgMs = Math.round((run1.totalMs + run2.totalMs + run3.totalMs) / 3);
    const avgTtfb = Math.round((run1.ttfbMs + run2.ttfbMs + run3.ttfbMs) / 3);
    const pass = avgMs < 3000;
    if (!pass) allPassed = false;

    const flag = avgMs < 1000 ? '🚀 EXCELLENT (<1s)' : avgMs < 2000 ? '⚡ TRÈS RAPIDE (<2s)' : avgMs < 3000 ? '✅ CONFORME (<3s)' : '❌ TROP LENT';

    console.log(
      page.name.padEnd(34) +
      `HTTP ${run1.status}`.padEnd(10) +
      `${avgTtfb} ms`.padEnd(12) +
      `${avgMs} ms`.padEnd(15) +
      `${run1.sizeKb} Ko`.padEnd(12) +
      flag
    );

    results.push({ ...page, avgMs, avgTtfb, pass, sizeKb: run1.sizeKb });
  }

  console.log('\n================================================================');
  const successCount = results.filter(r => r.pass).length;
  console.log(`RÉSULTAT : ${successCount}/${results.length} PAGES CONFORMES AU SEUIL < 3.0s`);
  console.log('================================================================\n');

  if (allPassed) {
    console.log('🎉 SUCCÈS TOTAL : Chaque page principale se charge en moins de 3.0 secondes !');
    process.exit(0);
  } else {
    console.error('⚠️ Certaines pages dépassent le seuil de 3.0s.');
    process.exit(1);
  }
}

runBenchmark();
