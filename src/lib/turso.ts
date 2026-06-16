import { createClient } from '@libsql/client'

const tursoUrl = process.env.TURSO_AUTH_TOKEN
  ? process.env.TURSO_DATABASE_URL || 'libsql://budgettracker-owllain.aws-us-east-2.turso.io'
  : 'file:/home/z/my-project/db/local.db'
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN || undefined

export const db = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken,
})
