// Seed script to create initial users in Turso
// Run with: bun run seed-users.js

const bcrypt = require('bcryptjs');
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:./db/local.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

async function seed() {
  const users = [
    {
      id: 'user-juni-001',
      email: 'jgonzalez96@gmail.com',
      name: 'Juni',
      password: 'Melo', // Will be hashed
    },
    {
      id: 'user-enrique-001',
      email: 'tvlinelive@gmail.com',
      name: 'Enrique',
      password: 'Mochi', // Will be hashed
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
