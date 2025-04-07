import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { CircularProgress, Box, Typography } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import AuthUtils from '../utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, checkAuth } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const location = useLocation();
  
  console.log('🛡️ ProtectedRoute: Component rendering', {
    isAuthenticated,
    isLoading,
    isVerifying,
    pathname: location.pathname,
    hasToken: !!AuthUtils.getToken(),
    sessionFlag: sessionStorage.getItem('isLoggedIn'),
    time: new Date().toISOString()
  });
  
  useEffect(() => {
    console.log('🛡️ ProtectedRoute: Component mounted, checking auth');
    
    // DEVELOPMENT MODE: BYPASSING ALL AUTHENTICATION
    if (process.env.NODE_ENV !== 'production') {
      console.log('🛡️ ProtectedRoute: DEV MODE - IMMEDIATELY BYPASSING ALL AUTHENTICATION CHECKS');
      setIsVerifying(false);
      return;
    }
    
    const verifyAuth = async () => {
      console.log('🛡️ ProtectedRoute: Verifying authentication...');
      try {
        // Run auth check to make sure token is still valid
        const isValid = await checkAuth();
        console.log('🛡️ ProtectedRoute: Auth check completed, isValid =', isValid);
      } catch (error) {
        console.error('🛡️ ProtectedRoute: Error checking authentication', error);
      } finally {
        setIsVerifying(false);
      }
    };
    
    verifyAuth();
  }, [checkAuth]);
  
  // Force check for token
  useEffect(() => {
    const token = AuthUtils.getToken();
    const sessionFlag = sessionStorage.getItem('isLoggedIn');
    
    console.log('🛡️ ProtectedRoute: Direct token check', {
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 10)}...` : 'none',
      sessionFlag,
      path: location.pathname,
      time: new Date().toISOString()
    });
    
    // For development mode, allow manual bypass on local storage
    if (process.env.NODE_ENV !== 'production' && (token || sessionFlag === 'true')) {
      console.log('🛡️ ProtectedRoute: DEV MODE - Token or session flag found, explicitly allowing access');
      setIsVerifying(false);
    }
  }, [location.pathname]);
  
  // Show loading spinner while checking authentication
  if (isLoading || isVerifying) {
    // DEV MODE - Skip loading state
    if (process.env.NODE_ENV !== 'production') {
      console.log('🛡️ ProtectedRoute: DEV MODE - Skipping loading state, rendering children');
      return <>{children}</>;
    }
    
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh'
        }}
      >
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Verifying authentication...
        </Typography>
      </Box>
    );
  }
  
  // In development mode, always let the user through
  if (process.env.NODE_ENV !== 'production') {
    console.log('🛡️ ProtectedRoute: DEV MODE - Always allowing access to protected route');
    return <>{children}</>;
  }
  
  // In production, verify authentication
  if (!isAuthenticated) {
    console.log('🛡️ ProtectedRoute: User not authenticated, redirecting to login', {
      hasToken: !!AuthUtils.getToken(),
      sessionFlag: sessionStorage.getItem('isLoggedIn')
    });
    // Redirect to login and save the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // User is authenticated, render the protected component
  console.log('🛡️ ProtectedRoute: User authenticated, rendering protected content');
  return <>{children}</>;
};

export default ProtectedRoute;
