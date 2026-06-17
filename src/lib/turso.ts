import { createClient } from '@libsql/client'

const tursoAuthToken = process.env.TURSO_AUTH_TOKEN || undefined
const tursoDatabaseUrl = process.env.TURSO_DATABASE_URL

if (!tursoDatabaseUrl) {
  throw new Error('TURSO_DATABASE_URL is required. Configure your remote Turso database URL in .env.')
}

if (!tursoDatabaseUrl.startsWith('libsql://')) {
  throw new Error('TURSO_DATABASE_URL must point to a Turso database (libsql://).')
}

if (!tursoAuthToken) {
  throw new Error('TURSO_AUTH_TOKEN is required when using a remote Turso database.')
}

export const db = createClient({
  url: tursoDatabaseUrl,
  authToken: tursoAuthToken,
})

export function verifyTursoConfig() {
  if (!tursoDatabaseUrl || !tursoAuthToken) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must both be configured.')
  }
}
