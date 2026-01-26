import './globals.css'
import type { Metadata } from 'next'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from '@/theme/theme';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { NotificationProvider } from '@/context/NotificationContext';
import Header from '@/components/layout/Header';

export const metadata: Metadata = {
  title: 'CustomiseYou - Personalized Products Marketplace',
  description: 'Discover and customize unique products from talented sellers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <NotificationProvider>
              <AuthProvider>
                <CartProvider>
                  <Header />
                  <main>{children}</main>
                </CartProvider>
              </AuthProvider>
            </NotificationProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  )
}
