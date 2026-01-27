'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  Grid,
  Button,
  Card,
  CardContent,
  Radio,
  RadioGroup,
  FormControlLabel,
  Divider,
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HomeIcon from '@mui/icons-material/Home';
import WorkIcon from '@mui/icons-material/Work';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EditIcon from '@mui/icons-material/Edit';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useNotification } from '@/context/NotificationContext';
import { addressService } from '@/services/address.service';
import { Address, AddressFormData, AddressType, ADDRESS_TYPE_LABELS } from '@/types/address';

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { state: cartState } = useCart();
  const { showToast } = useNotification();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE'>('COD');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addAddressOpen, setAddAddressOpen] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  // Address form state
  const [addressForm, setAddressForm] = useState<AddressFormData>({
    fullName: '',
    phoneNumber: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    addressType: 'Home',
    isDefault: false,
  });

  // Fetch addresses on mount
  useEffect(() => {
    if (!isAuthenticated) {
      showToast('Please login to continue', 'error');
      router.push('/login');
      return;
    }

    if (cartState.items.length === 0) {
      showToast('Your cart is empty', 'info');
      router.push('/cart');
      return;
    }

    fetchAddresses();
  }, [isAuthenticated, user]);

  const fetchAddresses = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const data = await addressService.getUserAddresses(user.id);
      setAddresses(data);

      // Auto-select default address
      const defaultAddress = data.find(addr => addr.is_default);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
      }
    } catch (err: any) {
      console.error('Error fetching addresses:', err);
      setError('Failed to load addresses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddressFormChange = (field: keyof AddressFormData, value: any) => {
    setAddressForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAddAddress = async () => {
    if (!user?.id) return;

    // Validate required fields
    if (!addressForm.fullName || !addressForm.phoneNumber || !addressForm.addressLine1 ||
        !addressForm.city || !addressForm.state || !addressForm.postalCode) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    try {
      setSavingAddress(true);
      // Send exact value to backend - PostgreSQL enum is case-sensitive
      const newAddress = await addressService.addAddress(user.id, addressForm);
      setAddresses(prev => [...prev, newAddress]);
      setSelectedAddressId(newAddress.id);
      showToast('Address added successfully', 'success');
      setAddAddressOpen(false);
      
      // Reset form
      setAddressForm({
        fullName: '',
        phoneNumber: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'India',
        addressType: 'Home',
        isDefault: false,
      });
    } catch (err: any) {
      console.error('Error adding address:', err);
      const errorMessage = err.response?.data?.error?.message || 'Failed to add address';
      showToast(errorMessage, 'error');
    } finally {
      setSavingAddress(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      showToast('Please select a delivery address', 'error');
      return;
    }

    if (!user?.id) {
      showToast('Please login to continue', 'error');
      router.push('/login');
      return;
    }

    try {
      setPlacingOrder(true);

      // Format cart items for backend
      const cartItems = cartState.items.map(item => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        customizations: item.selectedCustomizations.map(custom => ({
          customizationId: custom.customizationId,
          label: custom.label,
          value: custom.value,
          priceAdjustment: custom.priceAdjustment,
        })),
      }));

      // Create order intent
      const response = await fetch('/api/v1/orders/intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: user.id,
          cartItems,
          addressId: selectedAddressId,
          paymentMethod,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create order');
      }

      const result = await response.json();
      const data = result.data; // Extract data from API response

      // Clear cart on successful order creation
      localStorage.removeItem('customiseyou-cart');

      // Redirect based on payment method
      if (paymentMethod === 'COD') {
        showToast('Order placed successfully!', 'success');
        router.push(`/orders/${data.orderId}`);
      } else {
        showToast('Redirecting to payment...', 'info');
        router.push(`/orders/${data.orderId}/payment`);
      }
    } catch (err: any) {
      console.error('Error placing order:', err);
      showToast(err.message || 'Failed to place order. Please try again.', 'error');
    } finally {
      setPlacingOrder(false);
    }
  };

  const getAddressIcon = (type: AddressType) => {
    switch (type) {
      case 'Home': return <HomeIcon />;
      case 'Work': return <WorkIcon />;
      default: return <LocationOnIcon />;
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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Checkout
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Delivery Address Section */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Delivery Address
              </Typography>
              <Button
                startIcon={<AddIcon />}
                variant="outlined"
                onClick={() => setAddAddressOpen(true)}
              >
                Add New Address
              </Button>
            </Box>

            {addresses.length === 0 ? (
              <Alert severity="info">
                No addresses found. Please add a delivery address to continue.
              </Alert>
            ) : (
              <RadioGroup
                value={selectedAddressId}
                onChange={(e) => setSelectedAddressId(e.target.value)}
              >
                {addresses.map((address) => (
                  <Card
                    key={address.id}
                    variant="outlined"
                    sx={{
                      mb: 2,
                      border: selectedAddressId === address.id ? 2 : 1,
                      borderColor: selectedAddressId === address.id ? 'primary.main' : 'divider',
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'start' }}>
                        <FormControlLabel
                          value={address.id}
                          control={<Radio />}
                          label=""
                          sx={{ mr: 1 }}
                        />
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            {getAddressIcon(address.address_type)}
                            <Typography variant="subtitle1" fontWeight="bold">
                              {address.full_name}
                            </Typography>
                            {address.is_default && (
                              <Chip label="Default" size="small" color="primary" />
                            )}
                            <Chip
                              label={ADDRESS_TYPE_LABELS[address.address_type]}
                              size="small"
                              sx={{ textTransform: 'capitalize' }}
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {address.address_line1}
                            {address.address_line2 && `, ${address.address_line2}`}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {address.city}, {address.state} - {address.postal_code}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {address.country}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Phone: {address.phone_number}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </RadioGroup>
            )}
          </Paper>

          {/* Payment Method */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Payment Method
            </Typography>
            <RadioGroup
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as 'COD' | 'ONLINE')}
            >
              <Card
                variant="outlined"
                sx={{
                  mb: 2,
                  border: paymentMethod === 'COD' ? 2 : 1,
                  borderColor: paymentMethod === 'COD' ? 'primary.main' : 'divider',
                }}
              >
                <CardContent>
                  <FormControlLabel
                    value="COD"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Cash on Delivery (COD)
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Pay when you receive the order
                        </Typography>
                      </Box>
                    }
                  />
                </CardContent>
              </Card>

              <Card
                variant="outlined"
                sx={{
                  border: paymentMethod === 'ONLINE' ? 2 : 1,
                  borderColor: paymentMethod === 'ONLINE' ? 'primary.main' : 'divider',
                }}
              >
                <CardContent>
                  <FormControlLabel
                    value="ONLINE"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Online Payment
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Pay securely online (UPI, Card, Net Banking)
                        </Typography>
                        <Alert severity="info" sx={{ mt: 1 }}>
                          Payment gateway integration coming soon
                        </Alert>
                      </Box>
                    }
                  />
                </CardContent>
              </Card>
            </RadioGroup>
          </Paper>
        </Grid>

        {/* Order Summary */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
            <Typography variant="h6" gutterBottom>
              Order Summary
            </Typography>

            <Divider sx={{ my: 2 }} />

            {/* Cart Items */}
            <Box sx={{ mb: 2 }}>
              {cartState.items.map((item, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium">
                      {item.name} x {item.quantity}
                    </Typography>
                    <Typography variant="body2">
                      ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                    </Typography>
                  </Box>
                  {item.selectedCustomizations.length > 0 && (
                    <Box sx={{ ml: 2 }}>
                      {item.selectedCustomizations.map((custom, idx) => (
                        <Typography key={idx} variant="caption" color="text.secondary" display="block">
                          • {custom.label}: {custom.value}
                          {custom.priceAdjustment > 0 && ` (+₹${custom.priceAdjustment})`}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Box>
              ))}
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Price Summary */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Subtotal ({cartState.totalItems} items)
                </Typography>
                <Typography variant="body2">
                  ₹{cartState.totalPrice.toLocaleString('en-IN')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Delivery Fee
                </Typography>
                <Typography variant="body2" color="success.main">
                  FREE
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6">
                Total
              </Typography>
              <Typography variant="h6" color="primary">
                ₹{cartState.totalPrice.toLocaleString('en-IN')}
              </Typography>
            </Box>

            <Button
              variant="contained"
              fullWidth
              size="large"
              disabled={!selectedAddressId || cartState.items.length === 0 || placingOrder}
              onClick={handlePlaceOrder}
            >
              {placingOrder ? 'Placing Order...' : paymentMethod === 'COD' ? 'Place Order' : 'Proceed to Payment'}
            </Button>

            <Button
              variant="text"
              fullWidth
              onClick={() => router.push('/cart')}
              sx={{ mt: 2 }}
            >
              Back to Cart
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Add Address Dialog */}
      <Dialog
        open={addAddressOpen}
        onClose={() => !savingAddress && setAddAddressOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Address</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Full Name"
                  required
                  value={addressForm.fullName}
                  onChange={(e) => handleAddressFormChange('fullName', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  required
                  value={addressForm.phoneNumber}
                  onChange={(e) => handleAddressFormChange('phoneNumber', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address Line 1"
                  required
                  value={addressForm.addressLine1}
                  onChange={(e) => handleAddressFormChange('addressLine1', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address Line 2 (Optional)"
                  value={addressForm.addressLine2}
                  onChange={(e) => handleAddressFormChange('addressLine2', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="City"
                  required
                  value={addressForm.city}
                  onChange={(e) => handleAddressFormChange('city', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="State"
                  required
                  value={addressForm.state}
                  onChange={(e) => handleAddressFormChange('state', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Postal Code"
                  required
                  value={addressForm.postalCode}
                  onChange={(e) => handleAddressFormChange('postalCode', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Country"
                  required
                  value={addressForm.country}
                  onChange={(e) => handleAddressFormChange('country', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Address Type</InputLabel>
                  <Select
                    value={addressForm.addressType}
                    label="Address Type"
                    onChange={(e) => handleAddressFormChange('addressType', e.target.value as AddressType)}
                  >
                    <MenuItem value="Home">Home</MenuItem>
                    <MenuItem value="Work">Work</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Radio
                      checked={addressForm.isDefault}
                      onChange={(e) => handleAddressFormChange('isDefault', e.target.checked)}
                    />
                  }
                  label="Set as default address"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddAddressOpen(false)} disabled={savingAddress}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddAddress}
            disabled={savingAddress}
          >
            {savingAddress ? 'Saving...' : 'Add Address'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
