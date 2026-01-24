import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Database Migration Runner
 * Executes SQL migration files in order and tracks migration history
 */

interface Migration {
  name: string;
  path: string;
  executed: boolean;
}

class MigrationRunner {
  private pool: Pool;
  private migrationsDir: string;

  constructor(pool: Pool) {
    this.pool = pool;
    this.migrationsDir = path.join(__dirname, 'migrations');
  }

  /**
   * Ensures migrations tracking table exists
   */
  private async ensureMigrationsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_migrations_name ON migrations(name);
    `;
    
    await this.pool.query(query);
    console.log('✓ Migrations tracking table ready');
  }

  /**
   * Gets list of all migration files
   */
  private getMigrationFiles(): string[] {
    if (!fs.existsSync(this.migrationsDir)) {
      throw new Error(`Migrations directory not found: ${this.migrationsDir}`);
    }

    return fs
      .readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort ensures order: 001_, 002_, etc.
  }

  /**
   * Gets list of executed migrations from database
   */
  private async getExecutedMigrations(): Promise<string[]> {
    const result = await this.pool.query<{ name: string }>(
      'SELECT name FROM migrations ORDER BY id'
    );
    return result.rows.map(row => row.name);
  }

  /**
   * Gets pending migrations to execute
   */
  private async getPendingMigrations(): Promise<Migration[]> {
    const allFiles = this.getMigrationFiles();
    const executed = await this.getExecutedMigrations();
    
    return allFiles.map(file => ({
      name: file,
      path: path.join(this.migrationsDir, file),
      executed: executed.includes(file)
    })).filter(m => !m.executed);
  }

  /**
   * Executes a single migration file
   */
  private async executeMigration(migration: Migration): Promise<void> {
    const sql = fs.readFileSync(migration.path, 'utf-8');
    
    console.log(`\n🔄 Running: ${migration.name}`);
    
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Execute the migration SQL
      await client.query(sql);
      
      // Record the migration
      await client.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [migration.name]
      );
      
      await client.query('COMMIT');
      console.log(`✓ Completed: ${migration.name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Run all pending migrations
   */
  async up(): Promise<void> {
    console.log('🚀 Starting database migrations...\n');
    
    await this.ensureMigrationsTable();
    const pending = await this.getPendingMigrations();
    
    if (pending.length === 0) {
      console.log('✓ No pending migrations. Database is up to date!\n');
      return;
    }
    
    console.log(`Found ${pending.length} pending migration(s):\n`);
    pending.forEach(m => console.log(`  - ${m.name}`));
    
    for (const migration of pending) {
      await this.executeMigration(migration);
    }
    
    console.log(`\n✅ Successfully executed ${pending.length} migration(s)!\n`);
  }

  /**
   * Show migration status
   */
  async status(): Promise<void> {
    await this.ensureMigrationsTable();
    
    const allFiles = this.getMigrationFiles();
    const executed = await this.getExecutedMigrations();
    
    console.log('\n📊 Migration Status:\n');
    console.log('=' .repeat(70));
    console.log('Status'.padEnd(12) + 'Migration');
    console.log('=' .repeat(70));
    
    allFiles.forEach(file => {
      const status = executed.includes(file) ? '✓ Executed' : '⏳ Pending';
      console.log(status.padEnd(12) + file);
    });
    
    console.log('=' .repeat(70));
    console.log(`\nTotal: ${allFiles.length} | Executed: ${executed.length} | Pending: ${allFiles.length - executed.length}\n`);
  }

  /**
   * Rollback last migration
   */
  async down(): Promise<void> {
    await this.ensureMigrationsTable();
    
    const result = await this.pool.query<{ name: string }>(
      'SELECT name FROM migrations ORDER BY id DESC LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      console.log('⚠️  No migrations to rollback\n');
      return;
    }
    
    const lastMigration = result.rows[0].name;
    
    console.log(`\n⚠️  Rolling back migration: ${lastMigration}`);
    console.log('Note: This will drop tables. Make sure you have backups!\n');
    
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Remove from migrations table
      await client.query('DELETE FROM migrations WHERE name = $1', [lastMigration]);
      
      await client.query('COMMIT');
      console.log(`✓ Rolled back: ${lastMigration}`);
      console.log('\n⚠️  Note: You need to manually drop the tables created by this migration.\n');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reset all migrations (DANGEROUS - drops everything)
   */
  async reset(): Promise<void> {
    console.log('\n⚠️  WARNING: This will DROP ALL TABLES and data!\n');
    
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Drop all tables
      const dropTablesQuery = `
        DROP TABLE IF EXISTS notifications CASCADE;
        DROP TABLE IF EXISTS cart_items CASCADE;
        DROP TABLE IF EXISTS wishlist_items CASCADE;
        DROP TABLE IF EXISTS payouts CASCADE;
        DROP TABLE IF EXISTS transactions CASCADE;
        DROP TABLE IF EXISTS messages CASCADE;
        DROP TABLE IF EXISTS reviews CASCADE;
        DROP TABLE IF EXISTS order_customizations CASCADE;
        DROP TABLE IF EXISTS order_items CASCADE;
        DROP TABLE IF EXISTS orders CASCADE;
        DROP TABLE IF EXISTS addresses CASCADE;
        DROP TABLE IF EXISTS customizations CASCADE;
        DROP TABLE IF EXISTS products CASCADE;
        DROP TABLE IF EXISTS categories CASCADE;
        DROP TABLE IF EXISTS sellers CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
        DROP TABLE IF EXISTS migrations CASCADE;
        
        -- Drop ENUM types
        DROP TYPE IF EXISTS user_status CASCADE;
        DROP TYPE IF EXISTS kyc_status CASCADE;
        DROP TYPE IF EXISTS seller_status CASCADE;
        DROP TYPE IF EXISTS product_status CASCADE;
        DROP TYPE IF EXISTS customization_type CASCADE;
        DROP TYPE IF EXISTS address_type CASCADE;
        DROP TYPE IF EXISTS order_status CASCADE;
        DROP TYPE IF EXISTS payment_status CASCADE;
        DROP TYPE IF EXISTS order_item_status CASCADE;
        DROP TYPE IF EXISTS review_status CASCADE;
        DROP TYPE IF EXISTS transaction_payment_status CASCADE;
        DROP TYPE IF EXISTS refund_status CASCADE;
        DROP TYPE IF EXISTS payout_status CASCADE;
      `;
      
      await client.query(dropTablesQuery);
      await client.query('COMMIT');
      
      console.log('✓ All tables and types dropped successfully\n');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

/**
 * CLI Entry Point
 */
async function main() {
  const command = process.argv[2] || 'up';
  
  // Create pool from environment variables
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'customiseyou',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20,
  });

  const runner = new MigrationRunner(pool);

  try {
    switch (command) {
      case 'up':
        await runner.up();
        break;
      case 'down':
        await runner.down();
        break;
      case 'status':
        await runner.status();
        break;
      case 'reset':
        await runner.reset();
        break;
      default:
        console.log('Usage: npm run migrate [up|down|status|reset]');
        console.log('  up     - Run all pending migrations (default)');
        console.log('  down   - Rollback last migration');
        console.log('  status - Show migration status');
        console.log('  reset  - Drop all tables (DANGEROUS)');
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export default MigrationRunner;
