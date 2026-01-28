// backend/src/services/productService.ts - Product Management Service

import { Pool } from 'pg';

export interface ProductFilters {
  categoryId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'newest' | 'popular' | 'price_asc' | 'price_desc' | 'rating';
  customizableOnly?: boolean;
}

class ProductService {
  private db: Pool;

  constructor(dbPool: Pool) {
    this.db = dbPool;
  }

  /**
   * Get products with filters and pagination
   */
  async getProducts(filters: ProductFilters, page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;
      
      let whereConditions: string[] = ['p.status = $1'];
      const queryParams: any[] = ['active'];
      let paramCount = 2;

      // Category filter
      if (filters.categoryId) {
        whereConditions.push(`p.category_id = $${paramCount}`);
        queryParams.push(filters.categoryId);
        paramCount++;
      }

      // Search filter
      if (filters.search) {
        whereConditions.push(`(p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`);
        queryParams.push(`%${filters.search}%`);
        paramCount++;
      }

      // Price filters
      if (filters.minPrice !== undefined) {
        whereConditions.push(`p.final_price >= $${paramCount}`);
        queryParams.push(filters.minPrice);
        paramCount++;
      }

      if (filters.maxPrice !== undefined) {
        whereConditions.push(`p.final_price <= $${paramCount}`);
        queryParams.push(filters.maxPrice);
        paramCount++;
      }

      // Customizable only filter
      if (filters.customizableOnly) {
        whereConditions.push(`p.is_customizable = true`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Sort order
      const badgeBoost = `LEAST(0.05,
        (CASE
          WHEN s.badges ? 'FOUNDING_TIER_1' THEN 0.03
          WHEN s.badges ? 'FOUNDING_TIER_2' THEN 0.02
          WHEN s.badges ? 'FOUNDING_TIER_3' THEN 0.01
          ELSE 0
        END) +
        (CASE
          WHEN s.badges ? 'FIRST_50_ORDERS' THEN 0.01
          WHEN s.badges ? 'FIRST_10_ORDERS' THEN 0.01
          WHEN s.badges ? 'FIRST_ORDER' THEN 0.01
          ELSE 0
        END)
      )`;

      const levelBoost = `LEAST(0.03, COALESCE(s.level, 1) * 0.005)`;

      let orderBy = 'p.created_at DESC';
      switch (filters.sortBy) {
        case 'newest':
          orderBy = 'p.created_at DESC';
          break;
        case 'popular':
          orderBy = `((p.quantity_sold * 2 + p.views_count) * (1 + ${badgeBoost} + ${levelBoost})) DESC, p.created_at DESC`;
          break;
        case 'price_asc':
          orderBy = 'p.final_price ASC';
          break;
        case 'price_desc':
          orderBy = 'p.final_price DESC';
          break;
        case 'rating':
          orderBy = 'p.average_rating DESC';
          break;
      }

      // Count total products
      const countQuery = `
        SELECT COUNT(*) as total
        FROM products p
        ${whereClause}
      `;
      const countResult = await this.db.query(countQuery, queryParams);

      // Get products
      const productsQuery = `
        SELECT 
          p.*,
          s.business_name as seller_name,
          s.average_rating as seller_rating
        FROM products p
        LEFT JOIN sellers s ON p.seller_id = s.id
        ${whereClause}
        ORDER BY ${orderBy}
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;
      
      queryParams.push(limit, offset);
      const productsResult = await this.db.query(productsQuery, queryParams);

      return {
        data: productsResult.rows,
        total: parseInt(countResult.rows[0].total),
        page,
        limit,
        totalPages: Math.ceil(countResult.rows[0].total / limit),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch products: ${errorMessage}`);
    }
  }

