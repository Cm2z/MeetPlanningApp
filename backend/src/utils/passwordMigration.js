import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

export async function migrateLegacyPlaintextPasswords() {
  const [users] = await pool.execute(
    "SELECT id, password_hash FROM users WHERE password_hash NOT LIKE '$2a$%' AND password_hash NOT LIKE '$2b$%' AND password_hash NOT LIKE '$2y$%'"
  );
  for (const user of users) {
    const hash = await bcrypt.hash(String(user.password_hash || ''), 12);
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
  }
  if (users.length) console.log(`Migrated ${users.length} legacy password(s) to bcrypt.`);
}
