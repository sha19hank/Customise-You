'use client';

import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Paper,
  Link as MuiLink,
} from '@mui/material';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import GuestOnly from '@/components/auth/GuestOnly';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    setLoading(true);

    try {
      // Login payload already matches backend schema (email + password only)
      await login({ email, password });
    } catch (err: any) {
      // Extract readable error message from various response shapes
      let errorMessage = 'Login failed. Please try again.';
      
      if (err.response?.data?.error) {
        // Backend error handler format: { error: { message, code } }
        if (typeof err.response.data.error === 'object') {
          errorMessage = err.response.data.error.message || errorMessage;
        } else if (typeof err.response.data.error === 'string') {
          errorMessage = err.response.data.error;
        }
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GuestOnly>
      <Container maxWidth="sm">
        <Box
          sx={{
            minHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            py: 8,
          }}
        >
          <Paper elevation={3} sx={{ p: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom align="center">
              Sign In
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
              sx={{ mb: 3 }}
            >
              Welcome back to CustomiseYou
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                required
                autoComplete="email"
                autoFocus
                inputProps={{
                  'data-testid': 'login-email',
                }}
              />

              <TextField
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                required
                autoComplete="current-password"
                inputProps={{
                  'data-testid': 'login-password',
                }}
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 3, mb: 2 }}
                data-testid="login-submit"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Don't have an account?{' '}
                  <MuiLink component={Link} href="/register" underline="hover">
                    Register here
                  </MuiLink>
                </Typography>
              </Box>
            </form>
          </Paper>
        </Box>
      </Container>
    </GuestOnly>
  );
}
