import React, { createContext, useContext, useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { loginRequest } from '../authConfig';
import axios from 'axios';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
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
  const { instance, accounts, inProgress } = useMsal();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check for token in localStorage
    const token = localStorage.getItem('authToken');
    
    if (token) {
      // Fetch user data from backend
      const fetchUser = async () => {
        try {
          const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
          const response = await axios.get(`${backendUrl}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          setUser(response.data.user);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Error fetching user data:', error);
          localStorage.removeItem('authToken');
          setIsAuthenticated(false);
          setUser(null);
        }
      };
      
      fetchUser();
    } else if (accounts.length > 0) {
      // If no token but MSAL has accounts, use MSAL
      setIsAuthenticated(true);
      setUser(accounts[0]);
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
  }, [accounts]);

  const login = async () => {
    try {
      await instance.loginPopup(loginRequest);
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    instance.logout();
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
