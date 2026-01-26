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
} from '@mui/material';
import { Product } from '@/types/product';
import Link from 'next/link';

interface ProductCardProps {
  product: Product;
  showAddToCart?: boolean;
}

export default function ProductCard({ product, showAddToCart = true }: ProductCardProps) {
  const imageUrl = product.image_url || product.images?.[0] || '/placeholder-product.jpg';
  const price = Number(product.base_price || 0);

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
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

          {showAddToCart && (
            <Button
              variant="contained"
              fullWidth
              size="small"
              disabled={product.status !== 'active' || product.stock_quantity === 0}
              onClick={(e) => {
                e.preventDefault();
                // Cart functionality to be implemented later
                alert('Cart feature coming soon!');
              }}
            >
              {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
