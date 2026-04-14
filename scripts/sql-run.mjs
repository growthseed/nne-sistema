// sql-run.mjs — execute a SQL file (or inline) against the NNE Supabase Postgres directly
//
// Usage:
//   node scripts/sql-run.mjs supabase-migrations/033_pessoas_dados_legado.sql
//   node scripts/sql-run.mjs --query "SELECT count(*) FROM pessoas"
//
// Connection string must come from environment.
// Supported variables: PGURI or DATABASE_URL.

import pg from 'pg'
import { readFileSync, existsSync } from 'fs'

const { Client } = pg

const PGURI = process.env.PGURI || process.env.DATABASE_URL

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('Usage: node scripts/sql-run.mjs <file.sql>  OR  --query "SQL"')
  process.exit(1)
}

if (!PGURI) {
  console.error('Missing PGURI/DATABASE_URL environment variable.')
  process.exit(1)
}

let sql
if (args[0] === '--query') {
  sql = args.slice(1).join(' ')
} else {
  if (!existsSync(args[0])) {
    console.error(`File not found: ${args[0]}`)
    process.exit(1)
  }
  sql = readFileSync(args[0], 'utf-8')
  console.log(`📂 Loaded ${args[0]} (${sql.length} bytes)`)
}

const client = new Client({
  connectionString: PGURI,
  ssl: { rejectUnauthorized: false },
  // Slightly longer statement timeout for migrations
  statement_timeout: 60000,
})

try {
  console.log('🔌 Connecting...')
  await client.connect()
  console.log('✅ Connected')

  console.log('▶️  Executing SQL...')
  const t0 = Date.now()
  const result = await client.query(sql)
  const elapsed = Date.now() - t0

  if (Array.isArray(result)) {
    // Multiple statements — show summary per statement
    console.log(`✅ Done in ${elapsed}ms (${result.length} statements)`)
    result.forEach((r, i) => {
      console.log(`  [${i}] ${r.command || 'unknown'} → ${r.rowCount ?? '-'} rows`)
    })
  } else {
    console.log(`✅ Done in ${elapsed}ms`)
    console.log(`  command: ${result.command}`)
    console.log(`  rowCount: ${result.rowCount}`)
    if (result.rows && result.rows.length > 0 && result.rows.length <= 20) {
      console.table(result.rows)
    } else if (result.rows && result.rows.length > 20) {
      console.log(`  rows: ${result.rows.length} (showing first 5)`)
      console.table(result.rows.slice(0, 5))
    }
  }
} catch (err) {
  console.error('❌ ERROR:', err.message)
  if (err.position) console.error('   position:', err.position)
  if (err.detail) console.error('   detail:', err.detail)
  process.exit(1)
} finally {
  await client.end()
}
