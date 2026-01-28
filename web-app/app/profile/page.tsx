'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  Skeleton,
  Chip,
  Divider,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import HomeIcon from '@mui/icons-material/Home';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useAuth } from '@/context/AuthContext';
import { userService, UpdateProfileData, UserProfile } from '@/services/user.service';
import { addressService } from '@/services/address.service';
import { Address } from '@/types/address';
import apiClient from '@/services/api';
import { useRouter } from 'next/navigation';

interface OrderSummary {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
}

export default function ProfilePage() {
  const { user: authUser, isAuthenticated, loading: authLoading, refreshUserProfile } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!authUser) return;

      try {
        setLoading(true);
        setError(null);
        const profileData = await userService.getProfile();
        setProfile(profileData);
        setEditForm({
          firstName: profileData.firstName || '',
          lastName: profileData.lastName || '',
          phone: profileData.phone || '',
        });
      } catch (err: any) {
        console.error('Error fetching profile:', err);
        setError(err.response?.data?.error?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    if (authUser) {
      fetchProfile();
    }
  }, [authUser]);

  // Fetch addresses
  useEffect(() => {
    const fetchAddresses = async () => {
      if (!authUser?.id) return;

      try {
        setAddressesLoading(true);
        const addressData = await addressService.getAddresses(authUser.id);
        setAddresses(addressData);
      } catch (err: any) {
        console.error('Error fetching addresses:', err);
        // Don't show error for addresses as it's not critical
      } finally {
        setAddressesLoading(false);
      }
    };

    if (authUser?.id) {
      fetchAddresses();
    }
  }, [authUser]);

  // Fetch recent orders
  useEffect(() => {
    const fetchOrders = async () => {
      if (!authUser?.id) return;

      try {
        setOrdersLoading(true);
        const response = await apiClient.get(`/orders/user/${authUser.id}`);
        const ordersData = response.data.data.orders || [];
        // Get only the 3 most recent orders
        setOrders(ordersData.slice(0, 3));
      } catch (err: any) {
        console.error('Error fetching orders:', err);
        // Don't show error for orders as it's not critical
      } finally {
        setOrdersLoading(false);
      }
    };

    if (authUser?.id) {
      fetchOrders();
    }
  }, [authUser]);

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset form
      setEditForm({
        firstName: profile?.firstName || '',
        lastName: profile?.lastName || '',
        phone: profile?.phone || '',
      });
      setSuccess(null);
      setError(null);
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    if (!profile) return;

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      const updateData: UpdateProfileData = {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        phone: editForm.phone.trim() || null,
      };

      const updatedProfile = await userService.updateProfile(updateData);
      setProfile(updatedProfile);
      setIsEditing(false);
      setSuccess('Profile updated successfully!');

      // Refresh auth context user data
      await refreshUserProfile();

      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  const getStatusColor = (status: string): 'default' | 'primary' | 'success' | 'warning' | 'error' => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
      case 'expired':
        return 'error';
      default:
        return 'default';
    }
  };

  // Loading skeleton
  if (authLoading || loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Skeleton variant="text" width={200} height={60} />
        <Skeleton variant="rectangular" height={300} sx={{ mt: 3, borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={200} sx={{ mt: 3, borderRadius: 2 }} />
      </Container>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !profile) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">Please log in to view your profile.</Alert>
      </Container>
    );
  }

  const defaultAddress = addresses.find((addr) => addr.is_default);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          My Profile
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your personal information and addresses
        </Typography>
      </Box>

      {/* Success/Error Messages */}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Profile Information Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight="bold">
              Personal Information
            </Typography>
            {!isEditing ? (
              <Button
                startIcon={<EditIcon />}
                variant="outlined"
                size="small"
                onClick={handleEditToggle}
              >
                Edit
              </Button>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  startIcon={<CancelIcon />}
                  variant="outlined"
                  size="small"
                  onClick={handleEditToggle}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  startIcon={<SaveIcon />}
                  variant="contained"
                  size="small"
                  onClick={handleSave}
                  disabled={isSaving || !editForm.firstName || !editForm.lastName}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </Box>
            )}
          </Box>

          {isEditing ? (
            // Edit Mode
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  disabled={isSaving}
                  required
                  InputProps={{
                    startAdornment: <PersonIcon sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  disabled={isSaving}
                  required
                  InputProps={{
                    startAdornment: <PersonIcon sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  disabled={isSaving}
                  placeholder="+1 (555) 123-4567"
                  InputProps={{
                    startAdornment: <PhoneIcon sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  value={profile.email}
                  disabled
                  helperText="Email cannot be changed"
                  InputProps={{
                    startAdornment: <EmailIcon sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              </Grid>
            </Grid>
          ) : (
            // View Mode
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      First Name
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {profile.firstName || 'Not set'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Last Name
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {profile.lastName || 'Not set'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmailIcon color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {profile.email}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PhoneIcon color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Phone
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {profile.phone || 'Not set'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarTodayIcon color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Member Since
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {formatDate(profile.createdAt)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Account Type
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label={profile.role.toUpperCase()}
                        size="small"
                        color={profile.role === 'admin' ? 'error' : 'primary'}
                      />
                    </Box>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* My Orders Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              My Orders
            </Typography>
            <Button
              variant="outlined"
              size="small"
              endIcon={<ArrowForwardIcon />}
              onClick={() => router.push('/orders')}
            >
              View All Orders
            </Button>
          </Box>

          {ordersLoading ? (
            <Box>
              <Skeleton variant="rectangular" height={80} sx={{ mb: 1, borderRadius: 1 }} />
              <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
            </Box>
          ) : orders.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <ShoppingBagIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body2" color="text.secondary" gutterBottom>
                No orders yet
              </Typography>
              <Button
                variant="contained"
                size="small"
                sx={{ mt: 2 }}
                onClick={() => router.push('/products')}
              >
                Start Shopping
              </Button>
            </Box>
          ) : (
            <List disablePadding>
              {orders.map((order, index) => (
                <React.Fragment key={order.id}>
                  {index > 0 && <Divider />}
                  <ListItem
                    sx={{
                      px: 0,
                      py: 2,
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'action.hover' },
                      borderRadius: 1,
                    }}
                    onClick={() => router.push(`/orders/${order.id}`)}
                  >
                    <ListItemIcon>
                      <ShoppingBagIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2" fontWeight="medium">
                            {order.order_number}
                          </Typography>
                          <Chip
                            label={order.status.toUpperCase()}
                            size="small"
                            color={getStatusColor(order.status)}
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(order.created_at)} • ${Number(order.total_amount).toFixed(2)}
                          </Typography>
                        </Box>
                      }
                    />
                    <ArrowForwardIcon sx={{ color: 'action.active' }} />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Addresses Card */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              Saved Addresses
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => router.push('/checkout')}
            >
              Manage Addresses
            </Button>
          </Box>

          {addressesLoading ? (
            <Box>
              <Skeleton variant="rectangular" height={80} sx={{ mb: 1, borderRadius: 1 }} />
              <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
            </Box>
          ) : addresses.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <HomeIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body2" color="text.secondary" gutterBottom>
                No saved addresses yet
              </Typography>
              <Button
                variant="contained"
                size="small"
                sx={{ mt: 2 }}
                onClick={() => router.push('/checkout')}
              >
                Add Address
              </Button>
            </Box>
          ) : (
            <List disablePadding>
              {addresses.slice(0, 3).map((address, index) => (
                <React.Fragment key={address.id}>
                  {index > 0 && <Divider />}
                  <ListItem
                    sx={{
                      px: 0,
                      py: 2,
                      backgroundColor: address.is_default ? 'action.hover' : 'transparent',
                      borderRadius: 1,
                    }}
                  >
                    <ListItemIcon>
                      {address.is_default ? (
                        <CheckCircleIcon color="primary" />
                      ) : (
                        <HomeIcon color="action" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight="medium">
                            {address.full_name}
                          </Typography>
                          {address.is_default && (
                            <Chip label="Default" size="small" color="primary" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {address.address_line1}, {address.city}, {address.state} {address.postal_code}
                        </Typography>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              ))}
              {addresses.length > 3 && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Button
                    size="small"
                    onClick={() => router.push('/checkout')}
                  >
                    View All {addresses.length} Addresses
                  </Button>
                </Box>
              )}
            </List>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
