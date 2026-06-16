// ============================================
// FinanzasCR — Turso Database Schema
// Ejecutar este script en Turso SQL Console
// ============================================

-- Presupuestos
CREATE TABLE IF NOT EXISTS budgets (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  period      TEXT NOT NULL CHECK(period IN ('monthly','biweekly')),
  currency    TEXT NOT NULL DEFAULT 'CRC',
  holder_name TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Ingresos del presupuesto
CREATE TABLE IF NOT EXISTS income_items (
  id          TEXT PRIMARY KEY,
  budget_id   TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  category    TEXT NOT NULL DEFAULT 'salary',
  description TEXT NOT NULL,
  amount      REAL NOT NULL DEFAULT 0,
  sort_order  INTEGER DEFAULT 0
);

-- Gastos del presupuesto
CREATE TABLE IF NOT EXISTS expense_items (
  id          TEXT PRIMARY KEY,
  budget_id   TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  category    TEXT NOT NULL CHECK(category IN ('fixed','credit','emergency','other')),
  sub_category TEXT DEFAULT '',
  description TEXT NOT NULL,
  amount      REAL NOT NULL DEFAULT 0,
  extra_data  TEXT DEFAULT '{}',
  sort_order  INTEGER DEFAULT 0
);

-- Metas de ahorro
CREATE TABLE IF NOT EXISTS savings_goals (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  target_amount  REAL NOT NULL,
  current_amount REAL NOT NULL DEFAULT 0,
  target_date    TEXT,
  currency       TEXT NOT NULL DEFAULT 'CRC',
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_income_budget ON income_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_expense_budget ON expense_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_budgets_created ON budgets(created_at DESC);
