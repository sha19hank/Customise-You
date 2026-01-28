import bcryptjs from 'bcryptjs';
import { Pool } from 'pg';

/**
 * 🎨 ETSY-STYLE DEMO DATA SEEDER
 * 
 * Creates realistic, production-ready demo data for development/demo environments.
 * This is NOT temporary test junk - it's crafted to showcase the platform's capabilities.
 * 
 * Seeded entities:
 * - 2 Sellers (Etsy-style artisan profiles)
 * - 3 Categories (Art & Decor, Gifts, Accessories)
 * - 3 Products (2 customizable, 1 non-customizable)
 * - Customization options for customizable products
 * 
 * Safety: All inserts are idempotent (ON CONFLICT DO NOTHING)
 * Currency: INR (Indian market)
 */

interface DemoSeller {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  businessName: string;
  businessDescription: string;
  city: string;
  state: string;
  country: string;
  level: number;
  experiencePoints: number;
  badges: string[];
}

interface DemoCategory {
  name: string;
  slug: string;
  displayOrder: number;
}

interface DemoProduct {
  name: string;
  slug: string;
  description: string;
  detailedDescription: string;
  basePrice: number;
  finalPrice: number;
  quantityAvailable: number;
  isCustomizable: boolean;
  categorySlug: string;
  sellerEmail: string;
  mainImageUrl?: string;
  attributes?: Record<string, any>;
}

interface DemoCustomization {
  productSlug: string;
  type: 'text' | 'color' | 'size' | 'material';
  label: string;
  description: string;
  isRequired: boolean;
  inputType: 'text' | 'textarea' | 'select';
  allowedValues?: string[];
  displayOrder: number;
  priceAdjustment?: number;
}

