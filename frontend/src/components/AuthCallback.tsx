import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import logger from '../utils/logger';  // Add a logger if you don't have one
import { 
  CircularProgress, 
  Typography, 
  Box, 
  Button, 
  Alert, 
  Paper 
} from '@mui/material';
import { useMsal } from "@azure/msal-react";

// Custom logger function
const logAuth = (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [AUTH] ${message}`;
  
  switch (level) {
    case 'info':
      console.info(logMessage, data || '');
      break;
    case 'warn':
      console.warn(logMessage, data || '');
      break;
    case 'error':
      console.error(logMessage, data || '');
      break;
  }
};

// Utility to handle PKCE verifier retrieval and cleanup
const handlePKCE = {
  // Get verifier from all possible storage locations
  getVerifier: (urlParams: URLSearchParams): string | null => {
    let verifier = null;
    
    // Try extracting from state parameter first (most reliable)
    try {
      const state = urlParams.get('state');
      if (state) {
        const stateObj = JSON.parse(atob(state));
        if (stateObj && stateObj.pkceVerifier) {
          logAuth('info', 'Found PKCE verifier in state parameter');
          verifier = stateObj.pkceVerifier;
          // Save to session storage for backend's benefit
          sessionStorage.setItem('pkce_verifier', verifier);
          return verifier;
        }
      }
    } catch (e) {
      logAuth('warn', 'Failed to parse state parameter', e);
    }
    
    // Try session storage next
    verifier = sessionStorage.getItem('pkce_verifier');
    
    // If not in sessionStorage, try localStorage
    if (!verifier) {
      logAuth('info', 'PKCE verifier not found in sessionStorage, checking localStorage');
      verifier = localStorage.getItem('pkce_verifier');
      
      // If found in localStorage, copy to sessionStorage for consistency
      if (verifier) {
        sessionStorage.setItem('pkce_verifier', verifier);
      }
    }
    
    if (verifier) {
      logAuth('info', `Retrieved PKCE verifier (length: ${verifier.length})`);
    } else {
      logAuth('warn', 'No PKCE verifier found in any storage location');
    }
    
    return verifier;
  },
  
  // Clean up verifier from all storage locations
  cleanupVerifier: (): void => {
    sessionStorage.removeItem('pkce_verifier');
    localStorage.removeItem('pkce_verifier');
    logAuth('info', 'PKCE verifier cleared from all storage locations');
  }
};

const AuthCallback = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState('');
  const navigate = useNavigate();
  const { instance } = useMsal();
  
  // Helper function for logging auth operations
  const logAuth = (level: 'info' | 'error' | 'warn', ...messages: any[]) => {
    if (level === 'error') {
      console.error('Auth:', ...messages);
    } else {
      console.log('Auth:', ...messages);
    }
  };

  useEffect(() => {
    const handleCallback = async () => {
      try {
        logAuth('info', 'Processing auth callback');
        
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        
        // Handle errors passed in URL
        if (error) {
          logAuth('error', `Authentication error: ${error}`, errorDescription);
          setError(`Authentication failed: ${error}`);
          setErrorDetails(errorDescription || '');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // If we have an authorization code, exchange it for tokens
        if (code) {
          logAuth('info', 'Authorization code received, exchanging for token');
          
          // Get the PKCE verifier using our utility (passing URL params to extract from state if needed)
          const verifier = handlePKCE.getVerifier(urlParams);
          
          // Log details for debugging
          logAuth('info', 'PKCE verifier status:', {
            found: !!verifier,
            length: verifier ? verifier.length : 0,
            preview: verifier ? `${verifier.substring(0, 5)}...${verifier.substring(verifier.length - 5)}` : 'none',
            stateParam: urlParams.get('state') ? 'present' : 'missing',
            searchParams: window.location.search
          });
          
          if (!verifier) {
            logAuth('warn', 'No PKCE verifier found in any storage location, trying direct token exchange');
            
            try {
              // Try to extract verifier from state as last resort
              let emergencyVerifier = null;
              try {
                const state = urlParams.get('state');
                if (state) {
                  const stateObj = JSON.parse(atob(state));
                  if (stateObj && stateObj.pkceVerifier) {
                    emergencyVerifier = stateObj.pkceVerifier;
                    logAuth('info', 'Recovered verifier from state for emergency direct exchange');
                  }
                }
              } catch (e) {
                logAuth('warn', 'Failed to parse state parameter in emergency mode', e);
              }
              
              if (!emergencyVerifier) {
                logAuth('error', 'No PKCE verifier available from any source');
                setError('Authentication failed: Missing PKCE verifier');
                setTimeout(() => navigate('/login'), 3000);
                return;
              }
              
              // Direct token exchange with Azure using the emergency verifier
              logAuth('info', 'Attempting direct token exchange with recovered verifier');
              
              const tokenParams = new URLSearchParams();
              tokenParams.append('client_id', process.env.AZURE_CLIENT_ID || process.env.REACT_APP_AZURE_CLIENT_ID || '');
              tokenParams.append('grant_type', 'authorization_code');
              tokenParams.append('code', code);
              tokenParams.append('redirect_uri', `${window.location.origin}/auth/callback`);
              tokenParams.append('code_verifier', emergencyVerifier);
              
              // Make token request directly to Azure
              const tokenEndpoint = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || process.env.REACT_APP_AZURE_TENANT_ID}/oauth2/v2.0/token`;
              
              const tokenResponse = await fetch(tokenEndpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: tokenParams,
              });
              
              const tokenData = await tokenResponse.json();
              
              if (!tokenResponse.ok) {
                logAuth('error', 'Emergency token exchange failed', tokenData.error, tokenData.error_description);
                setError(`Token exchange failed: ${tokenData.error}`);
                setErrorDetails(tokenData.error_description || '');
                setTimeout(() => navigate('/login'), 3000);
                return;
              }
              
              // Extract the ID token and proceed as normal
              const idToken = tokenData.id_token;
              if (!idToken) {
                logAuth('error', 'No ID token received from emergency exchange');
                setError('Authentication failed: No ID token received');
                setTimeout(() => navigate('/login'), 3000);
                return;
              }
              
              // Send to backend for verification
              const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
              const authResponse = await fetch(`${backendUrl}/api/auth/verify-token`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                  idToken,
                  code_verifier: verifier // Include verifier from frontend as fallback
                }),
                credentials: 'include', // This is important for session cookies
                mode: 'cors' // Explicitly set CORS mode
              });
              
              if (!authResponse.ok) {
                const errorData = await authResponse.json().catch(() => ({}));
                logAuth('error', 'Backend authentication failed', {
                  status: authResponse.status,
                  statusText: authResponse.statusText,
                  ...errorData
                });
                setError('Backend authentication failed');
                setErrorDetails(errorData.message || authResponse.statusText);
                setTimeout(() => navigate('/login'), 3000);
                return;
              }
              
              const { token } = await authResponse.json();
              
              // Authentication succeeded with the emergency flow
              logAuth('info', 'Emergency authentication successful');
              localStorage.setItem('token', token);
              navigate('/');
              return;
              
            } catch (fallbackError) {
              logAuth('error', 'Error during emergency authentication', fallbackError);
              setError('Authentication failed: Missing PKCE verifier');
              setTimeout(() => navigate('/login'), 3000);
              return;
            }
          }
          
          try {
            // For SPA clients, we must exchange the code for tokens directly from the browser
            const tokenParams = new URLSearchParams();
            tokenParams.append('client_id', process.env.AZURE_CLIENT_ID || process.env.REACT_APP_AZURE_CLIENT_ID || '');
            tokenParams.append('grant_type', 'authorization_code');
            tokenParams.append('code', code);
            // For SPAs, we must use a frontend URL, not the backend callback
            tokenParams.append('redirect_uri', `${window.location.origin}/auth/callback`);
            tokenParams.append('code_verifier', verifier);
            
            // Make token request
            const tokenEndpoint = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || process.env.REACT_APP_AZURE_TENANT_ID}/oauth2/v2.0/token`;
            
            logAuth('info', 'Making token request to Azure');
            const tokenResponse = await fetch(tokenEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: tokenParams,
            });
            
            const tokenData = await tokenResponse.json();
            
            if (!tokenResponse.ok) {
              logAuth('error', 'Token exchange failed', tokenData.error, tokenData.error_description);
              setError(`Token exchange failed: ${tokenData.error}`);
              setErrorDetails(tokenData.error_description || '');
              setTimeout(() => navigate('/login'), 3000);
              return;
            }
            
            // Extract the ID token from the response
            const idToken = tokenData.id_token;
            if (!idToken) {
              logAuth('error', 'No ID token received');
              setError('Authentication failed: No ID token received');
              setTimeout(() => navigate('/login'), 3000);
              return;
            }
            
            // Send the ID token to your backend to create or retrieve a user and get a session
            logAuth('info', 'Token received, authenticating with backend');
            const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
            
            const authResponse = await fetch(`${backendUrl}/api/auth/verify-token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                idToken,
                code_verifier: verifier // Include verifier from frontend as fallback
              }),
              credentials: 'include', // This is important for session cookies
              mode: 'cors' // Explicitly set CORS mode
            });
            
            if (!authResponse.ok) {
              const errorData = await authResponse.json().catch(() => ({}));
              logAuth('error', 'Backend authentication failed', {
                status: authResponse.status,
                statusText: authResponse.statusText,
                ...errorData
              });
              setError('Backend authentication failed');
              setErrorDetails(errorData.message || authResponse.statusText);
              setTimeout(() => navigate('/login'), 3000);
              return;
            }
            
            const { token } = await authResponse.json();
            
            // Successfully authenticated
            logAuth('info', 'Authentication successful, saving token');
            localStorage.setItem('token', token);
            
            // Clean up - remove PKCE verifier from all storage locations
            handlePKCE.cleanupVerifier();
            
            // Redirect to dashboard
            navigate('/dashboard');
          } catch (exchangeError: any) {
            logAuth('error', 'Error during token exchange', exchangeError);
            setError('Error during token exchange');
            setErrorDetails(exchangeError.message || '');
            setTimeout(() => navigate('/login'), 3000);
          }
        } else {
          // No code or token received
          logAuth('error', 'No authorization code received');
          setError('Authentication failed: No authorization code received');
          setTimeout(() => navigate('/login'), 3000);
        }
      } catch (error) {
        logAuth('error', 'Auth callback error:', error);
        setError('Authentication failed');
        setErrorDetails(error instanceof Error ? error.message : 'Unknown error');
        setTimeout(() => navigate('/login'), 3000);
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [navigate]);

  const handleRetryLogin = () => {
    logAuth('info', 'User initiated retry login');
    // Use the backend URL for Microsoft authentication
    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
    window.location.href = `${backendUrl}/api/auth/microsoft`;
  };

  if (loading) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        justifyContent="center" 
        alignItems="center" 
        height="100vh"
        bgcolor="#f5f5f5"
      >
        <Paper elevation={3} sx={{ p: 4, maxWidth: 400, textAlign: 'center' }}>
          <CircularProgress size={60} thickness={4} sx={{ mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Completing Authentication
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Please wait while we securely log you in...
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (error) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        justifyContent="center" 
        alignItems="center" 
        height="100vh"
        bgcolor="#f5f5f5"
      >
        <Paper elevation={3} sx={{ p: 4, maxWidth: 500 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          
          {errorDetails && (
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Details: {errorDetails}
            </Typography>
          )}
          
          <Box display="flex" justifyContent="space-between">
            <Button 
              variant="outlined" 
              onClick={() => navigate('/')}
            >
              Return Home
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleRetryLogin}
            >
              Try Again
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  return null;
};

export default AuthCallback; 