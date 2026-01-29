// backend/src/routes/product.routes.ts

import { Router, Request, Response, NextFunction } from 'express';
import ProductService from '../services/productService';
import { ValidationError } from '../middleware/errorHandler';
import { getDatabase } from '../config/database';
import { requireAuth, requireRole } from '../middleware/authMiddleware';

const router = Router();

/**
 * GET /products - Get products with filters
 */
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await getDatabase();
      const productService = new ProductService(db);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const filters = {
        categoryId: req.query.category_id as string,
        search: req.query.search as string,
        minPrice: req.query.min_price ? parseFloat(req.query.min_price as string) : undefined,
        maxPrice: req.query.max_price ? parseFloat(req.query.max_price as string) : undefined,
        sortBy: req.query.sort_by as 'newest' | 'popular' | 'price_asc' | 'price_desc' | 'rating',
        customizableOnly: req.query.customizable_only === 'true',
      };

      const products = await productService.getProducts(filters, page, limit);

      res.status(200).json({
        success: true,
        data: products.data,
        pagination: {
          total: products.total,
          page: products.page,
          limit: products.limit,
          totalPages: products.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /products/search - Search products
 */
router.get(
  '/search',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await getDatabase();
      const productService = new ProductService(db);
      const query = req.query.q as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!query) {
        throw new ValidationError('Search query is required');
      }

      const products = await productService.searchProducts(query, page, limit);

      res.status(200).json({
        success: true,
        data: products.data,
        pagination: {
          total: products.total,
          page: products.page,
          limit: products.limit,
          totalPages: products.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /categories - Get all categories
 */
router.get(
  '/categories',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await getDatabase();
      const productService = new ProductService(db);
      const categories = await productService.getCategories();

      res.status(200).json({
        success: true,
        data: categories.data,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /products/:id - Get product details
 */
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await getDatabase();
      const productService = new ProductService(db);
      const { id } = req.params;

      if (!id) {
        throw new ValidationError('Product ID is required');
      }

      const product = await productService.getProductById(id);

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /products - Create a new product (seller only)
 */
router.post(
  '/',
  requireAuth,
  requireRole('seller', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await getDatabase();
      const productService = new ProductService(db);
      const { name, description, price, stock_quantity, category_id, seller_id, is_customizable } = req.body;

      if (!name || !description || !price || !stock_quantity || !category_id || !seller_id) {
        throw new ValidationError('Missing required fields');
      }

      // Check KYC status before allowing product creation
      const kycData = await db.query(
        'SELECT status FROM seller_kyc WHERE user_id = $1',
        [seller_id]
      );

      if (kycData.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'KYC verification required. Please complete KYC to list products.',
            code: 'KYC_NOT_SUBMITTED',
          },
        });
      }

      if (kycData.rows[0].status !== 'approved') {
        return res.status(403).json({
          success: false,
          error: {
            message: `KYC verification ${kycData.rows[0].status}. You cannot list products until KYC is approved.`,
            code: 'KYC_NOT_APPROVED',
            status: kycData.rows[0].status,
          },
        });
      }

      const newProduct = await productService.createProduct({
        name,
        description,
        price,
        stock_quantity,
        category_id,
        seller_id,
        is_customizable: is_customizable || false,
      });

      res.status(201).json({
        success: true,
        data: newProduct,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /products/:id - Update a product (seller only)
 */
router.put(
  '/:id',
  requireAuth,
  requireRole('seller', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await getDatabase();
      const productService = new ProductService(db);
      const { id } = req.params;
      const { name, description, price, stock_quantity, category_id, is_customizable } = req.body;

      if (!id) {
        throw new ValidationError('Product ID is required');
      }

      const updatedProduct = await productService.updateProduct(id, {
        name,
        description,
        price,
        stock_quantity,
        category_id,
        is_customizable,
      });

      res.status(200).json({
        success: true,
        data: updatedProduct,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
