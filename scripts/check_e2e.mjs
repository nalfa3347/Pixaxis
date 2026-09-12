import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*').limit(5);
  console.log('Profiles:', profiles, pErr);

  const { data: authUsers, error: aErr } = await supabase.auth.admin.listUsers();
  console.log('Auth Users count:', authUsers?.users?.length, 'error:', aErr);
  if (authUsers?.users?.length > 0) {
    console.log('First user ID:', authUsers.users[0].id, authUsers.users[0].email);
  }
}

run();
