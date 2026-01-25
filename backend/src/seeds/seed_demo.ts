import bcryptjs from 'bcryptjs';
import { Pool } from 'pg';

export const seedDemoData = async (db: Pool) => {
  const demoEmail = 'seller.demo@customiseyou.com';

  const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [demoEmail]);
  let userId: string;

  if (existingUser.rows.length === 0) {
    const hashedPassword = await bcryptjs.hash('Demo@12345', 12);
    const userInsert = await db.query(
      `INSERT INTO users (email, first_name, last_name, password_hash, status, role, email_verified, registration_source)
       VALUES ($1, $2, $3, $4, 'active', 'seller', true, 'seed')
       RETURNING id`,
      [demoEmail, 'Demo', 'Seller', hashedPassword]
    );
    userId = userInsert.rows[0].id;
  } else {
    userId = existingUser.rows[0].id;
  }

  const sellerExists = await db.query('SELECT id FROM sellers WHERE user_id = $1', [userId]);
  let sellerId: string;

  if (sellerExists.rows.length === 0) {
    const sellerInsert = await db.query(
      `INSERT INTO sellers (user_id, business_name, business_email, kyc_status, status)
       VALUES ($1, $2, $3, 'verified', 'active')
       RETURNING id`,
      [userId, 'Demo Studio', demoEmail]
    );
    sellerId = sellerInsert.rows[0].id;
  } else {
    sellerId = sellerExists.rows[0].id;
  }

  const category = await db.query('SELECT id FROM categories WHERE slug = $1', ['art-crafts']);
  if (category.rows.length === 0) {
    return { created: false, message: 'Categories missing, skipping demo products' };
  }

  const categoryId = category.rows[0].id;

  const demoProducts = [
    {
      name: 'Custom Hand-Painted Mug',
      slug: 'custom-hand-painted-mug',
      base_price: 25.0,
      final_price: 25.0,
      quantity_available: 100,
      is_customizable: true,
    },
    {
      name: 'Personalized Canvas Art',
      slug: 'personalized-canvas-art',
      base_price: 60.0,
      final_price: 60.0,
      quantity_available: 50,
      is_customizable: true,
    },
  ];

  let createdCount = 0;
  for (const product of demoProducts) {
    const insert = await db.query(
      `INSERT INTO products (
        seller_id, category_id, name, slug, base_price, final_price,
        quantity_available, is_customizable, status, currency
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', 'USD')
      ON CONFLICT (slug) DO NOTHING
      RETURNING id`,
      [
        sellerId,
        categoryId,
        product.name,
        product.slug,
        product.base_price,
        product.final_price,
        product.quantity_available,
        product.is_customizable,
      ]
    );

    if (insert.rows.length > 0) {
      createdCount += 1;
    }
  }

  return { created: true, productsCreated: createdCount };
};
