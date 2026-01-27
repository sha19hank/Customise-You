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
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';

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

  useEffect(() => {
    if (!isAuthenticated) {
      showToast('Please login to view order details', 'error');
      router.push('/login');
      return;
    }

    fetchOrderDetails();
  }, [isAuthenticated, orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/orders/${orderId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }

      const result = await response.json();
      setOrder(result.data); // Extract data from API response
    } catch (err: any) {
      console.error('Error fetching order:', err);
      setError('Failed to load order details. Please try again.');
      showToast('Failed to load order details', 'error');
    } finally {
      setLoading(false);
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
      {/* Success Header */}
      <Paper sx={{ p: 4, mb: 3, textAlign: 'center', bgcolor: 'success.light' }}>
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
            : 'Your order is pending payment confirmation.'}
        </Typography>
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

            <Button
              variant="contained"
              fullWidth
              onClick={() => router.push('/')}
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
