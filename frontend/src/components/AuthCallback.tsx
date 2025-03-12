import React, { useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useNavigate } from 'react-router-dom';
import { loginRequest } from '../config/authConfig';
import { Box, CircularProgress, Typography } from '@mui/material';
import axios from 'axios';

const AuthCallback = () => {
  const { instance, accounts } = useMsal();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get token from Microsoft
        const response = await instance.acquireTokenSilent({
          ...loginRequest,
          account: accounts[0],
        });

        // Send token to backend
        const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
        const backendResponse = await axios.post(`${backendUrl}/api/auth/azure/callback`, {
          token: response.accessToken,
          userDetails: {
            oid: response.uniqueId,
            name: response.account?.name || '',
            email: response.account?.username || '',
          },
        });

        // Store token and user info
        localStorage.setItem('authToken', backendResponse.data.token);
        localStorage.setItem('user', JSON.stringify(backendResponse.data.user));

        // Redirect to dashboard
        navigate('/dashboard');
      } catch (err) {
        console.error('Auth callback error', err);
        setError('Authentication failed. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [instance, accounts, navigate]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Completing authentication...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <Typography variant="h6" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  return null;
};

export default AuthCallback; 