import { apiClient } from "../services/api";
import axios from "axios";

// Key used for storing the JWT token in localStorage
const TOKEN_KEY = "auth_token";
// Key used for storing login timestamp
const LOGIN_TIME_KEY = "auth_login_time";
// Default token expiration (24 hours)
const DEFAULT_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

const AuthUtils = {
  /**
   * Set authentication token in localStorage
   * @param token JWT token
   */
  setToken: (token: string): void => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      // Save current timestamp for expiration tracking
      localStorage.setItem(LOGIN_TIME_KEY, Date.now().toString());
      console.log("AuthUtils.setToken: Token set successfully");

      // Always set the session flag when setting a token
      // This ensures consistency between token and session state
      sessionStorage.setItem("isLoggedIn", "true");
    } catch (error) {
      console.error(
        "AuthUtils.setToken: Error setting token in localStorage",
        error
      );
    }
  },

  /**
   * Get token from localStorage
   * @returns JWT token or null if not found
   */
  getToken: (): string | null => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);

      // Check if token exists
      if (!token) {
        return null;
      }

      // In development mode, always return the token without expiration check
      if (process.env.NODE_ENV !== "production") {
        return token;
      }

      // In production, check if token is expired based on timestamp
      const loginTime = localStorage.getItem(LOGIN_TIME_KEY);
      if (loginTime) {
        const elapsed = Date.now() - parseInt(loginTime, 10);
        if (elapsed > DEFAULT_EXPIRATION) {
          console.warn("AuthUtils.getToken: Token expired, removing");
          AuthUtils.removeToken();
          return null;
        }
      }

      return token;
    } catch (error) {
      console.error(
        "AuthUtils.getToken: Error getting token from localStorage",
        error
      );
      return null;
    }
  },

  /**
   * Remove token from localStorage
   */
  removeToken: (): void => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(LOGIN_TIME_KEY);
      console.log("AuthUtils.removeToken: Token removed successfully");
    } catch (error) {
      console.error(
        "AuthUtils.removeToken: Error removing token from localStorage",
        error
      );
    }
  },

  /**
   * Check if user is authenticated (has a valid token)
   * @returns True if authenticated
   */
  isAuthenticated: (): boolean => {
    // In development mode, check for session flag instead of token
    if (process.env.NODE_ENV !== "production") {
      const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true";
      console.log(
        "AuthUtils.isAuthenticated: DEV MODE - Using session flag:",
        isLoggedIn
      );
      return isLoggedIn || !!AuthUtils.getToken();
    }

    // In production, check for token existence
    return !!AuthUtils.getToken();
  },

  /**
   * Validate token with the backend
   * @returns Promise resolving to true if token is valid
   */
  validateToken: async (): Promise<boolean> => {
    // In development mode, always return true
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "AuthUtils.validateToken: DEV MODE - Skipping validation, returning true"
      );
      return true;
    }

    const token = AuthUtils.getToken();

    if (!token) {
      console.warn("AuthUtils.validateToken: No token to validate");
      return false;
    }

    try {
      // Call backend validation endpoint
      const response = await apiClient.get("/api/users/validate");
      return true; // If we get here, token is valid (no 401 error)
    } catch (error) {
      console.error("AuthUtils.validateToken: Token validation failed", error);
      // Remove invalid token
      AuthUtils.removeToken();
      return false;
    }
  },

  /**
   * Complete logout - clears token and session
   */
  logout: (): void => {
    AuthUtils.removeToken();
    sessionStorage.removeItem("isLoggedIn");
    console.log("AuthUtils.logout: Completed logout");
  },

  /**
   * Clear the stored token (alias of removeToken for compatibility)
   */
  clearToken: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LOGIN_TIME_KEY);
    sessionStorage.removeItem("isLoggedIn");
    console.log("AuthUtils.clearToken: Token cleared successfully");
  },
};

export default AuthUtils;
