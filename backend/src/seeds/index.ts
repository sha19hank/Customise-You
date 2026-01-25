import dotenv from 'dotenv';
import { initializeDatabase, closeDatabaseConnection, pool } from '../config/database';
import { seedAdminUser } from './seed_admin';
import { seedCategories } from './seed_categories';
import { seedDemoData } from './seed_demo';

// Load environment variables
dotenv.config();

const runSeeds = async () => {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_ALLOW_PROD !== 'true') {
    throw new Error('Seeding is disabled in production. Set SEED_ALLOW_PROD=true to override.');
  }

  await initializeDatabase();

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@customiseyou.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
  const adminFirstName = process.env.SEED_ADMIN_FIRST_NAME || 'Platform';
  const adminLastName = process.env.SEED_ADMIN_LAST_NAME || 'Admin';

  console.log('🔹 Seeding admin user...');
  const adminResult = await seedAdminUser(pool, {
    email: adminEmail,
    password: adminPassword,
    firstName: adminFirstName,
    lastName: adminLastName,
  });
  console.log(adminResult);

  console.log('🔹 Seeding core categories...');
  const categoriesResult = await seedCategories(pool);
  console.log(categoriesResult);

  if (process.env.SEED_DEMO === 'true') {
    console.log('🔹 Seeding demo seller/products...');
    const demoResult = await seedDemoData(pool);
    console.log(demoResult);
  }

  await closeDatabaseConnection();
  console.log('✅ Seeding completed');
};

runSeeds().catch(async (error) => {
  console.error('❌ Seeding failed:', error);
  await closeDatabaseConnection();
  process.exit(1);
});
