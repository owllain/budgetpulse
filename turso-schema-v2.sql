-- ============================================
-- BudgetPulse Database Schema v2
-- Turso (libSQL) · Compatible con SQLite
-- ============================================

-- Usuarios
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Presupuestos
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  period TEXT NOT NULL CHECK(period IN ('monthly','biweekly')),
  currency TEXT NOT NULL DEFAULT 'CRC',
  holder_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Ingresos del presupuesto
CREATE TABLE IF NOT EXISTS income_items (
  id TEXT PRIMARY KEY,
  budget_id TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'salary',
  description TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- Gastos del presupuesto
CREATE TABLE IF NOT EXISTS expense_items (
  id TEXT PRIMARY KEY,
  budget_id TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK(category IN ('fixed','credit','emergency','other')),
  description TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- Metas de ahorro
CREATE TABLE IF NOT EXISTS savings_goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL,
  current_amount REAL NOT NULL DEFAULT 0,
  target_date TEXT,
  currency TEXT NOT NULL DEFAULT 'CRC',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tipo de cambio (cache BCCR)
CREATE TABLE IF NOT EXISTS exchange_rates (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  buy_rate REAL NOT NULL,
  sell_rate REAL NOT NULL,
  source TEXT NOT NULL DEFAULT 'BCCR',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_income_budget ON income_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_expense_budget ON expense_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_budgets_created ON budgets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_income_user ON income_items(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_user ON expense_items(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user ON savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_exchange_date ON exchange_rates(date DESC);

-- Créditos y préstamos
CREATE TABLE IF NOT EXISTS credit_cards (
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
);

CREATE TABLE IF NOT EXISTS loans (
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
);

CREATE INDEX IF NOT EXISTS idx_cards_user ON credit_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_user ON loans(user_id);

-- ============================================
-- Usuarios iniciales (passwords hasheadas con bcryptjs)
-- Contraseñas: Juni=Melo, Enrique=Mochi
-- Para generar hashes: bun run scripts/seed-users.cjs
-- ============================================
