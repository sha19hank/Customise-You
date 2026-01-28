'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Skeleton,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HomeIcon from '@mui/icons-material/Home';
import WorkIcon from '@mui/icons-material/Work';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { addressService } from '@/services/address.service';
import { Address, AddressFormData, AddressType, ADDRESS_TYPE_LABELS } from '@/types/address';

export default function AddressesPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { showToast } = useNotification();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch addresses
  useEffect(() => {
    if (user?.id) {
      fetchAddresses();
    }
  }, [user]);

  const fetchAddresses = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const data = await addressService.getUserAddresses(user.id);
      setAddresses(data);
    } catch (err: any) {
      console.error('Error fetching addresses:', err);
      showToast('Failed to load addresses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (address?: Address) => {
    if (address) {
      // Editing existing address
      setEditingAddress(address);
      setAddressForm({
        fullName: address.full_name,
        phoneNumber: address.phone_number,
        addressLine1: address.address_line1,
        addressLine2: address.address_line2 || '',
        city: address.city,
        state: address.state,
        postalCode: address.postal_code,
        country: address.country,
        addressType: address.address_type,
        isDefault: address.is_default,
      });
    } else {
      // Adding new address
      setEditingAddress(null);
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
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAddress(null);
  };

  const handleSaveAddress = async () => {
    if (!user?.id) return;

    // Validation
    if (!addressForm.fullName.trim()) {
      showToast('Full name is required', 'error');
      return;
    }
    if (!addressForm.phoneNumber.trim()) {
      showToast('Phone number is required', 'error');
      return;
    }
    if (!addressForm.addressLine1.trim()) {
      showToast('Address is required', 'error');
      return;
    }
    if (!addressForm.city.trim()) {
      showToast('City is required', 'error');
      return;
    }
    if (!addressForm.state.trim()) {
      showToast('State is required', 'error');
      return;
    }
    if (!addressForm.postalCode.trim()) {
      showToast('Postal code is required', 'error');
      return;
    }

    try {
      setSavingAddress(true);

      if (editingAddress) {
        // Update existing address
        await addressService.updateAddress(user.id, editingAddress.id, addressForm);
        showToast('Address updated successfully', 'success');
      } else {
        // Add new address
        await addressService.addAddress(user.id, addressForm);
        showToast('Address added successfully', 'success');
      }

      handleCloseDialog();
      fetchAddresses();
    } catch (err: any) {
      console.error('Error saving address:', err);
      showToast(err.response?.data?.error?.message || 'Failed to save address', 'error');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!user?.id) return;
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      setDeletingId(addressId);
      await addressService.deleteAddress(user.id, addressId);
      showToast('Address deleted successfully', 'success');
      fetchAddresses();
    } catch (err: any) {
      console.error('Error deleting address:', err);
      showToast(err.response?.data?.error?.message || 'Failed to delete address', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const getAddressIcon = (type: AddressType) => {
    switch (type) {
      case 'Home':
        return <HomeIcon />;
      case 'Work':
        return <WorkIcon />;
      default:
        return <LocationOnIcon />;
    }
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Skeleton variant="text" width={200} height={60} />
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={6}>
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            My Addresses
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your delivery addresses
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Address
        </Button>
      </Box>

      {/* Addresses Grid */}
      {addresses.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <LocationOnIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No saved addresses
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Add your first delivery address to get started
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Add Address
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {addresses.map((address) => (
            <Grid item xs={12} sm={6} key={address.id}>
              <Card
                variant="outlined"
                sx={{
                  position: 'relative',
                  border: address.is_default ? 2 : 1,
                  borderColor: address.is_default ? 'primary.main' : 'divider',
                  '&:hover': {
                    boxShadow: 2,
                  },
                }}
              >
                <CardContent>
                  {/* Default Badge */}
                  {address.is_default && (
                    <Chip
                      label="Default"
                      size="small"
                      color="primary"
                      icon={<CheckCircleIcon />}
                      sx={{ position: 'absolute', top: 12, right: 12 }}
                    />
                  )}

                  {/* Address Type Icon */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ color: 'primary.main', mr: 1 }}>
                      {getAddressIcon(address.address_type)}
                    </Box>
                    <Chip
                      label={ADDRESS_TYPE_LABELS[address.address_type]}
                      size="small"
                      variant="outlined"
                    />
                  </Box>

                  {/* Address Details */}
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    {address.full_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {address.address_line1}
                    {address.address_line2 && `, ${address.address_line2}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {address.city}, {address.state} - {address.postal_code}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Phone: {address.phone_number}
                  </Typography>

                  {/* Action Buttons */}
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => handleOpenDialog(address)}
                      disabled={deletingId === address.id}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteAddress(address.id)}
                      disabled={deletingId === address.id}
                    >
                      {deletingId === address.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Address Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingAddress ? 'Edit Address' : 'Add New Address'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={addressForm.fullName}
                  onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={addressForm.phoneNumber}
                  onChange={(e) => setAddressForm({ ...addressForm, phoneNumber: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address Line 1"
                  value={addressForm.addressLine1}
                  onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })}
                  required
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address Line 2 (Optional)"
                  value={addressForm.addressLine2}
                  onChange={(e) => setAddressForm({ ...addressForm, addressLine2: e.target.value })}
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="City"
                  value={addressForm.city}
                  onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="State"
                  value={addressForm.state}
                  onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Postal Code"
                  value={addressForm.postalCode}
                  onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Country"
                  value={addressForm.country}
                  onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Address Type</InputLabel>
                  <Select
                    value={addressForm.addressType}
                    onChange={(e) => setAddressForm({ ...addressForm, addressType: e.target.value as AddressType })}
                    label="Address Type"
                  >
                    <MenuItem value="Home">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <HomeIcon fontSize="small" />
                        Home
                      </Box>
                    </MenuItem>
                    <MenuItem value="Work">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <WorkIcon fontSize="small" />
                        Work
                      </Box>
                    </MenuItem>
                    <MenuItem value="Other">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOnIcon fontSize="small" />
                        Other
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={addressForm.isDefault}
                      onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                    />
                  }
                  label="Set as default address"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={savingAddress}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveAddress}
            variant="contained"
            disabled={savingAddress}
          >
            {savingAddress ? 'Saving...' : editingAddress ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
