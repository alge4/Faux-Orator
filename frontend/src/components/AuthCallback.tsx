import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CircularProgress, Typography, Box, Button, Alert, Paper, Divider } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import AuthUtils from '../utils/auth';

const AuthCallback: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({});
  const navigate = useNavigate();
  const location = useLocation();
  const { checkAuth, isAuthenticated, isLoading } = useAuth();
  
  console.log('🔍 AuthCallback: Component rendered', { 
    isAuthenticated,
    isLoading,
    currentUrl: window.location.href,
    hasNavigate: !!navigate,
    pathname: location.pathname
  });

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔍 AuthCallback: Processing auth callback - START', {
          time: new Date().toISOString(),
          url: window.location.href
        });
        
        // Get URL parameters
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get('code');
        const urlError = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        const token = urlParams.get('token');
        const state = urlParams.get('state');
        
        // Collect debug info
        const debug = {
          url: window.location.href,
          hasCode: !!code,
          hasToken: !!token,
          hasState: !!state,
          hasError: !!urlError,
          errorDetails: urlError ? `${urlError}: ${errorDescription || 'No description'}` : null,
          currentTimestamp: new Date().toISOString(),
          localStorage: {
            hasToken: !!localStorage.getItem('auth_token'),
            isLoggedIn: sessionStorage.getItem('isLoggedIn'),
            timeNow: Date.now()
          },
          authContext: {
            isAuthenticated,
            isLoading
          }
        };
        
        console.log('🔍 AuthCallback: Debug info', debug);
        setDebugInfo(debug);
        
        // Handle errors passed in URL
        if (urlError) {
          console.error(`🔍 AuthCallback: Authentication error: ${urlError}`, errorDescription);
          setError(`Authentication failed: ${urlError}\n${errorDescription || ''}`);
          setLoading(false);
          return;
        }

        // If we have a token directly in the URL (our backend redirects here with a token)
        if (token) {
          console.log('🔍 AuthCallback: Token received in URL, storing it', {
            tokenPreview: token.substring(0, 10) + '...',
            tokenLength: token.length,
            timestamp: Date.now()
          });
          
          // Store the token
          AuthUtils.setToken(token);
          console.log('🔍 AuthCallback: Token stored in localStorage', {
            hasToken: !!localStorage.getItem('auth_token'),
            timestamp: Date.now()
          });
          
          // Set session flag to maintain login state
          sessionStorage.setItem('isLoggedIn', 'true');
          console.log('🔍 AuthCallback: Session flag set', {
            isLoggedIn: sessionStorage.getItem('isLoggedIn')
          });
          
          // IMMEDIATE REDIRECT - Don't wait for auth state to update
          console.log('🔍 AuthCallback: EMERGENCY REDIRECT to dashboard');
          window.location.replace('/dashboard');
          return;
        }
        
        // If we have an authorization code, let the backend handle the exchange
        if (code) {
          console.log('🔍 AuthCallback: Authorization code received, redirecting to backend', {
            codePreview: code.substring(0, 5) + '...',
            hasState: !!state
          });
          
          // Build backend URL with config fallback
          const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
          
          // Pass all relevant parameters to the backend callback
          const redirectParams = new URLSearchParams();
          redirectParams.append('code', code);
          redirectParams.append('redirect_uri', `${window.location.origin}/auth/callback`);
          
          // Add state if we have it (important for security)
          if (state) {
            redirectParams.append('state', state);
          }
          
          // If in development, add the code_verifier directly in the URL for backup
          // This is a workaround for session issues in development
          if (process.env.NODE_ENV !== 'production') {
            const mockVerifier = sessionStorage.getItem('pkce_verifier');
            if (mockVerifier) {
              redirectParams.append('code_verifier', mockVerifier);
              console.log('🔍 AuthCallback: DEV MODE - Added code_verifier to request', {
                verifierPreview: mockVerifier.substring(0, 5) + '...'
              });
            } else {
              console.warn('🔍 AuthCallback: No code_verifier found in sessionStorage');
            }
          }
          
          // Build the redirect URL
          const redirectUrl = `${backendUrl}/api/auth/microsoft/callback?${redirectParams.toString()}`;
          
          console.log('🔍 AuthCallback: Redirecting to backend callback:', redirectUrl);
          
          // Store in debug info
          setDebugInfo(prev => ({ ...prev, redirectUrl }));
          
          // Redirect to backend
          window.location.href = redirectUrl;
              return;
            }
            
        // If we don't have a code or token, something went wrong
        console.error('🔍 AuthCallback: No code or token found in URL');
        setError('Authentication failed: No authorization code or token received');
        setLoading(false);
      } catch (error: any) {
        console.error('🔍 AuthCallback: Error during authentication', {
          error: error.message,
          stack: error.stack
        });
        setError(`Authentication failed: ${error.message || 'Unknown error'}`);
        setDebugInfo(prev => ({ ...prev, error: error.message || 'Unknown error', stack: error.stack }));
        setLoading(false);
      }
    };

    handleCallback();
  }, [location.search, navigate, checkAuth, isAuthenticated, isLoading]);
  
  // Add another effect to monitor auth state changes
  useEffect(() => {
    console.log('🔍 AuthCallback: Auth state change detected', {
      isAuthenticated,
      isLoading,
      timestamp: Date.now(),
      url: window.location.href
    });
    
    // If auth is completed and we're authenticated, try navigating again
    if (isAuthenticated && !isLoading && !loading && !error) {
      console.log('🔍 AuthCallback: User is authenticated but still on callback page - forcing navigation');
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, loading, error]);

  const handleRetryLogin = () => {
    console.log('🔍 AuthCallback: User clicked retry login button');
    navigate('/login');
  };
  
  const handleGoHome = () => {
    console.log('🔍 AuthCallback: User clicked go home button');
    navigate('/');
  };
  
  const handleManualNav = () => {
    console.log('🔍 AuthCallback: User clicked manual navigation button');
    window.location.href = '/dashboard';
  };

  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh' 
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 3 }}>
          Completing authentication...
          </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Communicating with Microsoft authentication servers
          </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh', 
          p: 2 
        }}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            maxWidth: 600, 
            width: '100%' 
          }}
        >
          <Typography variant="h5" gutterBottom color="error">
            Authentication Error
          </Typography>
          
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
          
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Debug Information
            </Typography>
            <Box sx={{ 
              bgcolor: 'background.default', 
              p: 2, 
              borderRadius: 1,
              maxHeight: '200px',
              overflow: 'auto',
              fontSize: '0.8rem',
              fontFamily: 'monospace'
            }}>
              <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            </Box>
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button 
              variant="outlined" 
              onClick={handleGoHome}
            >
              Go to Homepage
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleRetryLogin}
            >
              Return to Login
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  // This should not be reached normally, but as a fallback
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
      <Typography variant="h5" gutterBottom>
        Redirecting to dashboard...
      </Typography>
      <CircularProgress size={24} sx={{ mt: 2 }} />
      
      {/* Emergency manual navigation button */}
      <Button 
        variant="contained"
        color="primary"
        onClick={handleManualNav}
        sx={{ mt: 4 }}
      >
        Click here if not redirected automatically
      </Button>
      
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Authentication complete! If you're still seeing this screen, please click the button above.
      </Typography>
      
      <Box sx={{ 
        bgcolor: 'background.default', 
        p: 2, 
        borderRadius: 1,
        mt: 4,
        maxWidth: '80%',
        maxHeight: '150px',
        overflow: 'auto',
        fontSize: '0.8rem',
        fontFamily: 'monospace'
      }}>
        <pre>Auth state: {JSON.stringify({
          isAuthenticated,
          isLoading,
          hasToken: !!localStorage.getItem('auth_token'),
          sessionFlag: sessionStorage.getItem('isLoggedIn'),
          currentPath: window.location.pathname
        }, null, 2)}</pre>
      </Box>
    </Box>
  );
};

export default AuthCallback; 