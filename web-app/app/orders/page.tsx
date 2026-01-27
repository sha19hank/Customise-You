'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';

interface OrderSummary {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  item_count: number;
}

export default function OrdersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useNotification();

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      showToast('Please login to view orders', 'error');
      router.push('/login');
      return;
    }

    fetchOrders();
  }, [isAuthenticated, user]);

  const fetchOrders = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/v1/orders/user/${user.id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const result = await response.json();
      setOrders(result.data.orders || []);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders. Please try again.');
      showToast('Failed to load orders', 'error');
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <ShoppingBagIcon sx={{ fontSize: 32, mr: 2 }} />
        <Typography variant="h4">
          My Orders
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {orders.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <ShoppingBagIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Orders Yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Start shopping and your orders will appear here
          </Typography>
          <Button variant="contained" onClick={() => router.push('/')}>
            Start Shopping
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {orders.map((order) => (
            <Grid item xs={12} key={order.id}>
              <Card variant="outlined" sx={{ '&:hover': { boxShadow: 2 }, transition: 'box-shadow 0.2s' }}>
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    {/* Order Number and Date */}
                    <Grid item xs={12} sm={3}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Order #{order.order_number}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(order.created_at)}
                      </Typography>
                    </Grid>

                    {/* Status */}
                    <Grid item xs={6} sm={2}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Status
                      </Typography>
                      <Chip
                        label={order.status.toUpperCase()}
                        color={getStatusColor(order.status)}
                        size="small"
                      />
                    </Grid>

                    {/* Payment */}
                    <Grid item xs={6} sm={2}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Payment
                      </Typography>
                      <Typography variant="body2">
                        {order.payment_method === 'cod' ? 'COD' : 'Online'}
                      </Typography>
                    </Grid>

                    {/* Items */}
                    <Grid item xs={6} sm={2}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Items
                      </Typography>
                      <Typography variant="body2">
                        {order.item_count} {order.item_count === 1 ? 'item' : 'items'}
                      </Typography>
                    </Grid>

                    {/* Total */}
                    <Grid item xs={6} sm={2}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Total
                      </Typography>
                      <Typography variant="h6" color="primary">
                        ₹{order.total_amount.toLocaleString('en-IN')}
                      </Typography>
                    </Grid>

                    {/* Actions */}
                    <Grid item xs={12} sm={1} sx={{ textAlign: 'right' }}>
                      <Button
                        variant="outlined"
                        size="small"
                        endIcon={<ArrowForwardIcon />}
                        onClick={() => router.push(`/orders/${order.id}`)}
                      >
                        View
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}
