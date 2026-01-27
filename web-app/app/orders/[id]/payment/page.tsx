'use client';

import { useState, useEffect } from 'react';

// Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}
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
import apiClient from '@/services/api';

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  status: string;
  expires_at: string | null;
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
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Load Razorpay SDK
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      console.log('[Payment Page] Razorpay SDK loaded');
      setRazorpayLoaded(true);
    };
    script.onerror = () => {
      console.error('[Payment Page] Failed to load Razorpay SDK');
      showToast('Failed to load payment gateway', 'error');
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      showToast('Please login to continue', 'error');
      router.push('/login');
      return;
    }

    fetchOrderDetails();
  }, [isAuthenticated, orderId]);

  // Countdown timer
  useEffect(() => {
    if (!order?.expires_at) return;

    const interval = setInterval(() => {
      const now = new Date();
      const expiresAt = new Date(order.expires_at!);
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        console.log('[Payment Page] Order expired during countdown');
        setTimeRemaining('Expired');
        clearInterval(interval);
        showToast('Order has expired. Redirecting...', 'warning');
        // Redirect to order details to show expired state
        setTimeout(() => router.push(`/orders/${orderId}`), 2000);
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        
        // Warn user when less than 2 minutes remaining
        if (diff <= 120000 && diff > 119000) {
          showToast('Only 2 minutes remaining! Complete payment soon.', 'warning');
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [order?.expires_at]);

  const handlePayment = async () => {
    if (!razorpayLoaded) {
      showToast('Payment gateway is still loading. Please wait...', 'warning');
      return;
    }

    if (!order || !user?.id) {
      showToast('Order or user information missing', 'error');
      return;
    }

    try {
      setProcessingPayment(true);
      console.log('[Payment Page] Creating Razorpay order...');

      // Create Razorpay order
      const createResponse = await apiClient.post('/payments/razorpay/create', {
        orderId: order.id,
      });

      if (!createResponse.data || !createResponse.data.data) {
        throw new Error('Invalid response from payment gateway');
      }

      const { key_id, razorpay_order_id, amount, currency, order_number } = createResponse.data.data;

      console.log('[Payment Page] Razorpay order created:', razorpay_order_id);

      // Get user details for prefill
      const userEmail = user.email || '';
      const userName = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user.firstName || user.email || '';

      // Razorpay options
      const options = {
        key: key_id,
        amount: amount,
        currency: currency,
        name: 'CustomiseYou',
        description: `Order #${order_number}`,
        order_id: razorpay_order_id,
        prefill: {
          email: userEmail,
          name: userName,
        },
        theme: {
          color: '#1976d2',
        },
        handler: async function (response: any) {
          try {
            console.log('[Payment Page] Payment successful, verifying...');
            console.log('[Payment Page] Razorpay response:', response);

            // Verify payment
            const verifyResponse = await apiClient.post('/payments/razorpay/verify', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              orderId: order.id,
            });

            if (verifyResponse.data.success) {
              console.log('[Payment Page] Payment verified successfully');
              showToast('Payment successful! Your order is confirmed.', 'success');
              router.push(`/orders/${order.id}`);
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (err: any) {
            console.error('[Payment Page] Payment verification error:', err);
            showToast('Payment verification failed. Please contact support.', 'error');
          } finally {
            setProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: function () {
            console.log('[Payment Page] Payment cancelled by user');
            setProcessingPayment(false);
            showToast('Payment cancelled', 'info');
          },
        },
      };

      // Check if Razorpay SDK is loaded
      if (!window.Razorpay) {
        throw new Error('Payment gateway not ready. Please refresh the page and try again.');
      }

      // Open Razorpay checkout
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      console.error('[Payment Page] Payment initiation error:', err);
      
      // Enhanced error logging for debugging
      if (err.response) {
        console.error('[Payment Page] Full error response:', err.response);
      }

      let errorMessage = 'Failed to initiate payment';
      if (err.response) {
        errorMessage = err.response.data?.error?.message || err.response.data?.message || errorMessage;
      } else if (err.request) {
        errorMessage = 'Backend API not reachable';
      } else {
        errorMessage = err.message || errorMessage;
      }

      showToast(errorMessage, 'error');
      setProcessingPayment(false);
    }
  };

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      console.log('[Payment Page] Fetching order details for:', orderId);
      
      const response = await apiClient.get(`/orders/${orderId}`);

      // Defensive response validation
      if (!response.data || !response.data.data) {
        console.error('[Payment Page] Invalid API response structure:', response.data);
        throw new Error('Invalid server response. Please try again.');
      }

      const orderData = response.data.data;
      console.log('[Payment Page] Order data:', {
        status: orderData.status,
        payment_status: orderData.payment_status,
        expires_at: orderData.expires_at,
      });

      setOrder(orderData);

      // Handle order state - redirect if not payable
      if (orderData.payment_status === 'completed' || orderData.payment_status === 'paid') {
        console.log('[Payment Page] Order already paid, redirecting to order details');
        showToast('This order has already been paid', 'info');
        router.push(`/orders/${orderId}`);
        return;
      }

      if (orderData.status === 'expired') {
        console.log('[Payment Page] Order expired, redirecting to order details');
        showToast('This order has expired. Please create a new order.', 'warning');
        router.push(`/orders/${orderId}`);
        return;
      }

      if (orderData.status === 'cancelled') {
        console.log('[Payment Page] Order cancelled, redirecting to order details');
        showToast('This order has been cancelled', 'info');
        router.push(`/orders/${orderId}`);
        return;
      }

      if (orderData.payment_method?.toLowerCase() === 'cod') {
        console.log('[Payment Page] COD order does not require payment page');
        showToast('This is a Cash on Delivery order', 'info');
        router.push(`/orders/${orderId}`);
        return;
      }

      console.log('[Payment Page] Order is valid and awaiting payment');
    } catch (err: any) {
      console.error('[Payment Page] Error fetching order:', err);
      
      let errorMessage = 'Failed to load payment page. Please try again.';
      
      if (err.response) {
        // Backend returned an error
        const status = err.response.status;
        if (status === 404) {
          errorMessage = 'Order not found. Please check the order ID.';
        } else if (status === 401 || status === 403) {
          errorMessage = 'You do not have permission to access this order.';
          router.push('/login');
          return;
        } else {
          errorMessage = err.response.data?.error?.message || err.response.data?.message || errorMessage;
        }
        console.error('[Payment Page] Backend error:', status, err.response.data);
      } else if (err.request) {
        // No response from backend
        errorMessage = 'Backend API not reachable. Please ensure the server is running on port 3000.';
        console.error('[Payment Page] No response from backend');
      } else {
        // Other errors
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
      showToast(errorMessage, 'error');
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
          
          {/* Expiry Countdown */}
          {order.expires_at && timeRemaining && timeRemaining !== 'Expired' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body1" fontWeight="bold">
                Time Remaining: {timeRemaining}
              </Typography>
              <Typography variant="caption">
                Complete payment before expiry to confirm your order
              </Typography>
            </Alert>
          )}
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

        {/* Payment Methods Info */}
        <Alert severity="success" icon={<InfoIcon />} sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Secure Payment via Razorpay
          </Typography>
          <Typography variant="body2">
            We accept all major payment methods:
          </Typography>
          <Box component="ul" sx={{ mt: 1, mb: 0 }}>
            <li>UPI (Google Pay, PhonePe, Paytm)</li>
            <li>Credit/Debit Cards (Visa, Mastercard, Rupay)</li>
            <li>Net Banking (All major banks)</li>
            <li>Wallets (Paytm, PhonePe, Amazon Pay)</li>
          </Box>
        </Alert>

        <Divider sx={{ my: 3 }} />

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => router.push(`/orders/${orderId}`)}
            disabled={processingPayment}
          >
            View Order Details
          </Button>
          <Button
            variant="contained"
            fullWidth
            onClick={handlePayment}
            disabled={!razorpayLoaded || processingPayment || timeRemaining === 'Expired'}
            startIcon={processingPayment ? <CircularProgress size={20} /> : <PaymentIcon />}
          >
            {processingPayment ? 'Processing...' : 'Pay Now'}
          </Button>
        </Box>

        {!razorpayLoaded && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
            Loading payment gateway...
          </Typography>
        )}

        {razorpayLoaded && timeRemaining !== 'Expired' && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
            🔒 Secure payment powered by Razorpay
          </Typography>
        )}

        {timeRemaining === 'Expired' && (
          <Alert severity="error" sx={{ mt: 2 }}>
            This order has expired. Please create a new order.
          </Alert>
        )}
      </Paper>
    </Container>
  );
}
