import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Paper, CircularProgress } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { MicrosoftLogo } from './icons/MicrosoftLogo';
import { useMsal } from "@azure/msal-react";
import { InteractionType, PopupRequest, RedirectRequest } from "@azure/msal-browser";
import { loginRequest } from "../auth/authConfig";

// Helper function to generate PKCE verifier and challenge
const generatePKCE = async () => {
  // Generate random bytes for the verifier
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  
  // Convert to base64url format
  const verifier = btoa(String.fromCharCode.apply(null, Array.from(array)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
    
  // Generate challenge by hashing the verifier with SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  
  // Convert the digest to base64url format
  const challenge = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
    
  return { verifier, challenge };
};

// Helper function for logging auth operations
const logAuth = (level: 'info' | 'error' | 'warn', ...messages: any[]) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [AUTH]`;
  
  if (level === 'error') {
    console.error(prefix, ...messages);
  } else if (level === 'warn') {
    console.warn(prefix, ...messages);
  } else {
    console.log(prefix, ...messages);
  }
};

// Utility to handle PKCE verifier retrieval and cleanup
const handlePKCE = {
  // Store verifier in all storage locations for redundancy
  storeVerifier: (verifier: string) => {
    // Store in both storages for maximum compatibility across browsers and redirects
    sessionStorage.setItem('pkce_verifier', verifier);
    localStorage.setItem('pkce_verifier', verifier);
    
    // Also ensure verifier is available in the state parameter
    const stateObj = { pkceVerifier: verifier, timestamp: Date.now() };
    const stateParam = btoa(JSON.stringify(stateObj));
    
    // Store state parameter for authorization request
    sessionStorage.setItem('auth_state', stateParam);
    
    logAuth('info', 'PKCE verifier stored in all storage locations', {
      verifierLength: verifier.length,
      sessionStorageAvailable: !!sessionStorage,
      localStorageAvailable: !!localStorage
    });
  },
  
  // Clean up verifier from all storage locations
  cleanupVerifier: () => {
    sessionStorage.removeItem('pkce_verifier');
    localStorage.removeItem('pkce_verifier');
    logAuth('info', 'PKCE verifier cleared from all storage locations');
  }
};

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { instance } = useMsal();
  
  useEffect(() => {
    // Check if there's an error in the URL
    const params = new URLSearchParams(location.search);
    if (params.has('error')) {
      setError(`${params.get('error')}: ${params.get('error_description') || ''}`);
    }
  }, [location.search]);
  
  useEffect(() => {
    // Validate required environment variables
    const requiredEnvVars = {
      'REACT_APP_API_URL': process.env.REACT_APP_API_URL,
      'REACT_APP_AZURE_CLIENT_ID': process.env.REACT_APP_AZURE_CLIENT_ID,
      'REACT_APP_AZURE_TENANT_ID': process.env.REACT_APP_AZURE_TENANT_ID,
      'REACT_APP_REDIRECT_URI': process.env.REACT_APP_REDIRECT_URI
    };

    Object.entries(requiredEnvVars).forEach(([key, value]) => {
      if (!value) {
        console.error(`Missing required environment variable: ${key}`);
      }
    });
  }, []);
  
  const handleMicrosoftLogin = async () => {
    try {
      setLoading(true);
      
      // Clear any existing verifier first
      handlePKCE.cleanupVerifier();
      
      logAuth('info', 'Generating new PKCE values for authentication');
      
      // Generate PKCE verifier and challenge
      const { verifier, challenge } = await generatePKCE();
      
      // Store the verifier in both storage types to be safe
      handlePKCE.storeVerifier(verifier);
      
      // Create a state parameter that includes the verifier (for emergency recovery)
      // This will be returned by Azure in the callback
      const stateObj = {
        pkceVerifier: verifier,
        timestamp: Date.now()
      };
      const stateParam = btoa(JSON.stringify(stateObj));
      
      // Use MSAL to initiate login with your custom parameters
      const request = {
        ...loginRequest,
        redirectUri: `${window.location.origin}/auth/callback`,
        state: stateParam,
        codeChallenge: challenge,
        codeChallengeMethod: "S256"
      };
      
      // Use redirect method for authentication
      instance.loginRedirect(request);
    } catch (error) {
      console.error('Error initiating Microsoft login:', error);
      setError('Failed to initiate login. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Box 
      display="flex" 
      flexDirection="column" 
      justifyContent="center" 
      alignItems="center" 
      height="100vh"
      bgcolor="#f5f5f5"
    >
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Welcome to Faux Orator
        </Typography>
        <Typography variant="body1" sx={{ mb: 4 }}>
          Please sign in to continue
        </Typography>
        
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        
        <Button
          variant="contained"
          startIcon={<MicrosoftLogo />}
          onClick={handleMicrosoftLogin}
          disabled={loading}
          sx={{ 
            width: '100%', 
            py: 1.5,
            mb: 2,
            backgroundColor: '#2f2f2f',
            '&:hover': {
              backgroundColor: '#1f1f1f',
            }
          }}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            'Sign in with Microsoft'
          )}
        </Button>
      </Paper>
    </Box>
  );
};

export default Login; 