'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

// Notification type
interface Notification {
  message: string;
  severity: AlertColor;
}

// Context type
interface NotificationContextType {
  showToast: (message: string, severity?: AlertColor) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Notification Provider
export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notification, setNotification] = useState<Notification | null>(null);
  const [open, setOpen] = useState(false);

  const showToast = (message: string, severity: AlertColor = 'success') => {
    setNotification({ message, severity });
    setOpen(true);
  };

  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    // Don't close on clickaway
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  return (
    <NotificationContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Notification */}
      <Snackbar
        open={open}
        autoHideDuration={3000}
        onClose={handleClose}
        anchorOrigin={{ 
          vertical: 'bottom', 
          horizontal: 'center' 
        }}
        sx={{
          // Desktop: bottom-right
          '@media (min-width: 600px)': {
            left: 'auto',
            right: 24,
            bottom: 24,
          },
          // Mobile: bottom-center
          '@media (max-width: 599px)': {
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 16,
          },
        }}
      >
        <Alert
          onClose={handleClose}
          severity={notification?.severity || 'success'}
          variant="filled"
          sx={{ width: '100%', minWidth: 250 }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};

// Custom hook to use notification context
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};
