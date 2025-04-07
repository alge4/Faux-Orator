import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthService } from '../services/api';
import AuthUtils from '../utils/auth';

// Types
interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  loginWithProvider: (provider: string) => void;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  error: null,
  login: async () => false,
  loginWithProvider: () => {},
  logout: () => {},
  checkAuth: async () => false,
});

// Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  console.log('🔐 AuthContext: Component rendered', {
    isAuthenticated, 
    isLoading,
    hasUser: !!user,
    hasError: !!error,
    currentUrl: window.location.href,
    locationPathname: location.pathname,
    hasToken: !!AuthUtils.getToken(),
    time: new Date().toISOString()
  });

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    console.log('🔐 AuthContext: Initializing auth state (useEffect)');
    
    const initAuth = async () => {
      console.log('🔐 AuthContext: Running initAuth function');
      
      // Direct token check - for faster validation particularly after OAuth redirect
      const token = AuthUtils.getToken();
      const sessionFlag = sessionStorage.getItem('isLoggedIn');
      
      console.log('🔐 AuthContext: Token check during init', {
        hasToken: !!token,
        hasSessionFlag: sessionFlag === 'true',
        currentPath: window.location.pathname
      });
      
      // If we have just been redirected from OAuth flow with a token
      if (token && sessionFlag === 'true' && window.location.pathname === '/dashboard') {
        console.log('🔐 AuthContext: Found token at dashboard - setting authenticated immediately');
        setIsAuthenticated(true);
        setIsLoading(false);
        
        // Run full auth check in background
        checkAuth().then(success => {
          console.log('🔐 AuthContext: Background auth check completed:', success);
        });
        
        return;
      }
      
      // Normal flow - full auth check
      const authResult = await checkAuth();
      console.log('🔐 AuthContext: initAuth complete', { 
        authResult, 
        isAuthenticated, 
        isLoading,
        time: new Date().toISOString()
      });
    };
    
    initAuth();
  }, []);

  // Handle navigation after authentication state changes
  useEffect(() => {
    console.log('🔐 AuthContext: Auth state change detected', {
      isAuthenticated,
      isLoading,
      currentPath: location.pathname,
      time: new Date().toISOString()
    });
    
    // If we're at the login page and already authenticated, redirect to dashboard
    if (isAuthenticated && location.pathname === '/login' && !isLoading) {
      console.log('🔐 AuthContext: Already authenticated at login page, redirecting to dashboard');
      navigate('/dashboard');
    }
    
    // Debug check for auth callback page
    if (isAuthenticated && location.pathname === '/auth/callback' && !isLoading) {
      console.log('🔐 AuthContext: Authenticated on callback page, should be redirecting to dashboard');
    }
  }, [isAuthenticated, location.pathname, isLoading, navigate]);

  // Check if user is authenticated by validating token
  const checkAuth = async (): Promise<boolean> => {
    console.log('🔐 AuthContext.checkAuth: Checking authentication status', {
      prevIsAuthenticated: isAuthenticated,
      prevIsLoading: isLoading,
      time: new Date().toISOString()
    });
    
    setIsLoading(true);
    setError(null);
    
    // First check if token exists
    const token = AuthUtils.getToken();
    
    console.log('🔐 AuthContext.checkAuth: Token check', {
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 10)}...` : 'none',
      tokenLength: token ? token.length : 0,
      time: new Date().toISOString()
    });
    
    if (!token) {
      console.log('🔐 AuthContext.checkAuth: No token found, setting not authenticated');
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      return false;
    }
    
    // Skip token validation in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔐 AuthContext.checkAuth: DEV MODE - Skipping token validation, setting authenticated');
      setIsAuthenticated(true);
      
      // Set mock user data in development mode
      setUser({
        id: '1',
        email: 'dev@example.com',
        name: 'Dev User'
      });
      
      console.log('🔐 AuthContext.checkAuth: DEV MODE - Set mock user', {
        newAuthState: true,
        user: {id: '1', email: 'dev@example.com', name: 'Dev User'},
        time: new Date().toISOString()
      });
      
      setIsLoading(false);
      return true;
    }
    
    try {
      // In production, validate token with backend
      console.log('🔐 AuthContext.checkAuth: Validating token with backend');
      const response = await AuthService.validateToken();
      
      console.log('🔐 AuthContext.checkAuth: Token validation response', {
        success: response.success,
        hasData: !!response.data,
        message: response.message,
        time: new Date().toISOString()
      });
      
      if (response.success && response.data) {
        console.log('🔐 AuthContext.checkAuth: Token is valid, setting authenticated');
        setIsAuthenticated(true);
        
        // Fetch user data
        try {
          console.log('🔐 AuthContext.checkAuth: Fetching current user data');
          const userResponse = await AuthService.getCurrentUser();
          
          console.log('🔐 AuthContext.checkAuth: User data response', {
            success: userResponse.success,
            hasData: !!userResponse.data,
            time: new Date().toISOString()
          });
          
          if (userResponse.success && userResponse.data) {
            setUser(userResponse.data);
            console.log('🔐 AuthContext.checkAuth: Set user data', {
              user: userResponse.data
            });
          }
        } catch (userError) {
          console.error('🔐 AuthContext.checkAuth: Error fetching user data', userError);
        }
        
        setIsLoading(false);
        
        // Force state update logs
        setTimeout(() => {
          console.log('🔐 AuthContext.checkAuth: State after validation', {
            isAuthenticated,
            isLoading,
            hasUser: !!user,
            time: new Date().toISOString()
          });
        }, 100);
        
        return true;
    } else {
        console.warn('🔐 AuthContext.checkAuth: Token validation failed, clearing token');
        AuthUtils.removeToken();
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return false;
      }
    } catch (err) {
      console.error('🔐 AuthContext.checkAuth: Error checking authentication', err);
      setError('Authentication check failed');
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      return false;
    }
  };

  // Login method - returns success boolean
  const login = async (username: string, password: string): Promise<boolean> => {
    console.log(`🔐 AuthContext.login: Attempting login for user: ${username}`);
    setIsLoading(true);
    setError(null);
    
    try {
      // If in development mode, use mock login
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔐 AuthContext.login: DEV MODE - Using mock login');
        // Simulate successful login
        const mockToken = 'mock-dev-token-' + Date.now();
        AuthUtils.setToken(mockToken);
        setIsAuthenticated(true);
        setUser({
          id: '1',
          email: username,
          name: 'Dev User'
        });
        setIsLoading(false);
        
        // Store login state in sessionStorage for persistence during reload
        sessionStorage.setItem('isLoggedIn', 'true');
        
        console.log('🔐 AuthContext.login: DEV MODE - Mock login successful!', {
          tokenSet: !!AuthUtils.getToken(),
          sessionFlag: sessionStorage.getItem('isLoggedIn')
        });
        return true;
      }
      
      // Production login
      console.log('🔐 AuthContext.login: Calling AuthService.login');
      const response = await AuthService.login({ username, password });
      
      console.log('🔐 AuthContext.login: Login response', {
        success: response.success,
        hasData: !!response.data,
        message: response.message,
        time: new Date().toISOString()
      });
      
      if (response.success && response.data) {
        console.log('🔐 AuthContext.login: Login successful, token should be set by AuthService.login');
        console.log('🔐 AuthContext.login: Current token status', {
          hasToken: !!AuthUtils.getToken(),
          tokenPreview: AuthUtils.getToken() ? `${AuthUtils.getToken()!.substring(0, 10)}...` : 'none',
        });
            
            setIsAuthenticated(true);
        
        if (response.data.user) {
          setUser(response.data.user);
          console.log('🔐 AuthContext.login: User data set from login response', {
            user: response.data.user
          });
        } else {
          // Fetch user if not included in login response
          console.log('🔐 AuthContext.login: No user in response, fetching user data');
          const userResponse = await AuthService.getCurrentUser();
          if (userResponse.success && userResponse.data) {
            setUser(userResponse.data);
            console.log('🔐 AuthContext.login: User data fetched and set', {
              user: userResponse.data
            });
          }
        }
        
        // Store login state in sessionStorage for persistence during reload
        sessionStorage.setItem('isLoggedIn', 'true');
        console.log('🔐 AuthContext.login: Session flag set', {
          sessionFlag: sessionStorage.getItem('isLoggedIn')
        });
        
        setIsLoading(false);
        
        // Force state update logs
        setTimeout(() => {
          console.log('🔐 AuthContext.login: State after login', {
            isAuthenticated,
            isLoading,
            hasUser: !!user,
            time: new Date().toISOString()
          });
        }, 100);
        
        return true;
      } else {
        console.error('🔐 AuthContext.login: Login failed', response.message);
        setError(response.message || 'Login failed');
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return false;
      }
    } catch (err: any) {
      console.error('🔐 AuthContext.login: Login error', err);
      setError(err.message || 'Login error occurred');
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      return false;
    }
  };

  // Login with a provider (Microsoft, Google, etc.)
  const loginWithProvider = (provider: string) => {
    console.log(`🔐 AuthContext.loginWithProvider: Initiating ${provider} login flow`);
    
    // Redirect directly to the backend OAuth endpoint
    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);
    
    // Log the redirect for debugging
    console.log(`🔐 AuthContext.loginWithProvider: Redirecting to ${backendUrl}/api/auth/${provider}?redirect_uri=${redirectUri}`, {
      fullRedirectUri: `${window.location.origin}/auth/callback`,
      currentUrl: window.location.href
    });
    
    // In development mode, we can either use a mock or proceed with real auth
    if (process.env.NODE_ENV !== 'production' && provider === 'microsoft' && process.env.REACT_APP_MOCK_OAUTH === 'true') {
      console.log('🔐 AuthContext.loginWithProvider: DEV MODE - Using mock OAuth flow');
      
      // Set development token and redirect to callback page
      const mockToken = 'mock-oauth-token-' + Date.now();
      AuthUtils.setToken(mockToken);
      
      // Use timeout to simulate redirect delay
      setTimeout(() => {
        window.location.href = `/auth/callback?token=${mockToken}`;
      }, 500);
      
      return;
    }
    
    // Handle real OAuth flow
    window.location.href = `${backendUrl}/api/auth/${provider}?redirect_uri=${redirectUri}`;
  };

  // Logout method
  const logout = () => {
    console.log('🔐 AuthContext.logout: Logging out user');
    AuthUtils.logout();
    setIsAuthenticated(false);
    setUser(null);
    setError(null);
    
    // Clear login state from sessionStorage
    sessionStorage.removeItem('isLoggedIn');
    
    console.log('🔐 AuthContext.logout: User logged out, auth state cleared', {
      hasToken: !!AuthUtils.getToken(),
      sessionFlag: sessionStorage.getItem('isLoggedIn'),
      time: new Date().toISOString()
    });
    
    // Redirect to login page
    navigate('/login');
  };

  // Log auth context value on each render to debug problems
  console.log('🔐 AuthContext: Current provider state', {
    isAuthenticated,
    isLoading,
    hasUser: !!user,
    hasError: !!error,
    contextReady: true,
    time: new Date().toISOString()
  });

  return (
    <AuthContext.Provider
      value={{
      isAuthenticated, 
        isLoading,
      user, 
        error,
      login, 
        loginWithProvider,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using auth context
export const useAuth = () => useContext(AuthContext);
