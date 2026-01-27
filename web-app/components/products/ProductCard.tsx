'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Box,
  Chip,
  IconButton,
} from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { Product } from '@/types/product';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWishlist } from '@/context/WishlistContext';

interface ProductCardProps {
  product: Product;
  showAddToCart?: boolean;
}

export default function ProductCard({ product, showAddToCart = true }: ProductCardProps) {
  const router = useRouter();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const imageUrl = product.image_url || product.images?.[0] || '/placeholder-product.jpg';
  const price = Number(product.base_price || 0);
  const wishlisted = isInWishlist(product.id);

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const handleCustomizeClick = () => {
    router.push(`/products/${product.id}`);
  };

  const handleBuyNowClick = () => {
    router.push(`/products/${product.id}`);
  };

  return (
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
      {/* Wishlist Heart Icon */}
      <IconButton
        onClick={handleWishlistClick}
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
        aria-label="add to wishlist"
      >
        {wishlisted ? (
          <FavoriteIcon sx={{ color: 'error.main' }} />
        ) : (
          <FavoriteBorderIcon />
        )}
      </IconButton>
      <Link href={`/products/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <CardMedia
          component="img"
          height="200"
          image={imageUrl}
          alt={product.name}
          sx={{ objectFit: 'cover', cursor: 'pointer' }}
        />
      </Link>

      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Link href={`/products/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <Typography
            gutterBottom
            variant="h6"
            component="h2"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              cursor: 'pointer',
              '&:hover': { color: 'primary.main' },
            }}
          >
            {product.name}
          </Typography>
        </Link>

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
          {product.is_customizable && (
            <Chip
              label="Customizable"
              size="small"
              color="primary"
              variant="outlined"
              sx={{ mb: 1 }}
            />
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" color="primary">
              ₹{price.toLocaleString('en-IN')}
            </Typography>
            {product.stock_quantity !== undefined && product.stock_quantity < 10 && product.stock_quantity > 0 && (
              <Typography variant="caption" color="warning.main">
                Only {product.stock_quantity} left
              </Typography>
            )}
          </Box>

          {/* 
            Product listing buttons: 
            - No direct "Add to Cart" because products require customization selection
            - "Customize & Add" and "Buy Now" both navigate to product details page
            - User must select customizations before adding to cart (Myntra-style UX)
          */}
          {showAddToCart && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                fullWidth
                size="small"
                disabled={product.status !== 'active' || product.stock_quantity === 0}
                onClick={handleCustomizeClick}
                sx={{ flex: 1 }}
              >
                {product.stock_quantity === 0 ? 'Out of Stock' : 'Customize & Add'}
              </Button>
              {product.stock_quantity !== 0 && product.status === 'active' && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleBuyNowClick}
                  sx={{ minWidth: '90px' }}
                >
                  Buy Now
                </Button>
              )}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
