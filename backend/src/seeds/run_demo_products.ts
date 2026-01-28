import dotenv from 'dotenv';
import { initializeDatabase, closeDatabaseConnection, pool } from '../config/database';
import { seedDemoProducts } from './seed_demo_products';

// Load environment variables
dotenv.config();

/**
 * Standalone runner for Etsy-style demo products seeding
 * Run with: npm run db:seed:demo-products
 */
const runDemoProductsSeed = async () => {
  try {
    console.log('🎨 Initializing Etsy-style demo products seeder...\n');

    await initializeDatabase();

    const result = await seedDemoProducts(pool);

    await closeDatabaseConnection();

    console.log('\n✅ Demo products seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Demo products seeding failed:', error);
    await closeDatabaseConnection();
    process.exit(1);
  }
};

runDemoProductsSeed();
