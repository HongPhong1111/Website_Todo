const bcrypt = require('bcryptjs');

const { query, pool } = require('../config/db');

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@todo.local';
  const password = process.env.SEED_ADMIN_PASSWORD || 'admin123';

  const existed = await query('SELECT id FROM users WHERE email = :email LIMIT 1', { email });
  if (existed.length) {
    await query("UPDATE users SET role = 'admin', is_active = 1 WHERE email = :email", { email });
    // eslint-disable-next-line no-console
    console.log(`Admin already exists, promoted to admin: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await query(
    "INSERT INTO users (email, password_hash, full_name, provider, role) VALUES (:email, :passwordHash, :fullName, 'local', 'admin')",
    { email, passwordHash, fullName: 'Admin' }
  );

  // eslint-disable-next-line no-console
  console.log(`Created admin id=${result.insertId} email=${email} password=${password}`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await pool.end();
    } catch (e) {
      // ignore
    }
  });
