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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
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
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import StorefrontIcon from '@mui/icons-material/Storefront';
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
  const { user: authUser, isAuthenticated, loading: authLoading, refreshUserProfile, updateUser } = useAuth();
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
  const [sellerDialogOpen, setSellerDialogOpen] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [kycDialogOpen, setKycDialogOpen] = useState(false);
  const [isSubmittingKyc, setIsSubmittingKyc] = useState(false);
  const [kycError, setKycError] = useState<string | null>(null);
  const [kycForm, setKycForm] = useState({
    legalFullName: '',
    panNumber: '',
    bankAccountNumber: '',
    bankIfscCode: '',
  });

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
      // Fetch KYC status if user is a seller
      if (authUser.role === 'seller') {
        fetchKycStatus();
      }
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

  const handleBecomeSellerClick = () => {
    setOnboardingError(null);
    setSellerDialogOpen(true);
  };

  const handleOnboardSeller = async () => {
    try {
      setIsOnboarding(true);
      setOnboardingError(null);

      console.log('Calling /seller/onboard...');
      const response = await apiClient.post('/seller/onboard');
      console.log('Onboard response:', response.data);

      if (response.data.success) {
        const updatedUser = response.data.data.user;
        console.log('Updated user from backend:', updatedUser);
        
        // Create user object for storage
        const userToStore = {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.first_name || '',
          lastName: updatedUser.last_name || '',
          phone: updatedUser.phone,
          role: updatedUser.role, // This should be 'seller' now
        };
        
        console.log('Storing user to localStorage:', userToStore);
        localStorage.setItem('user', JSON.stringify(userToStore));
        
        // Update the profile state immediately
        const updatedProfile = {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.first_name || '',
          lastName: updatedUser.last_name || '',
          phone: updatedUser.phone,
          role: updatedUser.role,
          profileImageUrl: profile?.profileImageUrl,
          createdAt: profile?.createdAt || '',
        };
        
        console.log('Updating profile state to:', updatedProfile);
        setProfile(updatedProfile);
        
        // DON'T call updateUser() - it triggers useEffect which re-fetches and overwrites our update!
        // Just update localStorage so the seller layout can see the new role
        
        // Close dialog first
        setSellerDialogOpen(false);
        
        // Fetch KYC status for the new seller (with small delay to ensure state is set)
        setTimeout(() => {
          fetchKycStatus();
        }, 100);
        
        // Show success message with KYC reminder
        setSuccess('✅ Successfully registered as seller! Scroll down to see your "Seller Dashboard" button. Please complete KYC verification to start selling.');
        
        console.log('Seller onboarding complete. New role:', updatedUser.role);
        console.log('Profile role is now:', updatedProfile.role);
        
        // Auto-hide success message after 8 seconds
        setTimeout(() => setSuccess(null), 8000);
      }
    } catch (err: any) {
      console.error('Error onboarding as seller:', err);
      console.error('Error response:', err.response?.data);
      setOnboardingError(
        err.response?.data?.error?.message || 'Failed to become a seller. Please try again.'
      );
    } finally {
      setIsOnboarding(false);
    }
  };

  const fetchKycStatus = async () => {
    try {
      const response = await apiClient.get('/seller/kyc');
      if (response.data.success) {
        setKycStatus(response.data.data.status);
      }
    } catch (err: any) {
      console.error('Error fetching KYC status:', err);
    }
  };

  const handleSubmitKyc = async () => {
    try {
      setIsSubmittingKyc(true);
      setKycError(null);

      const response = await apiClient.post('/seller/kyc', kycForm);

      if (response.data.success) {
        setKycDialogOpen(false);
        setSuccess('KYC submitted successfully! Verification in progress.');
        fetchKycStatus(); // Refresh KYC status
        
        // Reset form
        setKycForm({
          legalFullName: '',
          panNumber: '',
          bankAccountNumber: '',
          bankIfscCode: '',
        });
      }
    } catch (err: any) {
      console.error('Error submitting KYC:', err);
      setKycError(
        err.response?.data?.error?.message || 'Failed to submit KYC. Please try again.'
      );
    } finally {
      setIsSubmittingKyc(false);
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
      {/* Page Header with Avatar */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}
        >
          <AccountCircleIcon sx={{ fontSize: 60 }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            {profile.firstName || 'User'} {profile.lastName || ''}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {profile.email}
          </Typography>
        </Box>
      </Box>

      {/* Quick Navigation Buttons */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6}>
          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<ShoppingBagIcon />}
            onClick={() => router.push('/orders')}
            sx={{ py: 1.5 }}
          >
            My Orders
          </Button>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<LocationOnIcon />}
            onClick={() => router.push('/addresses')}
            sx={{ py: 1.5 }}
          >
            My Addresses
          </Button>
        </Grid>
      </Grid>

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
                        key={`role-${profile.role}`}
                        label={profile.role === 'admin' ? 'ADMIN' : profile.role === 'seller' ? 'SELLER' : 'USER'}
                        size="small"
                        color={profile.role === 'admin' ? 'error' : profile.role === 'seller' ? 'success' : 'primary'}
                      />
                    </Box>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Seller Onboarding Card */}
      {profile && profile.role !== 'seller' && profile.role !== 'admin' && (
        <Card sx={{ mb: 3, bgcolor: 'primary.50', borderColor: 'primary.main', borderWidth: 1, borderStyle: 'solid' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <StorefrontIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              <Box>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Start Selling on CustomiseYou
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Turn your creativity into a business. Join our marketplace today!
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleBecomeSellerClick}
              startIcon={<StorefrontIcon />}
              sx={{ mt: 2 }}
            >
              Become a Seller
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Seller Dashboard Link - For existing sellers */}
      {profile && (profile.role === 'seller' || profile.role === 'admin') && (
        <Card sx={{ mb: 3, bgcolor: 'success.50', borderColor: 'success.main', borderWidth: 1, borderStyle: 'solid' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <StorefrontIcon sx={{ fontSize: 40, color: 'success.main' }} />
              <Box>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Seller Dashboard
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage your products, orders, and view analytics
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              color="success"
              size="large"
              fullWidth
              onClick={() => router.push('/seller/dashboard')}
              endIcon={<ArrowForwardIcon />}
              sx={{ mt: 2 }}
            >
              Go to Seller Dashboard
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KYC Verification Card - For sellers */}
      {profile.role === 'seller' && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              KYC Verification
            </Typography>
            
            {kycStatus === 'not_submitted' && (
              <Box>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Complete KYC verification to start selling products on CustomiseYou
                </Alert>
                <Button
                  variant="contained"
                  onClick={() => setKycDialogOpen(true)}
                  fullWidth
                >
                  Submit KYC Details
                </Button>
              </Box>
            )}
            
            {kycStatus === 'pending' && (
              <Alert severity="info">
                Your KYC verification is pending review. We'll notify you once approved.
              </Alert>
            )}
            
            {kycStatus === 'approved' && (
              <Alert severity="success">
                ✓ KYC Verified - You can now sell products on CustomiseYou
              </Alert>
            )}
            
            {kycStatus === 'rejected' && (
              <Alert severity="error">
                KYC verification was rejected. Please contact support for assistance.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

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
              onClick={() => router.push('/addresses')}
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
                    onClick={() => router.push('/addresses')}
                  >
                    View All {addresses.length} Addresses
                  </Button>
                </Box>
              )}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Seller Onboarding Dialog */}
      <Dialog
        open={sellerDialogOpen}
        onClose={() => !isOnboarding && setSellerDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <StorefrontIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">
              Start Selling on CustomiseYou
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {onboardingError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {onboardingError}
            </Alert>
          )}
          <Typography variant="body1" paragraph>
            Ready to turn your creativity into a business? Here's what you get:
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText primary="List and sell custom products" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText primary="Platform commission applies" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText primary="You manage delivery to customers" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText primary="Access seller analytics and insights" />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setSellerDialogOpen(false)}
            disabled={isOnboarding}
          >
            Cancel
          </Button>
          <Button
            onClick={handleOnboardSeller}
            variant="contained"
            disabled={isOnboarding}
            startIcon={isOnboarding ? <CircularProgress size={20} /> : <StorefrontIcon />}
          >
            {isOnboarding ? 'Processing...' : 'Yes, Start Selling'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* KYC Submission Dialog */}
      <Dialog
        open={kycDialogOpen}
        onClose={() => !isSubmittingKyc && setKycDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Submit KYC Verification
          </Typography>
        </DialogTitle>
        <DialogContent>
          {kycError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {kycError}
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary" paragraph>
            Complete KYC verification to start selling on CustomiseYou. All information is encrypted and secure.
          </Typography>
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Legal Full Name"
                value={kycForm.legalFullName}
                onChange={(e) => setKycForm({ ...kycForm, legalFullName: e.target.value })}
                disabled={isSubmittingKyc}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="PAN Number"
                value={kycForm.panNumber}
                onChange={(e) => setKycForm({ ...kycForm, panNumber: e.target.value.toUpperCase() })}
                disabled={isSubmittingKyc}
                inputProps={{ maxLength: 10 }}
                helperText="Format: ABCDE1234F"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Bank Account Number"
                value={kycForm.bankAccountNumber}
                onChange={(e) => setKycForm({ ...kycForm, bankAccountNumber: e.target.value })}
                disabled={isSubmittingKyc}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Bank IFSC Code"
                value={kycForm.bankIfscCode}
                onChange={(e) => setKycForm({ ...kycForm, bankIfscCode: e.target.value.toUpperCase() })}
                disabled={isSubmittingKyc}
                inputProps={{ maxLength: 11 }}
                helperText="Format: ABCD0123456"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setKycDialogOpen(false)}
            disabled={isSubmittingKyc}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitKyc}
            variant="contained"
            disabled={
              isSubmittingKyc ||
              !kycForm.legalFullName ||
              !kycForm.panNumber ||
              !kycForm.bankAccountNumber ||
              !kycForm.bankIfscCode
            }
            startIcon={isSubmittingKyc ? <CircularProgress size={20} /> : null}
          >
            {isSubmittingKyc ? 'Submitting...' : 'Submit KYC'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
