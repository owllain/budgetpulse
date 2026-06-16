// Seed script to create the demo user in Turso
// Run with: bun run seed-users.js

const bcrypt = require('bcryptjs');
const { createClient } = require('@libsql/client');

const tursoUrl = process.env.TURSO_DATABASE_URL || 'file:./db/local.db'
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN || undefined

if (tursoUrl.startsWith('libsql://') && !tursoAuthToken) {
  throw new Error('TURSO_AUTH_TOKEN is required to seed a remote Turso database.')
}

const turso = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken,
});

async function seed() {
  const users = [
    {
      id: 'user-enrique-001',
      email: 'tvlinelive@gmail.com',
      name: 'Enrique',
      password: 'Melo', // Will be hashed
    },
  ];

  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 12);
    await turso.execute({
      sql: `INSERT OR IGNORE INTO users (id, email, name, password_hash, role, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'user', datetime('now'), datetime('now'))`,
      args: [user.id, user.email, user.name, hash],
    });
    console.log(`✓ User ${user.name} (${user.email}) created`);
  }

  console.log('Seed complete!');
}

seed().catch(console.error);
