import { useMsal } from "@azure/msal-react";
import { useState, useEffect, useCallback } from "react";
import { loginRequest } from "../auth/authConfig";

interface UserData {
  name?: string;
  username?: string;
  token?: string;
  [key: string]: any; // Allow other properties
}

export const useMsalAuth = () => {
  const { instance, accounts } = useMsal();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user data on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check for existing MSAL account
        if (accounts.length > 0) {
          const currentAccount = accounts[0];

          // Get token silently if possible
          const response = await instance.acquireTokenSilent({
            ...loginRequest,
            account: currentAccount,
          });

          // Set user data
          const userData = {
            name: currentAccount.name,
            username: currentAccount.username,
            token: response.accessToken,
          };

          // Store token in localStorage with consistent key
          localStorage.setItem("authToken", response.accessToken);

          // Set user data
          setUser(userData);
        } else {
          // No MSAL account found
          setUser(null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [accounts, instance]);

  // Login method
  const login = useCallback(async () => {
    try {
      // Use MSAL for login
      await instance.loginRedirect(loginRequest);
      return { success: true }; // This won't actually be returned due to redirect
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }, [instance]);

  // Logout method
  const logout = useCallback(() => {
    // Clear localStorage token first
    localStorage.removeItem("authToken");
    localStorage.removeItem("token"); // Also remove legacy token

    // Use MSAL for logout
    instance.logout();
  }, [instance]);

  return {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };
};
