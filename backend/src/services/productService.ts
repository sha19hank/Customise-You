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
      let orderBy = 'p.created_at DESC';
      switch (filters.sortBy) {
        case 'newest':
          orderBy = 'p.created_at DESC';
          break;
        case 'popular':
          orderBy = 'p.quantity_sold DESC, p.views_count DESC';
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
      // Get product details
      const productResult = await this.db.query(
        `SELECT p.*, 
                s.id as seller_id, s.business_name as seller_name, 
                s.average_rating as seller_rating, s.total_orders as seller_total_orders
         FROM products p
         LEFT JOIN sellers s ON p.seller_id = s.id
         WHERE p.id = $1 AND p.status = 'active'`,
        [productId]
      );

      if (productResult.rows.length === 0) {
        throw new Error('Product not found');
      }

      const product = productResult.rows[0];

      // Get customization options
      const customizationsResult = await this.db.query(
        `SELECT * FROM customizations 
         WHERE product_id = $1 AND is_active = true
         ORDER BY display_order ASC`,
        [productId]
      );

      // Get recent reviews
      const reviewsResult = await this.db.query(
        `SELECT r.*, u.first_name, u.last_name, u.profile_image_url
         FROM reviews r
         LEFT JOIN users u ON r.user_id = u.id
         WHERE r.product_id = $1 AND r.status = 'approved'
         ORDER BY r.created_at DESC
         LIMIT 5`,
        [productId]
      );

      // Increment view count
      await this.db.query(
        'UPDATE products SET views_count = views_count + 1 WHERE id = $1',
        [productId]
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
}

export default ProductService;
