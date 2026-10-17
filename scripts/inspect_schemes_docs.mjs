import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
let supabaseUrl = '', supabaseAnonKey = '';
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
  if (match) {
    if (match[1] === 'VITE_SUPABASE_URL') supabaseUrl = match[2].trim().replace(/^["']|["']$/g, '');
    if (match[1] === 'VITE_SUPABASE_ANON_KEY') supabaseAnonKey = match[2].trim().replace(/^["']|["']$/g, '');
  }
}

async function main() {
  const resSchemes = await fetch(`${supabaseUrl}/rest/v1/Schemes?select=*`, {
    headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
  });
  const schemes = await resSchemes.json();
  console.log(`\nAll ${schemes.length} Schemes:`);
  schemes.forEach((s, idx) => {
    console.log(`${idx + 1}. [${s.id}] "${s.name}"`);
    console.log(`   Ministry: ${s.ministry} | State: ${s.state_applicable} | Mode: ${s.application_mode}`);
    console.log(`   Official URL: ${s.official_url}`);
  });
}

main().catch(console.error);
