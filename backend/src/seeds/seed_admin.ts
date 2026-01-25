import bcryptjs from 'bcryptjs';
import { Pool } from 'pg';

interface SeedAdminConfig {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

const ensureRoleColumn = async (db: Pool) => {
  const columnCheck = await db.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_name = 'users' AND column_name = 'role' LIMIT 1`
  );

  if (columnCheck.rows.length === 0) {
    await db.query(`ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'`);
  }
};

export const seedAdminUser = async (db: Pool, config: SeedAdminConfig) => {
  await ensureRoleColumn(db);

  const existing = await db.query('SELECT id FROM users WHERE email = $1', [config.email]);
  if (existing.rows.length > 0) {
    return { created: false, message: 'Admin user already exists' };
  }

  const hashedPassword = await bcryptjs.hash(config.password, 12);

  const result = await db.query(
    `INSERT INTO users (email, first_name, last_name, password_hash, status, role, email_verified, registration_source)
     VALUES ($1, $2, $3, $4, 'active', 'admin', true, 'seed')
     RETURNING id, email, first_name, last_name, role`,
    [config.email, config.firstName, config.lastName, hashedPassword]
  );

  return { created: true, user: result.rows[0] };
};
