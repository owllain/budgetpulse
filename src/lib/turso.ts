import { createClient } from '@libsql/client'

// Use local SQLite when no auth token is provided (development)
// Use Turso remote when TURSO_AUTH_TOKEN is set (production)
const tursoUrl = process.env.TURSO_AUTH_TOKEN
  ? process.env.TURSO_DATABASE_URL || 'libsql://budgettracker-owllain.aws-us-east-2.turso.io'
  : 'file:/home/z/my-project/db/local.db'
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN || undefined

export const turso = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken,
})
