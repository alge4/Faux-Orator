import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useMsalAuth } from "../hooks/useAuth";

// Define interfaces for type safety
interface UserData {
  name?: string;
  username?: string;
  token?: string;
  [key: string]: any; // Allow other properties
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserData | null;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  login: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get MSAL functionality 
  const msalAuth = useMsalAuth();
  const [user, setUser] = useState<UserData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const logAuthState = (message: string, data?: any) => {
    console.log(`[AuthContext] ${message}`, data);
  };

  useEffect(() => {
    // First check if MSAL has an authenticated user
    if (msalAuth.user) {
      logAuthState('User authenticated through MSAL', msalAuth.user);
      setUser(msalAuth.user);
      setIsAuthenticated(true);
      return;
    }

    // Then fallback to your existing token-based auth
    const token = localStorage.getItem('authToken');
    
    if (token) {
      logAuthState('Found auth token, fetching user data');
      const fetchUser = async () => {
        try {
          const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
          const response = await axios.get(`${backendUrl}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          logAuthState('User data fetched successfully', response.data);
          setUser(response.data.user);
          setIsAuthenticated(true);
        } catch (error) {
          logAuthState('Error fetching user data', error);
          localStorage.removeItem('authToken');
          setIsAuthenticated(false);
          setUser(null);
        }
      };
      
      fetchUser();
    } else {
      logAuthState('No authentication found');
      setIsAuthenticated(false);
      setUser(null);
    }
  }, [msalAuth.user]);

  // Login function that tries MSAL first, then falls back to your custom login
  const login = async () => {
    try {
      logAuthState('Attempting MSAL login');
      return msalAuth.login();
    } catch (error) {
      logAuthState('MSAL login failed, trying custom login', error);
      try {
        const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
        window.location.href = `${backendUrl}/api/auth/microsoft`;
      } catch (error) {
        logAuthState('Login error', error);
      }
    }
  };

  // Logout from both systems
  const logout = () => {
    logAuthState('Logging out');
    localStorage.removeItem('authToken');
    setUser(null);
    setIsAuthenticated(false);
    
    // Also log out from MSAL if possible
    if (msalAuth.logout) {
      msalAuth.logout();
    }
  };

  // Provide the authentication context to child components
  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Keep your original useAuth function for components to use
export const useAuth = () => useContext(AuthContext);
