import { Pool } from 'pg';

const baseCategories = [
  { name: 'Art & Crafts', slug: 'art-crafts', displayOrder: 1 },
  { name: 'Fashion', slug: 'fashion', displayOrder: 2 },
  { name: 'Home Decor', slug: 'home-decor', displayOrder: 3 },
  { name: 'Accessories', slug: 'accessories', displayOrder: 4 },
  { name: 'Personalized Gifts', slug: 'personalized-gifts', displayOrder: 5 },
];

export const seedCategories = async (db: Pool) => {
  const inserted: string[] = [];

  for (const category of baseCategories) {
    const result = await db.query(
      `INSERT INTO categories (name, slug, is_active, display_order)
       VALUES ($1, $2, true, $3)
       ON CONFLICT (slug) DO NOTHING
       RETURNING id`,
      [category.name, category.slug, category.displayOrder]
    );

    if (result.rows.length > 0) {
      inserted.push(category.name);
    }
  }

  return {
    inserted,
    total: baseCategories.length,
  };
};
