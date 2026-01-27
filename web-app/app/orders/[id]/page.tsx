'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  Grid,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CancelIcon from '@mui/icons-material/Cancel';
import TimerIcon from '@mui/icons-material/Timer';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PaymentIcon from '@mui/icons-material/Payment';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import apiClient from '@/services/api';

interface OrderItem {
  id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  customizations?: Array<{
    customization_value: string;
    price_adjustment: number;
  }>;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  shipping_cost: number;
  platform_fee: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  can_cancel: boolean;
  expires_at: string | null;
  shipping_address: {
    full_name: string;
    phone_number: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  items: OrderItem[];
}

export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useNotification();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (!isAuthenticated) {
      showToast('Please login to view order details', 'error');
      router.push('/login');
      return;
    }

    fetchOrderDetails();
  }, [isAuthenticated, orderId]);

  // Countdown timer for order expiry
  useEffect(() => {
    if (!order?.expires_at) return;

    const interval = setInterval(() => {
      const now = new Date();
      const expiresAt = new Date(order.expires_at!);
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Expired');
        clearInterval(interval);
        // Refresh order to get updated status
        fetchOrderDetails();
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [order?.expires_at]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/orders/${orderId}`);

      if (!response.data || !response.data.data) {
        console.error('[Order Details] Invalid API response:', response.data);
        throw new Error('Invalid server response');
      }

      setOrder(response.data.data);
    } catch (err: any) {
      console.error('[Order Details] Error fetching order:', err);
      
      let errorMessage = 'Failed to load order details. Please try again.';
      if (err.response) {
        errorMessage = err.response.data?.error?.message || err.response.data?.message || errorMessage;
      } else if (err.request) {
        errorMessage = 'Backend API not reachable. Please ensure the server is running.';
      }
      
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order || !user?.id) return;

    if (!confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    try {
      setCancelling(true);
      await apiClient.post(`/orders/${orderId}/cancel`, {
        userId: user.id,
      });

      showToast('Order cancelled successfully', 'success');
      fetchOrderDetails(); // Refresh order details
    } catch (err: any) {
      console.error('[Order Details] Error cancelling order:', err);
      
      let errorMessage = 'Failed to cancel order';
      if (err.response) {
        errorMessage = err.response.data?.error?.message || err.response.data?.message || errorMessage;
      } else if (err.request) {
        errorMessage = 'Backend API not reachable';
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'delivered':
        return 'success';
      case 'pending':
      case 'processing':
        return 'warning';
      case 'cancelled':
      case 'expired':
        return 'error';
      default:
        return 'default';
    }
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

  if (error || !order) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'Order not found'}
        </Alert>
        <Button variant="contained" onClick={() => router.push('/')}>
          Back to Home
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Success/Status Header */}
      <Paper 
        sx={{ 
          p: 4, 
          mb: 3, 
          textAlign: 'center', 
          bgcolor: order.status === 'cancelled' || order.status === 'expired' 
            ? 'error.light' 
            : order.status === 'pending' 
              ? 'warning.light' 
              : 'success.light' 
        }}
      >
        {order.status === 'cancelled' ? (
          <>
            <CancelIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Order Cancelled
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Order #{order.order_number}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              This order has been cancelled. The amount will be refunded if already paid.
            </Typography>
          </>
        ) : order.status === 'expired' ? (
          <>
            <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Order Expired
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Order #{order.order_number}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              This order expired due to non-payment. The items have been returned to inventory.
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => router.push('/')}
              sx={{ mt: 1 }}
            >
              Continue Shopping
            </Button>
          </>
        ) : order.status === 'pending' ? (
          <>
            <TimerIcon sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Order Pending Payment
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Order #{order.order_number}
            </Typography>
            {order.expires_at && (
              <Alert severity="warning" sx={{ mt: 2, display: 'inline-flex' }}>
                <Typography variant="body1" fontWeight="bold">
                  Time Remaining: {timeRemaining}
                </Typography>
              </Alert>
            )}
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
              Please complete payment to confirm your order.
            </Typography>
          </>
        ) : (
          <>
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Order Placed Successfully!
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Order #{order.order_number}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {order.payment_method === 'cod' 
                ? 'Your order has been confirmed. You can pay on delivery.'
                : 'Your order is confirmed and being processed.'}
            </Typography>
          </>
        )}
      </Paper>

      <Grid container spacing={3}>
        {/* Order Details */}
        <Grid item xs={12} md={8}>
          {/* Delivery Address */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LocalShippingIcon sx={{ mr: 1 }} />
              <Typography variant="h6">
                Delivery Address
              </Typography>
            </Box>
            <Typography variant="subtitle1" fontWeight="bold">
              {order.shipping_address.full_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {order.shipping_address.address_line1}
              {order.shipping_address.address_line2 && `, ${order.shipping_address.address_line2}`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.postal_code}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {order.shipping_address.country}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Phone: {order.shipping_address.phone_number}
            </Typography>
          </Paper>

          {/* Order Items */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Order Items
            </Typography>
            <Divider sx={{ my: 2 }} />
            {order.items.map((item, index) => (
              <Box key={item.id} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body1" fontWeight="medium">
                    {item.product_name || `Product ${item.product_id}`}
                  </Typography>
                  <Typography variant="body1">
                    ₹{item.subtotal.toLocaleString('en-IN')}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Quantity: {item.quantity} × ₹{item.unit_price.toLocaleString('en-IN')}
                </Typography>
                {item.customizations && item.customizations.length > 0 && (
                  <Box sx={{ ml: 2, mt: 1 }}>
                    {item.customizations.map((custom, idx) => (
                      <Typography key={idx} variant="caption" color="text.secondary" display="block">
                        • {custom.customization_value}
                        {custom.price_adjustment > 0 && ` (+₹${custom.price_adjustment})`}
                      </Typography>
                    ))}
                  </Box>
                )}
                {index < order.items.length - 1 && <Divider sx={{ my: 2 }} />}
              </Box>
            ))}
          </Paper>
        </Grid>

        {/* Order Summary */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
            <Typography variant="h6" gutterBottom>
              Order Summary
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Order Status:</Typography>
                <Chip
                  label={order.status.toUpperCase()}
                  color={getStatusColor(order.status)}
                  size="small"
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Payment Method:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Payment Status:</Typography>
                <Chip
                  label={order.payment_status.toUpperCase()}
                  color={order.payment_status === 'completed' ? 'success' : 'warning'}
                  size="small"
                />
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Subtotal
                </Typography>
                <Typography variant="body2">
                  ₹{order.subtotal.toLocaleString('en-IN')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Tax (GST)
                </Typography>
                <Typography variant="body2">
                  ₹{order.tax_amount.toLocaleString('en-IN')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Shipping Fee
                </Typography>
                <Typography variant="body2" color="success.main">
                  {order.shipping_cost === 0 ? 'FREE' : `₹${order.shipping_cost.toLocaleString('en-IN')}`}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Platform Fee
                </Typography>
                <Typography variant="body2">
                  ₹{order.platform_fee.toLocaleString('en-IN')}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6">
                Total Amount
              </Typography>
              <Typography variant="h6" color="primary">
                ₹{order.total_amount.toLocaleString('en-IN')}
              </Typography>
            </Box>

            {/* Action Buttons */}
            {order.can_cancel && order.status === 'pending' && (
              <Button
                variant="outlined"
                color="error"
                fullWidth
                startIcon={<CancelIcon />}
                onClick={handleCancelOrder}
                disabled={cancelling}
                sx={{ mb: 2 }}
              >
                {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </Button>
            )}

            {order.status === 'pending' && order.payment_method === 'online' && timeRemaining !== 'Expired' && (
              <Button
                variant="contained"
                fullWidth
                startIcon={<PaymentIcon />}
                onClick={() => router.push(`/orders/${orderId}/payment`)}
                sx={{ mb: 2 }}
              >
                Complete Payment
              </Button>
            )}

            <Button
              variant="contained"
              fullWidth
              onClick={() => router.push('/')}
              disabled={order.status === 'pending' && timeRemaining !== 'Expired'}
            >
              Continue Shopping
            </Button>

            <Button
              variant="outlined"
              fullWidth
              onClick={() => router.push('/orders')}
              sx={{ mt: 2 }}
            >
              View All Orders
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