export const seedDemoProducts = async (db: Pool) => {
  console.log('🎨 Starting Etsy-style demo data seeding...');

  // ========================================
  // 1️⃣ SELLERS - Artisan Profiles
  // ========================================
  const sellers: DemoSeller[] = [
    {
      email: 'ananya@ananayarts.in',
      firstName: 'Ananya',
      lastName: 'Sharma',
      password: 'Seller@123',
      businessName: 'Ananya Arts',
      businessDescription: 'Handcrafted wall art and personalized home decor from the heart of Jaipur. Each piece tells a story of traditional Indian craftsmanship blended with modern aesthetics.',
      city: 'Jaipur',
      state: 'Rajasthan',
      country: 'India',
      level: 3,
      experiencePoints: 1250,
      badges: ['FOUNDING_SELLER'],
    },
    {
      email: 'studio@claycraft.in',
      firstName: 'Rajesh',
      lastName: 'Patel',
      password: 'Seller@123',
      businessName: 'Studio Claycraft',
      businessDescription: 'Authentic handmade ceramics and pottery from Odisha. Every mug, vase, and bowl is wheel-thrown and hand-glazed with love.',
      city: 'Bhubaneswar',
      state: 'Odisha',
      country: 'India',
      level: 2,
      experiencePoints: 680,
      badges: [],
    },
  ];

  const sellerIds: Record<string, string> = {};

  for (const seller of sellers) {
    // Check if user exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [seller.email]);
    let userId: string;

    if (existingUser.rows.length === 0) {
      const hashedPassword = await bcryptjs.hash(seller.password, 12);
      const userInsert = await db.query(
        `INSERT INTO users (email, first_name, last_name, password_hash, status, role, email_verified, registration_source)
         VALUES ($1, $2, $3, $4, 'active', 'seller', true, 'demo_seed')
         RETURNING id`,
        [seller.email, seller.firstName, seller.lastName, hashedPassword]
      );
      userId = userInsert.rows[0].id;
      console.log(`✅ Created user: ${seller.email}`);
    } else {
      userId = existingUser.rows[0].id;
      console.log(`⏭️  User exists: ${seller.email}`);
    }

    // Check if seller profile exists
    const sellerExists = await db.query('SELECT id FROM sellers WHERE user_id = $1', [userId]);
    let sellerId: string;

    if (sellerExists.rows.length === 0) {
      const sellerInsert = await db.query(
        `INSERT INTO sellers (
          user_id, business_name, business_email, business_description,
          city, state, country, kyc_status, status, level, experience_points, badges
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'verified', 'active', $8, $9, $10)
        RETURNING id`,
        [
          userId,
          seller.businessName,
          seller.email,
          seller.businessDescription,
          seller.city,
          seller.state,
          seller.country,
          seller.level,
          seller.experiencePoints,
          JSON.stringify(seller.badges),
        ]
      );
      sellerId = sellerInsert.rows[0].id;
      console.log(`✅ Created seller: ${seller.businessName} (Level ${seller.level})`);
    } else {
      sellerId = sellerExists.rows[0].id;
      console.log(`⏭️  Seller exists: ${seller.businessName}`);
    }

    sellerIds[seller.email] = sellerId;
  }

  // ========================================
  // 2️⃣ CATEGORIES - Etsy-style
  // ========================================
  const categories: DemoCategory[] = [
    { name: 'Art & Decor', slug: 'art-decor', displayOrder: 1 },
    { name: 'Gifts', slug: 'gifts', displayOrder: 2 },
    { name: 'Accessories', slug: 'accessories', displayOrder: 3 },
  ];

  const categoryIds: Record<string, string> = {};

  for (const category of categories) {
    const result = await db.query(
      `INSERT INTO categories (name, slug, is_active, display_order)
       VALUES ($1, $2, true, $3)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [category.name, category.slug, category.displayOrder]
    );
    categoryIds[category.slug] = result.rows[0].id;
    console.log(`✅ Category ready: ${category.name}`);
  }

  // ========================================
  // 3️⃣ PRODUCTS - Etsy-inspired Listings
  // ========================================
  const products: DemoProduct[] = [
    // Customizable Product #1
    {
      name: 'Custom Name Wall Art',
      slug: 'custom-name-wall-art',
      description: 'Personalized wooden name sign for your home. Perfect for nurseries, entryways, or as a gift.',
      detailedDescription: `✨ Make your space uniquely yours with our handcrafted wooden name signs!

🎨 What makes it special:
- Hand-painted by skilled artisans in Jaipur
- Premium Sheesham wood with smooth finish
- Weather-resistant paint for longevity
- Comes ready to hang with mounting hardware

📐 Customization Options:
- Choose your name (up to 12 characters)
- Select from 3 sizes
- Pick your favorite color scheme

Perfect for: Nurseries, bedrooms, housewarming gifts, weddings

⏱️ Production time: 5-7 business days
📦 Ships carefully wrapped from Jaipur, India`,
      basePrice: 899,
      finalPrice: 899,
      quantityAvailable: 50,
      isCustomizable: true,
      categorySlug: 'art-decor',
      sellerEmail: 'ananya@ananayarts.in',
      mainImageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca',
      attributes: {
        material: 'Sheesham Wood',
        finish: 'Hand-painted',
        madeIn: 'India',
        artisanMade: true,
      },
    },

    // Customizable Product #2
    {
      name: 'Hand-painted Phone Case',
      slug: 'hand-painted-phone-case',
      description: 'One-of-a-kind hand-painted phone case. Each piece is unique and crafted just for you.',
      detailedDescription: `📱 Protect your phone in style with our hand-painted cases!

🖌️ Artisan Details:
- Each case is hand-painted individually
- No two cases are exactly alike
- Uses high-quality acrylic paints
- Sealed with protective matte finish

🛡️ Protection Features:
- Shock-absorbent TPU material
- Raised edges protect screen & camera
- Precise cutouts for all ports
- Wireless charging compatible

🎨 Choose Your Style:
- Select your phone model
- Pick from 8 vibrant color themes
- Custom requests welcome!

Made with love in Jaipur ❤️
Processing: 3-4 days | Ships India-wide`,
      basePrice: 599,
      finalPrice: 599,
      quantityAvailable: 100,
      isCustomizable: true,
      categorySlug: 'accessories',
      sellerEmail: 'ananya@ananayarts.in',
      mainImageUrl: 'https://images.unsplash.com/photo-1556656793-08538906a9f8',
      attributes: {
        material: 'TPU Plastic',
        finish: 'Hand-painted, Matte',
        madeIn: 'India',
        artisanMade: true,
      },
    },

    // Non-customizable Product
    {
      name: 'Handmade Ceramic Mug',
      slug: 'handmade-ceramic-mug',
      description: 'Rustic handmade ceramic coffee mug. Perfect for your morning brew.',
      detailedDescription: `☕ Start your day with our artisan-crafted ceramic mug!

🏺 Craftsmanship:
- 100% wheel-thrown by hand
- Unique natural glaze patterns
- Each mug is one-of-a-kind
- Food-safe, lead-free glaze

📏 Specifications:
- Capacity: 350ml (12oz)
- Height: 9cm, Diameter: 8cm
- Microwave & dishwasher safe
- Comfortable C-handle grip

🎁 Perfect For:
- Coffee & tea lovers
- Housewarming gifts
- Daily use or display
- Supporting local artisans

Made in Bhubaneswar, Odisha by Studio Claycraft
🌿 Eco-friendly, sustainable pottery

Note: Due to handmade nature, slight variations in size, shape, and glaze are normal and add to the charm!`,
      basePrice: 399,
      finalPrice: 399,
      quantityAvailable: 75,
      isCustomizable: false,
      categorySlug: 'gifts',
      sellerEmail: 'studio@claycraft.in',
      mainImageUrl: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d',
      attributes: {
        material: 'Ceramic',
        finish: 'Glazed',
        capacity: '350ml',
        madeIn: 'India',
        artisanMade: true,
        dishwasherSafe: true,
        microwaveSafe: true,
      },
    },
  ];

  const productIds: Record<string, string> = {};

  for (const product of products) {
    const result = await db.query(
      `INSERT INTO products (
        seller_id, category_id, name, slug, description, detailed_description,
        base_price, final_price, quantity_available, is_customizable,
        status, currency, main_image_url, attributes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', 'INR', $11, $12)
      ON CONFLICT (slug) DO UPDATE SET
        description = EXCLUDED.description,
        detailed_description = EXCLUDED.detailed_description,
        base_price = EXCLUDED.base_price,
        final_price = EXCLUDED.final_price,
        quantity_available = EXCLUDED.quantity_available
      RETURNING id`,
      [
        sellerIds[product.sellerEmail],
        categoryIds[product.categorySlug],
        product.name,
        product.slug,
        product.description,
        product.detailedDescription,
        product.basePrice,
        product.finalPrice,
        product.quantityAvailable,
        product.isCustomizable,
        product.mainImageUrl,
        JSON.stringify(product.attributes),
      ]
    );
    productIds[product.slug] = result.rows[0].id;
    console.log(`✅ Product ready: ${product.name} (₹${product.basePrice})`);
  }

  // ========================================
  // 4️⃣ CUSTOMIZATION OPTIONS
  // ========================================
  const customizations: DemoCustomization[] = [
    // Custom Name Wall Art customizations
    {
      productSlug: 'custom-name-wall-art',
      type: 'text',
      label: 'Name',
      description: 'Enter the name you want on your wall art (max 12 characters)',
      isRequired: true,
      inputType: 'text',
      displayOrder: 1,
    },
    {
      productSlug: 'custom-name-wall-art',
      type: 'size',
      label: 'Size',
      description: 'Choose your preferred size',
      isRequired: true,
      inputType: 'select',
      allowedValues: ['Small (8x4 inches)', 'Medium (12x6 inches)', 'Large (16x8 inches)'],
      displayOrder: 2,
      priceAdjustment: 0, // Base price for Small, Medium +200, Large +400
    },
    {
      productSlug: 'custom-name-wall-art',
      type: 'color',
      label: 'Color Theme',
      description: 'Select your color preference',
      isRequired: true,
      inputType: 'select',
      allowedValues: [
        'Natural Wood',
        'White & Gold',
        'Navy Blue & Silver',
        'Pastel Pink',
        'Mint Green',
        'Black & White',
      ],
      displayOrder: 3,
    },

    // Hand-painted Phone Case customizations
    {
      productSlug: 'hand-painted-phone-case',
      type: 'text',
      label: 'Phone Model',
      description: 'Specify your exact phone model (e.g., iPhone 14 Pro, Samsung S23)',
      isRequired: true,
      inputType: 'text',
      displayOrder: 1,
    },
    {
      productSlug: 'hand-painted-phone-case',
      type: 'color',
      label: 'Color Theme',
      description: 'Choose your favorite color scheme',
      isRequired: false,
      inputType: 'select',
      allowedValues: [
        'Sunset Orange',
        'Ocean Blue',
        'Forest Green',
        'Lavender Purple',
        'Rose Gold',
        'Monochrome Black',
        'Bohemian Multi',
        'Pastel Rainbow',
      ],
      displayOrder: 2,
    },
  ];

  for (const custom of customizations) {
    // Check if customization already exists
    const existingCustom = await db.query(
      `SELECT id FROM customizations 
       WHERE product_id = $1 AND type = $2 AND label = $3`,
      [productIds[custom.productSlug], custom.type, custom.label]
    );

    if (existingCustom.rows.length === 0) {
      await db.query(
        `INSERT INTO customizations (
          product_id, type, label, description, is_required,
          input_type, allowed_values, display_order, price_adjustment
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          productIds[custom.productSlug],
          custom.type,
          custom.label,
          custom.description,
          custom.isRequired,
          custom.inputType,
          custom.allowedValues ? JSON.stringify(custom.allowedValues) : null,
          custom.displayOrder,
          custom.priceAdjustment || 0,
        ]
      );
    }
    console.log(`  ↳ Customization: ${custom.label} (${custom.type})`);
  }

  console.log('\n✨ Demo data seeding complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Summary:');
  console.log(`   Sellers: ${sellers.length}`);
  console.log(`   Categories: ${categories.length}`);
  console.log(`   Products: ${products.length}`);
  console.log(`   Customizations: ${customizations.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🛍️  Ready for E2E testing and demo purposes!');

  return {
    success: true,
    sellers: sellers.length,
    categories: categories.length,
    products: products.length,
    customizations: customizations.length,
  };
};
