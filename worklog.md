---
Task ID: 1
Agent: main
Task: Build BudgetPulse v2 - Full app rebuild with auth, BCCR API, user-scoped data

Work Log:
- Created v2 Turso DB schema with users, budgets, income_items, expense_items, savings_goals, exchange_rates tables
- Seeded local SQLite DB with two users (jgonzalez96@gmail.com/Juni, tvlinelive@gmail.com/Enrique)
- Built NextAuth credentials authentication with bcrypt password hashing
- Built registration endpoint with password validation (uppercase, lowercase, numbers, special chars, 4-16 chars)
- Registration sends notification email to alvaro.cascante.m@cpic.cr
- Updated BCCR API integration from SOAP to REST API (apim.bccr.fi.cr/SDDE)
- BCCR uses Bearer token auth, indicadores 317 (compra) and 318 (venta)
- Built complete dark OLED + glassmorphism UI with collapsible sidebar
- Created all pages: Dashboard, Presupuesto, Calculadoras (Loan, CC, BP, Net Salary), Aguinaldo, Metas, Consejos, Config
- Implemented DebitCard component with flip animation and health-score-based gradient
- Implemented Recharts charts (Expense Donut, Income vs Expense Bar)
- Implemented Health Score gauge (0-100)
- User-scoped data: all budgets/goals filtered by userId
- Footer: "Hecho por @enrique-cascante on LinkedIn"
- All API endpoints tested and working (budgets CRUD, goals CRUD, calculators, aguinaldo, exchange-rate)
- Auth tested: password comparison verified for both users
- Lint passes clean

Stage Summary:
- App renamed to BudgetPulse
- Full auth system with login/register
- BCCR REST API integration (requires BCCR_API_TOKEN env var)
- Email corrected to alvaro.cascante.m@cpic.cr
- All pages functional via SPA with sidebar navigation
- Server runs on port 3000, returns 200
