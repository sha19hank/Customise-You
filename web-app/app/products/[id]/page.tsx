'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  Grid,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Rating,
  LinearProgress,
  Avatar,
  Paper,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StarIcon from '@mui/icons-material/Star';
import VerifiedIcon from '@mui/icons-material/Verified';
import { productService } from '@/services/product.service';
import { customizationService } from '@/services/customization.service';
import { reviewService } from '@/services/review.service';
import { Product } from '@/types/product';
import { CustomizationOption, CustomizationSelection, ReviewListResponse } from '@/types/customization';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [customizations, setCustomizations] = useState<CustomizationOption[]>([]);
  const [reviews, setReviews] = useState<ReviewListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Customization state
  const [selectedCustomizations, setSelectedCustomizations] = useState<CustomizationSelection>({});
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        
        console.log('[Product Detail] Fetching product ID:', productId);
        console.log('[Product Detail] API URL:', process.env.NEXT_PUBLIC_API_URL);
        
        // Fetch product first (required)
        const productData = await productService.getProductById(productId);
        console.log('[Product Detail] Product loaded:', productData.name);
        
        setProduct(productData);
        setTotalPrice(Number(productData.base_price || 0));

        // Fetch customizations and reviews (optional - don't fail if they error)
        try {
          const customizationsData = await customizationService.getProductCustomizations(productId);
          console.log('[Product Detail] Customizations loaded:', customizationsData.length);
          setCustomizations(customizationsData || []);
        } catch (customErr) {
          console.warn('[Product Detail] Failed to load customizations:', customErr);
          setCustomizations([]);
        }

        try {
          const reviewsData = await reviewService.getProductReviews(productId, 1, 5);
          console.log('[Product Detail] Reviews loaded:', reviewsData?.meta?.totalReviews || 0);
          setReviews(reviewsData);
        } catch (reviewErr) {
          console.warn('[Product Detail] Failed to load reviews:', reviewErr);
          setReviews(null);
        }

      } catch (err: any) {
        console.error('[Product Detail] Error fetching product:', err);
        console.error('[Product Detail] Error response:', err.response?.data);
        console.error('[Product Detail] Error status:', err.response?.status);
        
        // Extract meaningful error message
        const errorMessage = err.response?.data?.error?.message || 
                           err.response?.data?.message || 
                           err.message || 
                           'Failed to load product details';
        
        // Set user-friendly error based on status
        if (err.response?.status === 404) {
          setError('Product not found. It may have been removed or is no longer available.');
        } else if (err.response?.status === 401) {
          setError('Please log in to view this product.');
        } else {
          setError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchData();
    }
  }, [productId]);

  const handleCustomizationChange = (customization: CustomizationOption, value: any) => {
    const newSelections = { ...selectedCustomizations };
    
    newSelections[customization.id] = {
      customizationId: customization.id,
      value,
      label: customization.label,
      priceAdjustment: customization.price_adjustment || 0,
    };

    setSelectedCustomizations(newSelections);

    // Recalculate total price
    const basePrice = Number(product?.base_price || 0);
    const customizationTotal = Object.values(newSelections).reduce(
      (sum, item) => sum + (item.priceAdjustment || 0),
      0
    );
    setTotalPrice(basePrice + customizationTotal);
  };

  const renderCustomizationInput = (customization: CustomizationOption) => {
    const currentValue = selectedCustomizations[customization.id]?.value || '';

    switch (customization.input_type) {
      case 'text':
      case 'number':
        return (
          <TextField
            fullWidth
            type={customization.input_type}
            label={customization.label}
            required={customization.is_required}
            value={currentValue}
            onChange={(e) => handleCustomizationChange(customization, e.target.value)}
            helperText={customization.description}
            InputProps={{
              endAdornment: customization.price_adjustment > 0 && (
                <Typography variant="caption" color="primary">
                  +₹{customization.price_adjustment}
                </Typography>
              ),
            }}
          />
        );

      case 'textarea':
        return (
          <TextField
            fullWidth
            multiline
            rows={3}
            label={customization.label}
            required={customization.is_required}
            value={currentValue}
            onChange={(e) => handleCustomizationChange(customization, e.target.value)}
            helperText={customization.description}
          />
        );

      case 'dropdown':
        return (
          <FormControl fullWidth required={customization.is_required}>
            <InputLabel>{customization.label}</InputLabel>
            <Select
              value={currentValue}
              label={customization.label}
              onChange={(e) => handleCustomizationChange(customization, e.target.value)}
            >
              {customization.options?.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'radio':
        return (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {customization.label}
              {customization.is_required && <span style={{ color: 'red' }}> *</span>}
            </Typography>
            <RadioGroup
              value={currentValue}
              onChange={(e) => handleCustomizationChange(customization, e.target.value)}
            >
              {customization.options?.map((option) => (
                <FormControlLabel
                  key={option}
                  value={option}
                  control={<Radio />}
                  label={option}
                />
              ))}
            </RadioGroup>
          </Box>
        );

      case 'color_picker':
        return (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {customization.label}
            </Typography>
            <input
              type="color"
              value={currentValue as string || '#000000'}
              onChange={(e) => handleCustomizationChange(customization, e.target.value)}
              style={{ width: '100%', height: 50, cursor: 'pointer' }}
            />
          </Box>
        );

      default:
        return (
          <TextField
            fullWidth
            label={customization.label}
            required={customization.is_required}
            value={currentValue}
            onChange={(e) => handleCustomizationChange(customization, e.target.value)}
          />
        );
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

  if (error || !product) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Product not found'}
        </Alert>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/products')}
          >
            Back to Products
          </Button>
          {error && (
            <Button
              variant="contained"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          )}
        </Box>
      </Container>
    );
  }

  const imageUrl = product.image_url || product.main_image_url || product.images?.[0] || '/placeholder-product.jpg';
  const basePrice = Number(product.base_price || 0);
  const deliveryPrice = Number(product.delivery_price || 0);
  const stockQuantity = product.stock_quantity ?? product.quantity_available ?? 0;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push('/products')}
        sx={{ mb: 3 }}
      >
        Back to Products
      </Button>

      <Grid container spacing={4}>
        {/* Product Image */}
        <Grid item xs={12} md={6}>
          <Box
            component="img"
            src={imageUrl}
            alt={product.name}
            sx={{
              width: '100%',
              maxHeight: 500,
              objectFit: 'cover',
              borderRadius: 2,
            }}
          />
        </Grid>

        {/* Product Details */}
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            {product.is_customizable && (
              <Chip label="Customizable" color="primary" />
            )}
            {product.status === 'active' && stockQuantity > 0 ? (
              <Chip label="In Stock" color="success" variant="outlined" />
            ) : (
              <Chip label="Out of Stock" color="error" variant="outlined" />
            )}
          </Box>

          <Typography variant="h3" gutterBottom>
            {product.name}
          </Typography>

          {/* Rating */}
          {reviews?.meta && reviews.meta.totalReviews > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Rating value={reviews.meta.averageRating} precision={0.1} readOnly />
              <Typography variant="body2" color="text.secondary">
                {reviews.meta.averageRating.toFixed(1)} ({reviews.meta.totalReviews} reviews)
              </Typography>
            </Box>
          )}

          <Typography variant="h4" color="primary" sx={{ mb: 1 }}>
            ₹{totalPrice.toLocaleString('en-IN')}
          </Typography>
          
          {totalPrice > basePrice && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Base price: ₹{basePrice.toLocaleString('en-IN')} + ₹
              {(totalPrice - basePrice).toLocaleString('en-IN')} customization
            </Typography>
          )}

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Description
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            {product.description || 'No description available.'}
          </Typography>

          <Divider sx={{ my: 3 }} />

          {/* Seller Info */}
          {product.seller?.business_name && (
            <>
              <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {product.seller.business_name.charAt(0)}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {product.seller.business_name}
                      {product.seller.badge && (
                        <VerifiedIcon color="primary" fontSize="small" />
                      )}
                    </Typography>
                    {product.seller.average_rating != null && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <StarIcon fontSize="small" color="warning" />
                        <Typography variant="body2" color="text.secondary">
                          {Number(product.seller.average_rating).toFixed(1)}
                        </Typography>
                        {product.seller.total_orders != null && (
                          <Typography variant="body2" color="text.secondary">
                            • {product.seller.total_orders} orders
                          </Typography>
                        )}
                      </Box>
                    )}
                    {product.seller.experience_level && (
                      <Chip
                        label={product.seller.experience_level}
                        size="small"
                        sx={{ mt: 0.5, textTransform: 'capitalize' }}
                      />
                    )}
                  </Box>
                </Box>
              </Card>
              <Divider sx={{ my: 3 }} />
            </>
          )}
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Stock
                  </Typography>
                  <Typography variant="body1">
                    {stockQuantity} available
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Delivery
                  </Typography>
                  <Typography variant="body1">
                    {deliveryPrice === 0 ? 'Free Delivery' : `₹${deliveryPrice.toLocaleString('en-IN')}`}
                  </Typography>
                </Grid>
                {product.category_name && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Category
                    </Typography>
                    <Typography variant="body1">
                      {product.category_name}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Add to Cart Button */}
          <Button
            variant="contained"
            size="large"
            fullWidth
            disabled={product.status !== 'active' || stockQuantity === 0}
            onClick={() => {
              const customizationSummary = Object.values(selectedCustomizations)
                .map(c => `${c.label}: ${c.value}`)
                .join('\n');
              alert(`Cart feature coming soon!\n\nSelected customizations:\n${customizationSummary || 'None'}`);
            }}
            sx={{ mb: 2 }}
          >
            {stockQuantity === 0 ? 'Out of Stock' : 'Add to Cart'}
          </Button>

          {product.is_customizable && customizations.length === 0 && (
            <Alert severity="info">
              This product supports customization. Options will appear here when configured by the seller.
            </Alert>
          )}
        </Grid>
      </Grid>

      {/* Customization Section */}
      {product.is_customizable && customizations.length > 0 && (
        <Box sx={{ mt: 6 }}>
          <Typography variant="h4" gutterBottom>
            Customize Your Product
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Personalize this product to make it uniquely yours
          </Typography>

          <Grid container spacing={3}>
            {customizations.map((customization) => (
              <Grid item xs={12} md={6} key={customization.id}>
                <Paper sx={{ p: 3 }}>
                  {renderCustomizationInput(customization)}
                  {customization.price_adjustment > 0 && (
                    <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block' }}>
                      Additional charge: ₹{customization.price_adjustment}
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Reviews Section */}
      {reviews && reviews.meta.totalReviews > 0 && (
        <Box sx={{ mt: 6 }}>
          <Typography variant="h4" gutterBottom>
            Customer Reviews
          </Typography>

          {/* Rating Summary */}
          <Card sx={{ mb: 3, p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h2" color="primary">
                    {reviews.meta.averageRating.toFixed(1)}
                  </Typography>
                  <Rating value={reviews.meta.averageRating} precision={0.1} readOnly size="large" />
                  <Typography variant="body2" color="text.secondary">
                    Based on {reviews.meta.totalReviews} reviews
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={8}>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <Box key={rating} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Typography variant="body2" sx={{ minWidth: 50 }}>
                      {rating} star
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(reviews.meta.ratingDistribution[rating as keyof typeof reviews.meta.ratingDistribution] / reviews.meta.totalReviews) * 100}
                      sx={{ flex: 1, height: 8, borderRadius: 1 }}
                    />
                    <Typography variant="body2" sx={{ minWidth: 40 }}>
                      {reviews.meta.ratingDistribution[rating as keyof typeof reviews.meta.ratingDistribution]}
                    </Typography>
                  </Box>
                ))}
              </Grid>
            </Grid>
          </Card>

          {/* Individual Reviews */}
          <Grid container spacing={3}>
            {reviews.data.map((review) => (
              <Grid item xs={12} key={review.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                      <Avatar>{review.user_name?.charAt(0) || 'U'}</Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1">
                          {review.user_name || 'Anonymous'}
                        </Typography>
                        <Rating value={review.rating} readOnly size="small" sx={{ mb: 1 }} />
                        <Typography variant="h6" gutterBottom>
                          {review.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {review.content}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          {new Date(review.created_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Container>
  );
}
