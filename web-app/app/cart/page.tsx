'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  TextField,
  Divider,
  Alert,
  Paper,
  Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useCart } from '@/context/CartContext';
import { useNotification } from '@/context/NotificationContext';

export default function CartPage() {
  const router = useRouter();
  const { state, removeItem, updateQuantity, clearCart, getItemKey } = useCart();
  const { showToast } = useNotification();

  const handleQuantityChange = (productId: string, customizationKey: string, newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= 99) {
      updateQuantity(productId, customizationKey, newQuantity);
    }
  };

  const handleRemoveItem = (productId: string, customizationKey: string) => {
    if (confirm('Remove this item from cart?')) {
      removeItem(productId, customizationKey);
      showToast('Item removed from cart', 'info');
    }
  };

  const handleClearCart = () => {
    if (confirm('Clear all items from cart?')) {
      clearCart();
      showToast('Cart cleared', 'info');
    }
  };

  if (state.items.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <ShoppingCartIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Your cart is empty
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Add some products to get started!
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => router.push('/products')}
            sx={{ mt: 2 }}
          >
            Browse Products
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => router.back()}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">
            Shopping Cart ({state.totalItems} {state.totalItems === 1 ? 'item' : 'items'})
          </Typography>
        </Box>
        {state.items.length > 0 && (
          <Button
            variant="outlined"
            color="error"
            onClick={handleClearCart}
          >
            Clear Cart
          </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Cart Items */}
        <Grid item xs={12} md={8}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {state.items.map((item) => {
              const itemKey = getItemKey(item.productId, item.selectedCustomizations);
              
              return (
                <Card key={itemKey} variant="outlined">
                  <CardContent>
                    <Grid container spacing={2}>
                      {/* Product Image */}
                      <Grid item xs={12} sm={3}>
                        <Box
                          component="img"
                          src={item.productImage}
                          alt={item.name}
                          sx={{
                            width: '100%',
                            height: 150,
                            objectFit: 'cover',
                            borderRadius: 1,
                          }}
                        />
                      </Grid>

                      {/* Product Details */}
                      <Grid item xs={12} sm={6}>
                        <Typography variant="h6" gutterBottom>
                          {item.name}
                        </Typography>

                        {/* Customizations */}
                        {item.selectedCustomizations.length > 0 && (
                          <Box sx={{ mt: 1, mb: 2 }}>
                            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                              Customizations:
                            </Typography>
                            {item.selectedCustomizations.map((custom, idx) => (
                              <Chip
                                key={idx}
                                label={`${custom.label}: ${custom.value}`}
                                size="small"
                                sx={{ mr: 0.5, mb: 0.5 }}
                              />
                            ))}
                          </Box>
                        )}

                        {/* Quantity Control */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            Quantity:
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleQuantityChange(item.productId, itemKey, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              -
                            </Button>
                            <TextField
                              size="small"
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val)) {
                                  handleQuantityChange(item.productId, itemKey, val);
                                }
                              }}
                              inputProps={{ min: 1, max: 99, style: { textAlign: 'center', width: 50 } }}
                            />
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleQuantityChange(item.productId, itemKey, item.quantity + 1)}
                              disabled={item.quantity >= 99}
                            >
                              +
                            </Button>
                          </Box>
                        </Box>
                      </Grid>

                      {/* Price and Actions */}
                      <Grid item xs={12} sm={3}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', height: '100%' }}>
                          <Typography variant="h6" color="primary" gutterBottom>
                            ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" gutterBottom>
                            ₹{item.price.toLocaleString('en-IN')} each
                          </Typography>
                          
                          <Box sx={{ flexGrow: 1 }} />
                          
                          <IconButton
                            color="error"
                            onClick={() => handleRemoveItem(item.productId, itemKey)}
                            sx={{ mt: 2 }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Grid>

        {/* Order Summary */}
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ position: 'sticky', top: 20 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Order Summary
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Items ({state.totalItems}):
                </Typography>
                <Typography variant="body2">
                  ₹{state.totalPrice.toLocaleString('en-IN')}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Delivery:
                </Typography>
                <Typography variant="body2" color="success.main">
                  FREE
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6">
                  Total:
                </Typography>
                <Typography variant="h6" color="primary">
                  ₹{state.totalPrice.toLocaleString('en-IN')}
                </Typography>
              </Box>
              
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={() => router.push('/checkout')}
              >
                Proceed to Checkout
              </Button>
              
              <Button
                variant="text"
                fullWidth
                onClick={() => router.push('/products')}
                sx={{ mt: 2 }}
              >
                Continue Shopping
              </Button>
            </CardContent>
          </Card>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="caption">
              Cart data is saved in your browser. Items will persist across sessions.
            </Typography>
          </Alert>
        </Grid>
      </Grid>
    </Container>
  );
}
