import { apiClient, ApiResponse } from "./api";
import AuthUtils from "../utils/auth";

// Types
interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

interface UserResponse {
  id: string;
  email: string;
  name: string;
}

// Auth Service - handles all authentication-related API calls
export const AuthService = {
  /**
   * Login with username and password
   * @param credentials User credentials
   * @returns Promise with login response
   */
  login: async (
    credentials: LoginRequest
  ): Promise<ApiResponse<LoginResponse>> => {
    console.log(
      "AuthService.login: Attempting login for user",
      credentials.username
    );

    // In development mode, provide mock response if API call fails
    if (process.env.NODE_ENV !== "production") {
      try {
        const response = await apiClient.post<ApiResponse<LoginResponse>>(
          "/api/auth/login",
          credentials
        );

        // If API call succeeds, store the token
        if (response.success && response.data?.token) {
          AuthUtils.setToken(response.data.token);
        }

        return response;
      } catch (error) {
        console.warn(
          "AuthService.login: API call failed in dev mode, returning mock response"
        );

        // Generate a mock token for development
        const mockToken = `dev-token-${Date.now()}-${credentials.username}`;

        // Store the token
        AuthUtils.setToken(mockToken);

        // Return a successful response
        return {
          success: true,
          data: {
            token: mockToken,
            user: {
              id: "1",
              email: credentials.username.includes("@")
                ? credentials.username
                : `${credentials.username}@example.com`,
              name: credentials.username,
            },
          },
          message: "DEV MODE: Login successful",
        };
      }
    }

    // Production mode - always use real API
    try {
      console.log(
        "AuthService.login: Making login API call to /api/auth/login"
      );

      const response = await apiClient.post<ApiResponse<LoginResponse>>(
        "/api/auth/login",
        credentials
      );

      console.log("AuthService.login: Login API response", {
        success: response.success,
        hasData: !!response.data,
        hasToken: response.data?.token ? "yes" : "no",
        message: response.message,
      });

      // Store the token if login was successful
      if (response.success && response.data?.token) {
        AuthUtils.setToken(response.data.token);
      }

      return response;
    } catch (error: any) {
      console.error("AuthService.login: Login API error", error.message);
      return {
        success: false,
        message: error.message || "Login failed",
      };
    }
  },

  /**
   * Logout the user
   * @returns Promise with logout response
   */
  logout: async (): Promise<ApiResponse<null>> => {
    console.log("AuthService.logout: Logging out user");

    // Always clean up local tokens and session
    AuthUtils.logout();

    // In development mode, skip API call
    if (process.env.NODE_ENV !== "production") {
      console.log("AuthService.logout: DEV MODE - Skipping API call");
      return {
        success: true,
        message: "DEV MODE: Logout successful",
      };
    }

    // Production mode - attempt to call logout API
    try {
      const response = await apiClient.post<ApiResponse<null>>(
        "/api/auth/logout"
      );
      return response;
    } catch (error) {
      console.error("AuthService.logout: Logout API error", error);
      // Even if API call fails, we've already cleared local tokens, so return success
      return {
        success: true,
        message: "Logged out locally",
      };
    }
  },

  /**
   * Validate token with the backend
   * @returns Promise with validation response
   */
  validateToken: async (): Promise<ApiResponse<boolean>> => {
    console.log("AuthService.validateToken: Validating token");

    // In development mode, skip validation with backend
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "AuthService.validateToken: DEV MODE - Skipping validation, returning true"
      );
      return {
        success: true,
        data: true,
        message: "DEV MODE: Token is valid",
      };
    }

    try {
      const response = await apiClient.get<ApiResponse<boolean>>(
        "/api/auth/validate"
      );
      return response;
    } catch (error) {
      console.error("AuthService.validateToken: Token validation error", error);
      return {
        success: false,
        data: false,
        message: "Token validation failed",
      };
    }
  },

  /**
   * Get current user data
   * @returns Promise with user data response
   */
  getCurrentUser: async (): Promise<ApiResponse<UserResponse>> => {
    console.log("AuthService.getCurrentUser: Fetching current user");

    // In development mode, provide mock response if API call fails
    if (process.env.NODE_ENV !== "production") {
      try {
        const response = await apiClient.get<ApiResponse<UserResponse>>(
          "/api/users/me"
        );
        return response;
      } catch (error) {
        console.warn(
          "AuthService.getCurrentUser: API call failed in dev mode, returning mock response"
        );

        // Return mock user data
        return {
          success: true,
          data: {
            id: "1",
            email: "dev@example.com",
            name: "Dev User",
          },
          message: "DEV MODE: Retrieved user data",
        };
      }
    }

    // Production mode - always use real API
    return await apiClient.get<ApiResponse<UserResponse>>("/api/users/me");
  },
};
