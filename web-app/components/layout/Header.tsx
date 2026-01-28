'use client';

import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  IconButton,
  Badge,
  Tooltip,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const { state } = useCart();
  const { state: wishlistState } = useWishlist();
  const router = useRouter();

  return (
    <AppBar position="static" elevation={1}>
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          <Typography
            variant="h6"
            component={Link}
            href="/"
            sx={{
              flexGrow: 1,
              textDecoration: 'none',
              color: 'inherit',
              fontWeight: 700,
            }}
          >
            CustomiseYou
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {/* Wishlist Icon */}
            <IconButton
              color="inherit"
              onClick={() => router.push('/wishlist')}
              aria-label="wishlist"
            >
              <Badge badgeContent={wishlistState.items.length} color="error">
                {wishlistState.items.length > 0 ? (
                  <FavoriteIcon />
                ) : (
                  <FavoriteBorderIcon />
                )}
              </Badge>
            </IconButton>

            {/* Cart Icon */}
            <IconButton
              color="inherit"
              onClick={() => router.push('/cart')}
              aria-label="shopping cart"
            >
              <Badge badgeContent={state.totalItems} color="error">
                <ShoppingCartIcon />
              </Badge>
            </IconButton>

            {isAuthenticated ? (
              <>
                {/* Profile Icon */}
                <Tooltip title={`Hi, ${user?.firstName || user?.email.split('@')[0] || 'User'}`} arrow>
                  <IconButton
                    color="inherit"
                    onClick={() => router.push('/profile')}
                    aria-label="profile"
                    sx={{ ml: 1 }}
                  >
                    <AccountCircleIcon sx={{ fontSize: 32 }} />
                  </IconButton>
                </Tooltip>
                <Button color="inherit" onClick={logout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button color="inherit" component={Link} href="/login">
                  Login
                </Button>
                <Button
                  variant="outlined"
                  color="inherit"
                  component={Link}
                  href="/register"
                >
                  Register
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
