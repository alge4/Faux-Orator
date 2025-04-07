import axios from 'axios';

const TOKEN_KEY = 'authToken';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * Authentication utilities for handling tokens and API requests
 */
export const AuthUtils = {
  /**
   * Get the stored authentication token
   * @returns The authentication token or null if not found
   */
  getToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Store the authentication token
   * @param token The token to store
   */
  setToken: (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
  },

  /**
   * Remove the stored authentication token
   */
  removeToken: (): void => {
    localStorage.removeItem(TOKEN_KEY);
  },

  /**
   * Check if the user is authenticated
   * @returns True if authenticated, false otherwise
   */
  isAuthenticated: (): boolean => {
    return !!AuthUtils.getToken();
  },

  /**
   * Validate the current token against the backend
   * @returns Promise resolving to true if valid, false otherwise
   */
  validateToken: async (): Promise<boolean> => {
    try {
      const token = AuthUtils.getToken();
      console.log('AuthUtils.validateToken: Validating token exists?', !!token);
      
      if (!token) {
        console.log('AuthUtils.validateToken: No token found in localStorage');
        return false;
      }

      // For development purposes, always return true if we have a token
      // Remove this in production and uncomment the API validation below
      console.log('AuthUtils.validateToken: DEVELOPMENT MODE - assuming token is valid');
      return true;
      
      /*
      console.log('AuthUtils.validateToken: Making request to validate token with:', token.substring(0, 10) + '...');
      
      // Try both endpoints in case one is working
      try {
        const response = await axios.get(`${API_BASE_URL}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        console.log('AuthUtils.validateToken: Response status from /api/users/me:', response.status);
        
        if (response.status === 200) {
          console.log('AuthUtils.validateToken: Token is valid');
          return true;
        }
      } catch (userMeError) {
        console.warn('AuthUtils.validateToken: Error from /api/users/me endpoint:', userMeError);
        
        // Try the other possible endpoint
        try {
          const authResponse = await axios.get(`${API_BASE_URL}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          console.log('AuthUtils.validateToken: Response status from /api/auth/me:', authResponse.status);
          
          if (authResponse.status === 200) {
            console.log('AuthUtils.validateToken: Token is valid from /api/auth/me');
            return true;
          }
        } catch (authMeError) {
          console.warn('AuthUtils.validateToken: Error from /api/auth/me endpoint:', authMeError);
          // Both endpoints failed, continue to remove token below
        }
      }

      // If we get here, token validation failed
      console.log('AuthUtils.validateToken: Token validation failed, removing token');
      AuthUtils.removeToken();
      return false;
      */
    } catch (error: any) {
      console.error('AuthUtils.validateToken: Token validation failed:', error);
      console.log('AuthUtils.validateToken: Response status:', error.response?.status);
      console.log('AuthUtils.validateToken: Error message:', error.message);
      
      // Remove invalid token
      AuthUtils.removeToken();
      return false;
    }
  },

  /**
   * Get authorization headers for API requests
   * @returns Headers object with Authorization field if authenticated
   */
  getAuthHeaders: (): Record<string, string> => {
    const token = AuthUtils.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  /**
   * Perform login and store the token
   * @param username Username
   * @param password Password
   * @returns Promise resolving to the user data
   */
  login: async (username: string, password: string): Promise<any> => {
    const response = await axios.post(`${API_BASE_URL}/api/users/login`, {
      email: username,
      password
    });

    const { token } = response.data;
    if (token) {
      AuthUtils.setToken(token);
    }
    
    return response.data;
  },

  /**
   * Perform logout
   */
  logout: (): void => {
    AuthUtils.removeToken();
    // Optional: call logout endpoint if your API requires it
    // await axios.post(`${API_BASE_URL}/api/auth/logout`);
  }
};

export default AuthUtils; 