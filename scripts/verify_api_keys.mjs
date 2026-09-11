import { createClient } from '@supabase/supabase-js';

async function verifySupabase() {
  console.log('\n--- 1. Vérification SUPABASE ---');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log(`URL: ${url}`);
  console.log(`Anon Key présente: ${Boolean(anonKey)}`);
  console.log(`Service Role Key présente: ${Boolean(serviceKey)}`);

  if (!url || !serviceKey) {
    console.error('❌ Configuration Supabase incomplète.');
    return false;
  }

  try {
    const supabase = createClient(url, serviceKey);
    const tables = ['users', 'credits', 'imported_images', 'generated_images', 'transactions'];
    console.log('Testing required tables...');
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`  - ${table}: ❌ ${error.message}`);
      } else {
        console.log(`  - ${table}: ✅ Table accessible (rows: ${data ? data.length : 0})`);
      }
    }

    const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
    if (bErr) {
      console.error('⚠️ Erreur Storage listBuckets:', bErr.message);
    } else {
      console.log(`✅ Supabase Storage accessible. Buckets: ${buckets.map(b => b.name).join(', ')}`);
    }
    return true;
  } catch (err) {
    console.error('❌ Exception Supabase:', err.message);
    return false;
  }
}

async function verifyOpenAI() {
  console.log('\n--- 2. Vérification OPENAI ---');
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ Clé OPENAI_API_KEY manquante.');
    return false;
  }

  console.log(`Clé présente: ${apiKey.slice(0, 10)}...${apiKey.slice(-4)}`);

  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ Erreur OpenAI (${res.status}):`, errText);
      return false;
    }

    const data = await res.json();
    console.log(`✅ OpenAI authentifié avec succès ! (${data.data?.length || 0} modèles disponibles)`);
    return true;
  } catch (err) {
    console.error('❌ Exception OpenAI:', err.message);
    return false;
  }
}

async function verifyFedaPay() {
  console.log('\n--- 3. Vérification FEDAPAY ---');
  const secretKey = process.env.FEDAPAY_SECRET_KEY;
  const env = process.env.FEDAPAY_ENVIRONMENT || 'sandbox';

  if (!secretKey) {
    console.error('❌ Clé FEDAPAY_SECRET_KEY manquante.');
    return false;
  }

  console.log(`Environnement: ${env}`);
  console.log(`Secret Key présente: ${secretKey.slice(0, 10)}...${secretKey.slice(-4)}`);

  const baseUrl = env === 'live' 
    ? 'https://api.fedapay.com/v1' 
    : 'https://sandbox-api.fedapay.com/v1';

  try {
    const res = await fetch(`${baseUrl}/transactions/search?per_page=1`, {
      headers: {
        'Authorization': `Bearer ${secretKey}`
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ Erreur FedaPay (${res.status}):`, errText);
      return false;
    }

    const data = await res.json();
    console.log(`✅ FedaPay authentifié avec succès en mode ${env.toUpperCase()} !`);
    return true;
  } catch (err) {
    console.error('❌ Exception FedaPay:', err.message);
    return false;
  }
}

async function main() {
  const sOk = await verifySupabase();
  const oOk = await verifyOpenAI();
  const fOk = await verifyFedaPay();

  console.log('\n=======================================');
  console.log(`RÉSUMÉ DES VÉRIFICATIONS :`);
  console.log(`Supabase : ${sOk ? '✅ VALIDE' : '❌ ERREUR'}`);
  console.log(`OpenAI   : ${oOk ? '✅ VALIDE' : '❌ ERREUR'}`);
  console.log(`FedaPay  : ${fOk ? '✅ VALIDE' : '❌ ERREUR'}`);
  console.log('=======================================');
}

main();
