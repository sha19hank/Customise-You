'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  AppBar,
  Typography,
  CircularProgress,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import Link from 'next/link';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, href: '/seller/dashboard' },
  { text: 'Products', icon: <InventoryIcon />, href: '/seller/products' },
  { text: 'Orders', icon: <ShoppingBagIcon />, href: '/seller/orders' },
];

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSeller, setIsSeller] = useState(false);

  useEffect(() => {
    // Check if user is logged in and is a seller
    const checkAuth = () => {
      const token = localStorage.getItem('customiseyou_access_token');
      const userStr = localStorage.getItem('user');
      
      console.log('[Seller Layout] Checking auth...', { token: !!token, userStr });
      
      if (!token || !userStr) {
        console.log('[Seller Layout] No token or user, redirecting to login');
        router.push('/login');
        return;
      }

      try {
        const user = JSON.parse(userStr);
        console.log('[Seller Layout] User role:', user.role);
        
        if (user.role !== 'seller' && user.role !== 'admin') {
          console.log('[Seller Layout] Not a seller, redirecting to home');
          router.push('/');
          return;
        }
        
        console.log('[Seller Layout] Access granted');
        setIsSeller(true);
        setLoading(false);
      } catch (error) {
        console.error('[Seller Layout] Error parsing user:', error);
        router.push('/login');
      }
    };

    checkAuth();
    
    // Listen for storage changes (in case user becomes seller in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' || e.key === 'customiseyou_access_token') {
        console.log('[Seller Layout] Storage changed, rechecking auth');
        checkAuth();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []); // Empty dependency array - only run once on mount

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isSeller) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            mt: 8,
          },
        }}
      >
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton component={Link} href={item.href}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        <Container maxWidth="xl">
          {children}
        </Container>
      </Box>
    </Box>
  );
}
