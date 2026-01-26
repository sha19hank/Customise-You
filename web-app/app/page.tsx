'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { productService } from '@/services/product.service';
import { Product, Category } from '@/types/product';
import ProductCard from '@/components/products/ProductCard';
import Link from 'next/link';

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch featured products (limit 8) and categories in parallel
        const [productsData, categoriesData] = await Promise.all([
          productService.getProducts({ sortBy: 'newest' }, 1, 8),
          productService.getCategories(),
        ]);

        setFeaturedProducts(productsData.data);
        setCategories(categoriesData.slice(0, 6)); // Show max 6 categories
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError('Failed to load products. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <Container maxWidth="lg">
      {/* Hero Section */}
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          py: 8,
        }}
      >
        <Typography variant="h1" gutterBottom sx={{ fontSize: { xs: '2.5rem', md: '3.5rem' } }}>
          Welcome to CustomiseYou
        </Typography>
        <Typography variant="h5" color="text.secondary" sx={{ mb: 4, maxWidth: 700 }}>
          Discover and customize unique products from talented sellers around the world
        </Typography>

        {isAuthenticated ? (
          <Box>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Hello, {user?.firstName || user?.email}! 👋
            </Typography>
            <Button
              variant="contained"
              size="large"
              component={Link}
              href="/products"
            >
              Browse Products
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              component={Link}
              href="/register"
            >
              Get Started
            </Button>
            <Button
              variant="outlined"
              size="large"
              component={Link}
              href="/login"
            >
              Sign In
            </Button>
          </Box>
        )}
      </Box>

      {/* Featured Products Section */}
      <Box sx={{ py: 6 }}>
        <Typography variant="h3" gutterBottom sx={{ mb: 4 }}>
          Featured Products
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        ) : featuredProducts.length > 0 ? (
          <>
            <Grid container spacing={3}>
              {featuredProducts.map((product) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                  <ProductCard product={product} showAddToCart={false} />
                </Grid>
              ))}
            </Grid>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Button
                variant="outlined"
                size="large"
                component={Link}
                href="/products"
              >
                View All Products
              </Button>
            </Box>
          </>
        ) : (
          <Alert severity="info">No products available at the moment.</Alert>
        )}
      </Box>

      {/* Categories Section */}
      {categories.length > 0 && (
        <Box sx={{ py: 6 }}>
          <Typography variant="h3" gutterBottom sx={{ mb: 4 }}>
            Shop by Category
          </Typography>
          <Grid container spacing={3}>
            {categories.map((category) => (
              <Grid item xs={12} sm={6} md={4} key={category.id}>
                <Card
                  component={Link}
                  href={`/products?category=${category.id}`}
                  sx={{
                    textDecoration: 'none',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="h5" gutterBottom>
                      {category.name}
                    </Typography>
                    {category.description && (
                      <Typography variant="body2" color="text.secondary">
                        {category.description}
                      </Typography>
                    )}
                    {category.product_count !== undefined && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {category.product_count} products
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Container>
  );
}
