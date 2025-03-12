import React from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../config/authConfig';
import { Box, Button, Typography, Paper } from '@mui/material';

const Login = () => {
  const { instance } = useMsal();

  const handleLogin = async () => {
    try {
      // Redirect to Microsoft login
      await instance.loginRedirect(loginRequest);
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: '#f5f5f5',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 400,
          width: '100%',
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          Faux Orator
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Your AI-powered D&D campaign assistant
        </Typography>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleLogin}
          sx={{ mt: 3 }}
        >
          Login with Microsoft
        </Button>
      </Paper>
    </Box>
  );
};

export default Login; 