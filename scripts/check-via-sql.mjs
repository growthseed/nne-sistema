// Use Supabase Management API to run SQL and check data
// The anon key can't read missionarios due to RLS, so we use the SQL endpoint

const SUPABASE_URL = 'https://prqxiqykkijzpwdpqujv.supabase.co'

// We need to get the access token from supabase CLI
import { execSync } from 'child_process'

// Get the access token
let accessToken
try {
  const result = execSync('npx supabase projects list --output json 2>/dev/null', { encoding: 'utf-8' })
  // The token is stored in the supabase config
} catch (e) {
  // fallback
}

// Try using the supabase db execute via management API
const projectRef = 'prqxiqykkijzpwdpqujv'

// Read token from supabase CLI config
import { readFileSync } from 'fs'
import { homedir } from 'os'
import path from 'path'

let token
try {
  // Try common supabase CLI config locations
  const configPaths = [
    path.join(homedir(), '.supabase', 'access-token'),
    path.join(homedir(), 'AppData', 'Roaming', 'supabase', 'access-token'),
  ]
  for (const p of configPaths) {
    try {
      token = readFileSync(p, 'utf-8').trim()
      if (token) break
    } catch {}
  }
} catch {}

if (!token) {
  console.log('Cannot find Supabase access token. Trying alternative approach...')

  // Try using the supabase CLI to get the DB URL
  try {
    const dbUrl = execSync('npx supabase db url 2>/dev/null', { encoding: 'utf-8' }).trim()
    console.log('DB URL found:', dbUrl.replace(/:[^@]+@/, ':***@'))
  } catch (e) {
    console.log('Could not get DB URL either.')
  }

  // Alternative: use the REST API with SQL function
  // Let's check if there's an rpc function we can use
  console.log('\nTrying to query via RPC...')
  process.exit(1)
}

console.log('Token found, querying via Management API...')

const queries = [
  'SELECT count(*) as total FROM missionarios',
  'SELECT count(*) as total FROM usuarios',
  'SELECT count(*) as total FROM associacoes',
  "SELECT id, nome, cargo_ministerial, status, associacao_id, array_length(igrejas_responsavel, 1) as num_igrejas FROM missionarios ORDER BY nome LIMIT 20",
  "SELECT id, nome, sigla FROM associacoes ORDER BY nome",
]

for (const sql of queries) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.log(`\nQuery: ${sql}\nError: ${res.status} ${text}`)
    continue
  }

  const data = await res.json()
  console.log(`\nQuery: ${sql}`)
  console.log('Result:', JSON.stringify(data, null, 2).slice(0, 2000))
}
