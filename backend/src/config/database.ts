// backend/src/config/database.ts - PostgreSQL Database Configuration

import { Pool, PoolClient } from 'pg';

let pool: Pool;

export async function initializeDatabase(): Promise<Pool> {
  if (pool) {
    return pool;
  }

  const databaseUrl = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/customiseyou';

  pool = new Pool({
    connectionString: databaseUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err: Error) => {
    console.error('Unexpected error on idle client', err);
  });

  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✓ Database connection established successfully');
  } catch (error) {
    console.error('✗ Failed to connect to database:', error);
    throw error;
  }

  return pool;
}

export async function getDatabase(): Promise<Pool> {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return pool;
}

export async function closeDatabaseConnection(): Promise<void> {
  if (pool) {
    await pool.end();
    console.log('✓ Database connection closed');
  }
}

export async function query(text: string, params?: unknown[]): Promise<any> {
  const db = await getDatabase();
  return db.query(text, params);
}

export async function getClient(): Promise<PoolClient> {
  const db = await getDatabase();
  return db.connect();
}
