'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Paper,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import InfoIcon from '@mui/icons-material/Info';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
}

export default function PaymentPage() {
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
      showToast('Please login to continue', 'error');
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
      const data = result.data; // Extract data from API response
      setOrder(data);

      // Redirect to order details if already paid
      if (data.payment_status === 'completed') {
        router.push(`/orders/${orderId}`);
      }
    } catch (err: any) {
      console.error('Error fetching order:', err);
      setError('Failed to load payment page. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !order) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
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
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <PaymentIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Complete Your Payment
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Order #{order.order_number}
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Amount */}
        <Card variant="outlined" sx={{ mb: 3, bgcolor: 'primary.light' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                Amount to Pay
              </Typography>
              <Typography variant="h4" color="primary">
                ₹{order.total_amount.toLocaleString('en-IN')}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Payment Gateway Placeholder */}
        <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Payment Gateway Integration Coming Soon
          </Typography>
          <Typography variant="body2">
            We are currently integrating secure payment options including:
          </Typography>
          <Box component="ul" sx={{ mt: 1, mb: 0 }}>
            <li>UPI (Google Pay, PhonePe, Paytm)</li>
            <li>Credit/Debit Cards</li>
            <li>Net Banking</li>
            <li>Wallets</li>
          </Box>
        </Alert>

        {/* Placeholder Payment Options */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Payment Options (Demo)
          </Typography>
          
          <Card variant="outlined" sx={{ mb: 2, opacity: 0.6 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold">
                💳 UPI
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pay using Google Pay, PhonePe, Paytm, or any UPI app
              </Typography>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 2, opacity: 0.6 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold">
                💰 Credit/Debit Card
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Visa, Mastercard, Rupay, American Express
              </Typography>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 2, opacity: 0.6 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold">
                🏦 Net Banking
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All major banks supported
              </Typography>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ opacity: 0.6 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold">
                👛 Wallets
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Paytm, PhonePe, Amazon Pay, and more
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => router.push(`/orders/${orderId}`)}
          >
            View Order Details
          </Button>
          <Button
            variant="contained"
            fullWidth
            disabled
          >
            Proceed to Payment (Coming Soon)
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
          Your order has been created and is awaiting payment confirmation.
        </Typography>
      </Paper>
    </Container>
  );
}
