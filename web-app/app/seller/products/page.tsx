'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useRouter } from 'next/navigation';

interface Product {
  id: string;
  name: string;
  slug: string;
  base_price: string;
  quantity_available: number;
  status: string;
  is_customizable: boolean;
  quantity_sold: number;
  created_at: string;
}

export default function SellerProducts() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('customiseyou_access_token');
      const userStr = localStorage.getItem('user');
      
      if (!userStr) {
        setError('User not found');
        return;
      }

      const user = JSON.parse(userStr);
      const sellerId = user.id;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/seller/products?sellerId=${sellerId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      setProducts(data.data);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message || 'Failed to load products');
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Products
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your product listings
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push('/seller/products/new')}
        >
          Add Product
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {products.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" gutterBottom>
              No products yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Start by adding your first product
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => router.push('/seller/products/new')}>
              Add Product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Product Name</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Stock</TableCell>
                <TableCell>Sold</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Customizable</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {product.name}
                    </Typography>
                  </TableCell>
                  <TableCell>₹{Number(product.base_price).toLocaleString('en-IN')}</TableCell>
                  <TableCell>
                    <Chip
                      label={product.quantity_available}
                      size="small"
                      color={product.quantity_available > 10 ? 'success' : product.quantity_available > 0 ? 'warning' : 'error'}
                    />
                  </TableCell>
                  <TableCell>{product.quantity_sold || 0}</TableCell>
                  <TableCell>
                    <Chip
                      label={product.status}
                      size="small"
                      color={product.status === 'active' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    {product.is_customizable ? (
                      <Chip label="Yes" size="small" color="primary" variant="outlined" />
                    ) : (
                      <Chip label="No" size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => router.push(`/seller/products/${product.id}/edit`)}
                    >
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
