'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import InventoryIcon from '@mui/icons-material/Inventory';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import WarningIcon from '@mui/icons-material/Warning';
import apiClient from '@/services/api';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  averageRating: number;
  kycStatus?: string;
  kycRequired?: boolean;
}

export default function SellerDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError('');
      const userStr = localStorage.getItem('user');
      
      if (!userStr) {
        setError('User not found. Please log in again.');
        return;
      }

      const user = JSON.parse(userStr);
      const sellerId = user.id;

      console.log('[Dashboard] Fetching stats for seller:', sellerId);
      const response = await apiClient.get(`/seller/dashboard?sellerId=${sellerId}`);

      if (response.data.success) {
        setStats(response.data.data);
        console.log('[Dashboard] Stats loaded successfully');
      }
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err);
      console.error('Error response:', err.response?.data);
      
      // Don't redirect on auth errors, just show error message
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to load dashboard';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const statCards = [
    {
      title: 'Total Products',
      value: stats?.totalProducts || 0,
      icon: <InventoryIcon sx={{ fontSize: 40 }} />,
      color: '#1976d2',
    },
    {
      title: 'Total Orders',
      value: stats?.totalOrders || 0,
      icon: <ShoppingBagIcon sx={{ fontSize: 40 }} />,
      color: '#2e7d32',
    },
    {
      title: 'Total Revenue',
      value: `₹${(stats?.totalRevenue || 0).toLocaleString('en-IN')}`,
      icon: <CurrencyRupeeIcon sx={{ fontSize: 40 }} />,
      color: '#ed6c02',
    },
    {
      title: 'Average Rating',
      value: (stats?.averageRating || 0).toFixed(1),
      icon: <TrendingUpIcon sx={{ fontSize: 40 }} />,
      color: '#9c27b0',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Seller Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Overview of your store performance
      </Typography>

      {/* KYC Warning Banner */}
      {stats?.kycRequired && stats.kycStatus !== 'approved' && (
        <Alert 
          severity="warning" 
          icon={<WarningIcon />}
          sx={{ mb: 3 }}
          action={
            <button
              style={{
                background: 'none',
                border: 'none',
                color: '#ed6c02',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
              onClick={() => router.push('/profile')}
            >
              Complete KYC
            </button>
          }
        >
          <strong>KYC Verification Required:</strong> Complete your KYC verification to list and sell products.
        </Alert>
      )}

      <Grid container spacing={3}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ color: card.color }}>
                    {card.icon}
                  </Box>
                </Box>
                <Typography variant="h4" gutterBottom>
                  {card.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {card.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
