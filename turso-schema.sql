-- ============================================
-- BudgetFlow - Turso Database Schema
-- Ejecutar este script en Turso SQL Console
-- ============================================

-- Presupuestos principales
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'month', -- 'month' o 'biweek'
  period_start TEXT NOT NULL, -- ISO date
  period_end TEXT NOT NULL,   -- ISO date
  currency TEXT NOT NULL DEFAULT 'CRC', -- 'CRC' o 'USD'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Ingresos
CREATE TABLE IF NOT EXISTS incomes (
  id TEXT PRIMARY KEY,
  budget_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'salary', -- 'salary', 'freelance', 'investment', 'other'
  is_recurring INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE
);

-- Gastos Fijos
CREATE TABLE IF NOT EXISTS fixed_expenses (
  id TEXT PRIMARY KEY,
  budget_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'utilities', -- 'rent', 'utilities', 'insurance', 'subscriptions', 'transport', 'other'
  due_date TEXT, -- día del mes
  is_paid INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE
);

-- Obligaciones crediticias
CREATE TABLE IF NOT EXISTS credit_obligations (
  id TEXT PRIMARY KEY,
  budget_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'credit_card', -- 'credit_card', 'loan', 'financing'
  total_debt REAL NOT NULL DEFAULT 0,
  monthly_payment REAL NOT NULL DEFAULT 0,
  annual_rate REAL NOT NULL DEFAULT 0,
  remaining_months INTEGER NOT NULL DEFAULT 0,
  minimum_payment REAL NOT NULL DEFAULT 0,
  is_paid INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE
);

-- Fondos de emergencia
CREATE TABLE IF NOT EXISTS emergency_funds (
  id TEXT PRIMARY KEY,
  budget_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL DEFAULT 0,
  current_amount REAL NOT NULL DEFAULT 0,
  monthly_contribution REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE
);

-- Otros consumos / gastos variables
CREATE TABLE IF NOT EXISTS variable_expenses (
  id TEXT PRIMARY KEY,
  budget_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'food', -- 'food', 'entertainment', 'clothing', 'health', 'education', 'gifts', 'other'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE
);

-- Cálculos de aguinaldo
CREATE TABLE IF NOT EXISTS aguinaldo_calculations (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  salaries TEXT NOT NULL, -- JSON array of 12 monthly salaries
  total_gross REAL NOT NULL DEFAULT 0,
  aguinaldo_amount REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_incomes_budget ON incomes(budget_id);
CREATE INDEX IF NOT EXISTS idx_fixed_expenses_budget ON fixed_expenses(budget_id);
CREATE INDEX IF NOT EXISTS idx_credit_obligations_budget ON credit_obligations(budget_id);
CREATE INDEX IF NOT EXISTS idx_emergency_funds_budget ON emergency_funds(budget_id);
CREATE INDEX IF NOT EXISTS idx_variable_expenses_budget ON variable_expenses(budget_id);
