'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Button,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import { useRouter } from 'next/navigation';
import { useWishlist } from '@/context/WishlistContext';
import { productService } from '@/services/product.service';
import { Product } from '@/types/product';

export default function WishlistPage() {
  const router = useRouter();
  const { state, removeFromWishlist } = useWishlist();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch product details for wishlisted items
  useEffect(() => {
    const fetchWishlistProducts = async () => {
      if (state.items.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        
        // Fetch each product - in production, use a batch API endpoint
        const productPromises = state.items.map(id => 
          productService.getProductById(id).catch(() => null)
        );
        
        const fetchedProducts = await Promise.all(productPromises);
        const validProducts = fetchedProducts.filter((p): p is Product => p !== null);
        
        setProducts(validProducts);
      } catch (err) {
        console.error('Error fetching wishlist products:', err);
        setError('Failed to load wishlist items');
      } finally {
        setLoading(false);
      }
    };

    fetchWishlistProducts();
  }, [state.items]);

  const handleRemove = (productId: string) => {
    removeFromWishlist(productId);
  };

  const handleAddToCart = (productId: string) => {
    // Navigate to product details page where user can select customizations and add to cart
    router.push(`/products/${productId}`);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <FavoriteIcon sx={{ fontSize: 32, color: 'error.main' }} />
        <Typography variant="h4">
          My Wishlist
        </Typography>
        <Typography variant="body1" color="text.secondary">
          ({state.items.length} {state.items.length === 1 ? 'item' : 'items'})
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {state.items.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 2,
          }}
        >
          <FavoriteIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h5" gutterBottom color="text.secondary">
            Your wishlist is empty
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Save your favorite products to buy them later
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => router.push('/products')}
          >
            Browse Products
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {products.map((product) => (
            <Grid item xs={12} sm={6} md={4} key={product.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                {/* Remove from wishlist button */}
                <IconButton
                  onClick={() => handleRemove(product.id)}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 1,
                    bgcolor: 'rgba(255, 255, 255, 0.9)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 1)',
                    },
                  }}
                  aria-label="remove from wishlist"
                >
                  <DeleteIcon />
                </IconButton>

                <CardMedia
                  component="img"
                  height="200"
                  image={product.image_url || product.images?.[0] || '/placeholder-product.jpg'}
                  alt={product.name}
                  sx={{ objectFit: 'cover', cursor: 'pointer' }}
                  onClick={() => router.push(`/products/${product.id}`)}
                />

                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Typography
                    variant="h6"
                    component="h2"
                    sx={{
                      mb: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      cursor: 'pointer',
                      '&:hover': { color: 'primary.main' },
                    }}
                    onClick={() => router.push(`/products/${product.id}`)}
                  >
                    {product.name}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {product.description}
                  </Typography>

                  <Box sx={{ mt: 'auto' }}>
                    <Typography variant="h6" color="primary" sx={{ mb: 2 }}>
                      ₹{Number(product.base_price || 0).toLocaleString('en-IN')}
                    </Typography>

                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<ShoppingCartOutlinedIcon />}
                      onClick={() => handleAddToCart(product.id)}
                      disabled={product.status !== 'active' || product.stock_quantity === 0}
                    >
                      {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}
