// backend/src/routes/product.routes.ts

import { Router, Request, Response, NextFunction } from 'express';
import ProductService from '../services/productService';
import { ValidationError } from '../middleware/errorHandler';
import { getDatabase } from '../config/database';

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

export default router;
