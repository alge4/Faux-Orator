import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Paper, 
  Container, 
  Divider,
  Alert,
  CircularProgress,
  Link
} from '@mui/material';
import MicrosoftIcon from '@mui/icons-material/Microsoft';
import AuthUtils from '../utils/auth';

// Generate a random string for PKCE
const generateRandomString = (length: number) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const Login: React.FC = () => {
  const { isAuthenticated, login, loginWithProvider, error, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Get the previous location if redirected
  const from = location.state?.from?.pathname || '/dashboard';

  console.log('Login: Component rendered, isAuthenticated =', isAuthenticated);
  console.log('Login: Redirect destination =', from);
  
  // Check if there's a token in localStorage
  console.log('Login: Token in localStorage =', !!AuthUtils.getToken());

  // Redirect if already authenticated
  useEffect(() => {
    console.log('Login: useEffect fired, isAuthenticated =', isAuthenticated);
    if (isAuthenticated) {
      console.log('Login: Already authenticated, navigating to', from);
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setErrorMessage('');
    
    console.log('Login: Attempting login with credentials:', username);
    
    try {
      // Development mode shortcut
      if (process.env.NODE_ENV !== 'production' && (username === 'dev' || username === '')) {
        console.log('Login: DEV MODE - Using dev shortcut login');
        // Set a dev token directly
        AuthUtils.setToken('dev-token-' + Date.now());
        // Set session flag
        sessionStorage.setItem('isLoggedIn', 'true');
        // Navigate to dashboard
        navigate('/dashboard');
        return;
      }
      
      // Normal login flow
      const success = await login(username, password);
      console.log('Login: Login result:', success);
      
      if (success) {
        console.log('Login: Login successful, redirecting to', from);
        navigate(from, { replace: true });
      } else {
        console.error('Login: Login failed:', error);
        setErrorMessage(error || 'Login failed. Please check your credentials and try again.');
      }
    } catch (err: any) {
      console.error('Login: Error during login:', err);
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleMicrosoftLogin = () => {
    // Generate a PKCE verifier for the authorization request
    const verifier = generateRandomString(64);
    
    // Store the verifier in sessionStorage for development fallback
    if (process.env.NODE_ENV !== 'production') {
      sessionStorage.setItem('pkce_verifier', verifier);
      console.log('Login: DEV MODE - Stored PKCE verifier in sessionStorage');
    }
    
    console.log('Login: Initiating Microsoft login with PKCE verifier (preview):', 
                verifier.substring(0, 5) + '...' + verifier.substring(verifier.length - 5));
    
    // Call the provider login method
    loginWithProvider('microsoft');
  };

  // Immediately redirect if authenticated
  if (isAuthenticated) {
    console.log('Login: Rendering redirect because isAuthenticated is true');
    return <Navigate to="/dashboard" replace />;
  }

  // Show a loading state if the auth context is still initializing
  if (isLoading && !isLoggingIn) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', minHeight: '100vh' }}>
      <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome to Faux-Orator
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" align="center">
          Your D&D campaign management platform
          </Typography>
        </Box>

        {(error || localError || errorMessage) && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error || localError || errorMessage}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3 }}>
          <TextField
            label="Username or Email"
            variant="outlined"
            type="text"
            fullWidth
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading || isLoggingIn}
            helperText="Please enter your username or email"
            placeholder="your.username or your.email@example.com"
            required
          />
          <TextField
            label="Password"
            type="password"
            variant="outlined"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading || isLoggingIn}
            helperText="Enter your password"
            required
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            sx={{ mt: 2 }}
            disabled={isLoading || isLoggingIn}
          >
            {isLoading ? <CircularProgress size={24} /> : isLoggingIn ? 'Logging In...' : 'Sign In'}
          </Button>
        </Box>

        <Divider sx={{ my: 3 }}>OR</Divider>

        <Button
          onClick={handleMicrosoftLogin}
          variant="outlined"
          fullWidth
          size="large"
          startIcon={<MicrosoftIcon />}
          disabled={isLoading || isLoggingIn}
        >
          Sign in with Microsoft
        </Button>
        
        <Typography variant="body2" align="center" sx={{ mt: 3, color: 'text.secondary' }}>
          Note: Use your Microsoft account to sign in
        </Typography>

        {/* Dev mode indicator and helper */}
        {process.env.NODE_ENV !== 'production' && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Development Mode: Enter any username or leave blank to login without authentication.
            </Typography>
          </Alert>
        )}

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2">
            Don't have an account? <Link href="/signup">Sign up</Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login;
