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
          setUser({
            name: currentAccount.name,
            username: currentAccount.username,
            token: response.accessToken,
          });
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
      return instance.loginRedirect(loginRequest);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }, [instance]);

  // Logout method
  const logout = useCallback(() => {
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
