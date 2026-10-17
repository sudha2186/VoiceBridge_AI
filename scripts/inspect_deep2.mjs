import fs from 'fs';
import path from 'path';

// Locate .env in root or current folder
let envPath = path.resolve('.env');
if (!fs.existsSync(envPath)) {
  envPath = path.resolve('VoiceBridge_AI-main', '.env');
}
if (!fs.existsSync(envPath)) {
  envPath = 'c:/Users/sudha/Downloads/VoiceBridge_AI-main/VoiceBridge_AI-main/.env';
}

const envContent = fs.readFileSync(envPath, 'utf-8');

let supabaseUrl = '';
let supabaseAnonKey = '';

for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
  if (match) {
    if (match[1] === 'VITE_SUPABASE_URL') supabaseUrl = match[2].trim().replace(/^["']|["']$/g, '');
    if (match[1] === 'VITE_SUPABASE_ANON_KEY') supabaseAnonKey = match[2].trim().replace(/^["']|["']$/g, '');
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Key not found in .env');
  process.exit(1);
}

async function deepInspect() {
  console.log(`Connecting to Supabase host: ${new URL(supabaseUrl).hostname}`);

  // 1. Fetch all 20 schemes
  console.log('\n--- FETCHING ALL SCHEMES (Schemes table) ---');
  const resSchemes = await fetch(`${supabaseUrl}/rest/v1/Schemes?select=*`, {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    }
  });

  if (resSchemes.ok) {
    const schemes = await resSchemes.json();
    console.log(`Fetched ${schemes.length} schemes from 'Schemes' table:`);
    schemes.forEach((s, idx) => {
      console.log(`${idx + 1}. [${s.id}] "${s.name}" | Type: ${s.scheme_type} | Ministry: ${s.ministry} | State: ${s.state_applicable}`);
    });
  } else {
    console.log('Failed to fetch Schemes:', resSchemes.status, resSchemes.statusText);
  }

  // 2. Probe 'messages' table columns
  console.log('\n--- PROBING COLUMNS FOR `messages` ---');
  const candidateMsgCols = [
    'id', 'user_id', 'session_id', 'conversation_id', 'role', 'content',
    'message', 'sender', 'text', 'created_at', 'updated_at', 'metadata',
    'language', 'audio_url', 'intent', 'entities'
  ];
  const confirmedMsgCols = [];
  for (const col of candidateMsgCols) {
    const res = await fetch(`${supabaseUrl}/rest/v1/messages?select=${col}&limit=1`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    if (res.ok) {
      confirmedMsgCols.push(col);
    }
  }
  console.log('Confirmed `messages` columns:', confirmedMsgCols);

  // 3. Probe 'documents' columns
  console.log('\n--- PROBING COLUMNS FOR `documents` ---');
  const candidateDocCols = [
    'id', 'scheme_id', 'document_name', 'description', 'is_mandatory',
    'created_at', 'updated_at', 'user_id', 'file_name', 'storage_path',
    'file_size', 'extracted_data'
  ];
  const confirmedDocCols = [];
  for (const col of candidateDocCols) {
    const res = await fetch(`${supabaseUrl}/rest/v1/documents?select=${col}&limit=1`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    if (res.ok) {
      confirmedDocCols.push(col);
    }
  }
  console.log('Confirmed `documents` columns:', confirmedDocCols);

  // 4. Probe 'applications' columns
  console.log('\n--- PROBING COLUMNS FOR `applications` ---');
  const candidateAppCols = [
    'id', 'user_id', 'scheme_id', 'status', 'form_data',
    'pdf_url', 'pdf_path', 'created_at', 'updated_at'
  ];
  const confirmedAppCols = [];
  for (const col of candidateAppCols) {
    const res = await fetch(`${supabaseUrl}/rest/v1/applications?select=${col}&limit=1`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    if (res.ok) {
      confirmedAppCols.push(col);
    }
  }
  console.log('Confirmed `applications` columns:', confirmedAppCols);

  // 5. Probe 'profiles' columns
  console.log('\n--- PROBING COLUMNS FOR `profiles` ---');
  const candidateProfileCols = [
    'id', 'user_id', 'full_name', 'phone', 'state', 'district',
    'date_of_birth', 'age', 'annual_income', 'category', 'gender',
    'occupation', 'created_at', 'updated_at'
  ];
  const confirmedProfileCols = [];
  for (const col of candidateProfileCols) {
    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?select=${col}&limit=1`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    if (res.ok) {
      confirmedProfileCols.push(col);
    }
  }
  console.log('Confirmed `profiles` columns:', confirmedProfileCols);
}

deepInspect();
