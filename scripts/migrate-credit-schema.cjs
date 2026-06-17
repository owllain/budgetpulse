const fs = require('fs')
const path = require('path')
const { createClient } = require('@libsql/client')

const url = process.env.TURSO_DATABASE_URL
const auth = process.env.TURSO_AUTH_TOKEN

if (!url || !auth) {
  console.error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required')
  process.exit(1)
}

const db = createClient({ url, auth })

async function migrate() {
  await db.execute(`DROP INDEX IF EXISTS idx_credit_user;`)
  await db.execute(`DROP TABLE IF EXISTS credit_products;`)

  await db.execute(`CREATE TABLE IF NOT EXISTS credit_cards (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    financial_entity TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CRC',
    credit_limit REAL NOT NULL DEFAULT 0,
    current_balance REAL NOT NULL DEFAULT 0,
    minimum_payment REAL NOT NULL DEFAULT 0,
    statement_closing_day INTEGER NOT NULL CHECK(statement_closing_day BETWEEN 1 AND 31),
    payment_due_day INTEGER NOT NULL CHECK(payment_due_day BETWEEN 1 AND 31),
    interest_rate REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`)

  await db.execute(`CREATE TABLE IF NOT EXISTS loans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    financial_entity TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CRC',
    initial_amount REAL NOT NULL,
    total_with_interest REAL NOT NULL,
    current_balance REAL NOT NULL,
    loan_term_years INTEGER NOT NULL,
    total_installments INTEGER NOT NULL,
    paid_installments INTEGER DEFAULT 0,
    installment_amount REAL NOT NULL,
    payment_due_day INTEGER NOT NULL CHECK(payment_due_day BETWEEN 1 AND 31),
    interest_rate REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`)

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_cards_user ON credit_cards(user_id);`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_loans_user ON loans(user_id);`)

  console.log('Migration complete')
}

migrate().catch(err => {
  console.error(err)
  process.exit(1)
})