  /**
   * Get product by ID with customizations
   */
  async getProductById(productId: string) {
    try {
      // Get product details - support both UUID and slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);
      const whereClause = isUUID ? 'p.id = $1' : 'p.slug = $1';
      
      const productResult = await this.db.query(
        `SELECT p.*, 
                s.id as seller_id, s.business_name as seller_name, 
                s.average_rating as seller_rating, s.total_orders as seller_total_orders
         FROM products p
         LEFT JOIN sellers s ON p.seller_id = s.id
         WHERE ${whereClause} AND p.status = 'active'`,
        [productId]
      );

      if (productResult.rows.length === 0) {
        throw new Error('Product not found');
      }

      const product = productResult.rows[0];

      // Get customization options (use product.id from DB result)
      const customizationsResult = await this.db.query(
        `SELECT * FROM customizations 
         WHERE product_id = $1
         ORDER BY display_order ASC`,
        [product.id]
      );

      // Get recent reviews (use product.id from DB result)
      const reviewsResult = await this.db.query(
        `SELECT r.*, u.first_name, u.last_name, u.profile_image_url
         FROM reviews r
         LEFT JOIN users u ON r.user_id = u.id
         WHERE r.product_id = $1 AND r.status = 'approved'
         ORDER BY r.created_at DESC
         LIMIT 5`,
        [product.id]
      );

      // Increment views count (use product.id from DB result)
      await this.db.query(
        'UPDATE products SET views_count = views_count + 1 WHERE id = $1',
        [product.id]
      );

      return {
        ...product,
        customizations: customizationsResult.rows,
        reviews: reviewsResult.rows,
        seller: {
          id: product.seller_id,
          business_name: product.seller_name,
          average_rating: product.seller_rating,
          total_orders: product.seller_total_orders,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch product: ${errorMessage}`);
    }
  }

  /**
   * Get all categories
   */
  async getCategories() {
    try {
      const result = await this.db.query(
        `SELECT * FROM categories 
         WHERE is_active = true
         ORDER BY level ASC, name ASC`
      );

      // Build hierarchy
      const categories = result.rows;
      const categoryMap = new Map();
      const rootCategories: any[] = [];

      // First pass: create map
      categories.forEach((cat: any) => {
        categoryMap.set(cat.id, { ...cat, subcategories: [] });
      });

      // Second pass: build hierarchy
      categories.forEach((cat: any) => {
        const category = categoryMap.get(cat.id);
        if (cat.parent_category_id) {
          const parent = categoryMap.get(cat.parent_category_id);
          if (parent) {
            parent.subcategories.push(category);
          }
        } else {
          rootCategories.push(category);
        }
      });

      return { data: rootCategories };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch categories: ${errorMessage}`);
    }
  }

  /**
   * Search products (simplified)
   */
  async searchProducts(query: string, page: number = 1, limit: number = 20) {
    try {
      return this.getProducts({ search: query }, page, limit);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Product search failed: ${errorMessage}`);
    }
  }

  /**
   * Create a new product
   */
  async createProduct(productData: {
    name: string;
    description: string;
    price: number;
    stock_quantity: number;
    category_id: string;
    seller_id: string;
    is_customizable: boolean;
  }) {
    try {
      const result = await this.db.query(
        `INSERT INTO products (name, description, base_price, final_price, stock_quantity, category_id, seller_id, is_customizable, status)
         VALUES ($1, $2, $3, $3, $4, $5, $6, $7, 'active')
         RETURNING *`,
        [
          productData.name,
          productData.description,
          productData.price,
          productData.stock_quantity,
          productData.category_id,
          productData.seller_id,
          productData.is_customizable,
        ]
      );

      return result.rows[0];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to create product: ${errorMessage}`);
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(productId: string, updates: {
    name?: string;
    description?: string;
    price?: number;
    stock_quantity?: number;
    category_id?: string;
    is_customizable?: boolean;
  }) {
    try {
      const updateFields: string[] = [];
      const queryParams: any[] = [];
      let paramCount = 1;

      if (updates.name !== undefined) {
        updateFields.push(`name = $${paramCount}`);
        queryParams.push(updates.name);
        paramCount++;
      }

      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramCount}`);
        queryParams.push(updates.description);
        paramCount++;
      }

      if (updates.price !== undefined) {
        updateFields.push(`base_price = $${paramCount}`);
        queryParams.push(updates.price);
        paramCount++;
        updateFields.push(`final_price = $${paramCount}`);
        queryParams.push(updates.price);
        paramCount++;
      }

      if (updates.stock_quantity !== undefined) {
        updateFields.push(`stock_quantity = $${paramCount}`);
        queryParams.push(updates.stock_quantity);
        paramCount++;
      }

      if (updates.category_id !== undefined) {
        updateFields.push(`category_id = $${paramCount}`);
        queryParams.push(updates.category_id);
        paramCount++;
      }

      if (updates.is_customizable !== undefined) {
        updateFields.push(`is_customizable = $${paramCount}`);
        queryParams.push(updates.is_customizable);
        paramCount++;
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      queryParams.push(productId);

      const result = await this.db.query(
        `UPDATE products 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramCount}
         RETURNING *`,
        queryParams
      );

      if (result.rows.length === 0) {
        throw new Error('Product not found');
      }

      return result.rows[0];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to update product: ${errorMessage}`);
    }
  }
}

export default ProductService;
