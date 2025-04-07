import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import AuthUtils from "../utils/auth";

// API base URL from environment or default
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

// Default timeout (10 seconds)
const DEFAULT_TIMEOUT = 10000;

// API response interface
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

// Error interface
export interface ApiError {
  message: string;
  status?: number;
  errors?: any;
}

// Campaign interfaces based on README
export interface Campaign {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  dmId: string;
  archived: boolean;
  role: string; // "DM", "Player", "Collaborator", "Observer"
  isFavorite?: boolean;
  lastAccessed?: string;
  createdAt: string;
  updatedAt: string;
}

// Create campaign request interface
export interface CreateCampaignRequest {
  name: string;
  description: string;
  imageUrl?: string | null;
}

// Update campaign request interface
export interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  imageUrl?: string | null;
}

// Mock data for development mode
const MOCK_CAMPAIGNS = [
  {
    id: "mock-campaign-1",
    name: "Mock Campaign 1",
    description: "A sample campaign for development testing",
    dmId: "mock-user-id",
    archived: false,
    role: "DM",
    isFavorite: true,
    lastAccessed: new Date().toISOString(),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "mock-campaign-2",
    name: "Mock Campaign 2",
    description: "Another sample campaign for testing",
    dmId: "mock-user-id",
    archived: false,
    role: "DM",
    isFavorite: false,
    lastAccessed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = AuthUtils.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("🔑 API: Added auth token to request headers");
    } else {
      console.log("🔑 API: No auth token available for request");
    }
    return config;
  },
  (error) => {
    console.error("🔑 API Request Error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Handle specific HTTP errors
      if (error.response.status === 401) {
        console.error(
          "🔑 API: Authentication error (401)",
          error.response.data
        );

        // If in dev mode, don't automatically log out
        if (process.env.NODE_ENV !== "production") {
          console.log("🔑 API: DEV MODE - Not clearing auth token on 401");
          return Promise.reject(error);
        }

        // In production, clear token on auth errors
        AuthUtils.clearToken();
        // Redirect to login if needed
        window.location.href = "/login?error=expired";
      }
    }
    return Promise.reject(error);
  }
);

// Campaign API Service
export const CampaignService = {
  /**
   * Get all campaigns for the current user
   * @returns Promise with ApiResponse containing campaigns
   */
  getCampaigns: async (): Promise<ApiResponse<Campaign[]>> => {
    console.log("🎲 CampaignService: Fetching campaigns");

    try {
      // In development mode with no token, return mock data
      if (process.env.NODE_ENV !== "production" && !AuthUtils.getToken()) {
        console.log(
          "🎲 CampaignService: DEV MODE - Returning mock campaign data"
        );
        return { data: MOCK_CAMPAIGNS };
      }

      const response = await api.get("/api/campaigns");
      console.log(
        "🎲 CampaignService: Campaigns fetched successfully",
        response.data
      );
      return {
        success: true,
        data: response.data,
        message: "Campaigns fetched successfully",
      };
    } catch (error) {
      console.error("🎲 CampaignService: Error fetching campaigns", error);

      // In development mode, return mock data on error
      if (process.env.NODE_ENV !== "production") {
        console.log(
          "🎲 CampaignService: DEV MODE - Returning mock campaign data after error"
        );
        return { data: MOCK_CAMPAIGNS };
      }

      throw error;
    }
  },

  /**
   * Get a specific campaign by ID
   * @param campaignId Campaign ID
   * @returns Promise with ApiResponse containing campaign
   */
  getCampaignById: async (
    campaignId: string
  ): Promise<ApiResponse<Campaign>> => {
    try {
      const data = await api.get<Campaign>(`/api/campaigns/${campaignId}`);
      return {
        success: true,
        data,
        message: "Campaign fetched successfully",
      };
    } catch (error: any) {
      console.error(`Error fetching campaign ${campaignId}:`, error);
      return {
        success: false,
        message: error.message || "Failed to fetch campaign",
      };
    }
  },

  /**
   * Create a new campaign
   * @param campaign Campaign data
   * @returns Promise with ApiResponse containing created campaign
   */
  createCampaign: async (
    campaign: CreateCampaignRequest
  ): Promise<ApiResponse<Campaign>> => {
    console.log("🎲 CampaignService: Creating new campaign", {
      name: campaign.name,
      description: campaign.description,
    });

    try {
      const response = await api.post<Campaign>("/api/campaigns", campaign);
      console.log(
        "🎲 CampaignService: Campaign created successfully",
        response.data
      );
      return {
        success: true,
        data: response.data,
        message: "Campaign created successfully",
      };
    } catch (error: any) {
      console.error("🎲 CampaignService: Error creating campaign", error);
      return {
        success: false,
        message: error.message || "Failed to create campaign",
      };
    }
  },

  /**
   * Update an existing campaign
   * @param campaignId Campaign ID
   * @param campaign Updated campaign data
   * @returns Promise with ApiResponse containing updated campaign
   */
  updateCampaign: async (
    campaignId: string,
    campaign: UpdateCampaignRequest
  ): Promise<ApiResponse<Campaign>> => {
    console.log("🎲 CampaignService: Updating campaign", {
      id: campaignId,
      data: campaign,
    });

    try {
      const response = await api.put<Campaign>(
        `/api/campaigns/${campaignId}`,
        campaign
      );
      console.log(
        "🎲 CampaignService: Campaign updated successfully",
        response.data
      );
      return {
        success: true,
        data: response.data,
        message: "Campaign updated successfully",
      };
    } catch (error: any) {
      console.error("🎲 CampaignService: Error updating campaign", error);
      return {
        success: false,
        message: error.message || "Failed to update campaign",
      };
    }
  },

  /**
   * Delete a campaign
   * @param campaignId Campaign ID
   * @returns Promise with ApiResponse containing success status
   */
  deleteCampaign: async (campaignId: string): Promise<ApiResponse<any>> => {
    console.log("🎲 CampaignService: Deleting campaign", { id: campaignId });

    try {
      const response = await api.delete<any>(`/api/campaigns/${campaignId}`);
      console.log("🎲 CampaignService: Campaign deleted successfully");
      return {
        success: true,
        data: response.data,
        message: "Campaign deleted successfully",
      };
    } catch (error: any) {
      console.error("🎲 CampaignService: Error deleting campaign", error);
      return {
        success: false,
        message: error.message || "Failed to delete campaign",
      };
    }
  },

  /**
   * Toggle campaign favorite status
   * @param campaignId Campaign ID
   * @param isFavorite New favorite status
   * @returns Promise with ApiResponse containing updated campaign
   */
  toggleFavorite: async (
    campaignId: string,
    isFavorite: boolean
  ): Promise<ApiResponse<Campaign>> => {
    try {
      const data = await api.patch<Campaign>(
        `/api/campaigns/${campaignId}/favorite`,
        {
          isFavorite,
        }
      );
      return {
        success: true,
        data,
        message: "Campaign favorite status updated successfully",
      };
    } catch (error: any) {
      console.error(
        `Error updating favorite status for campaign ${campaignId}:`,
        error
      );
      return {
        success: false,
        message: error.message || "Failed to update favorite status",
      };
    }
  },

  /**
   * Record campaign access
   * @param campaignId Campaign ID
   * @returns Promise with ApiResponse containing updated campaign
   */
  recordAccess: async (campaignId: string): Promise<ApiResponse<Campaign>> => {
    try {
      const data = await api.post<Campaign>(
        `/api/campaigns/${campaignId}/access`,
        {}
      );
      return {
        success: true,
        data,
        message: "Campaign access recorded successfully",
      };
    } catch (error: any) {
      console.error(
        `Error recording access for campaign ${campaignId}:`,
        error
      );
      return {
        success: false,
        message: error.message || "Failed to record campaign access",
      };
    }
  },
};

// Auth API Service
export const AuthService = {
  /**
   * Register a new user
   * @param userData User registration data
   * @returns Promise with ApiResponse containing registered user
   */
  register: async (userData: any): Promise<ApiResponse<any>> => {
    try {
      const response = await api.post<any>("/api/users/register", userData);
      // Store token if present
      if (response.token) {
        AuthUtils.setToken(response.token);
      }
      return {
        success: true,
        data: response,
        message: "Registration successful",
      };
    } catch (error: any) {
      console.error("Registration error:", error);
      return {
        success: false,
        message: error.message || "Registration failed",
      };
    }
  },

  /**
   * Login a user
   * @param credentials Login credentials
   * @returns Promise with ApiResponse containing login results
   */
  login: async (credentials: {
    username: string;
    password: string;
  }): Promise<ApiResponse<any>> => {
    try {
      console.log("AuthService.login: Attempting login with credentials:", {
        username: credentials.username,
        passwordProvided: !!credentials.password,
      });

      // Backend expects email, not username
      const response = await api.post<any>("/api/users/login", {
        email: credentials.username,
        password: credentials.password,
      });

      console.log("AuthService.login: Full response:", response);

      // Extract token properly
      // Check for both response.token and response.data.token formats
      const token = response.token || (response.data && response.data.token);

      console.log("AuthService.login: Token extracted:", !!token);

      // If we get a token in the response, store it
      if (token) {
        console.log("AuthService.login: Token found, storing it");
        AuthUtils.setToken(token);
      } else {
        console.warn("AuthService.login: No token found in response structure");
        console.log(
          "AuthService.login: Response structure:",
          JSON.stringify(response, null, 2)
        );
      }

      return {
        success: true,
        data: {
          ...response,
          token: token, // Ensure token is included in the data returned
        },
        message: "Login successful",
      };
    } catch (error: any) {
      // Enhanced error logging
      console.error("AuthService.login: Login error details:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
      });

      // Return more specific error message if available
      return {
        success: false,
        message:
          error.response?.data?.message || error.message || "Login failed",
      };
    }
  },

  /**
   * Get current user information
   * @returns Promise with ApiResponse containing user data
   */
  getCurrentUser: async (): Promise<ApiResponse<any>> => {
    try {
      const data = await api.get<any>("/api/users/me");
      return {
        success: true,
        data,
        message: "User data fetched successfully",
      };
    } catch (error: any) {
      console.error("Error fetching user data:", error);
      return {
        success: false,
        message: error.message || "Failed to fetch user data",
      };
    }
  },

  /**
   * Logout the current user
   */
  logout: async (): Promise<ApiResponse<void>> => {
    console.log("🔑 AuthService: Logging out user");

    try {
      // Only attempt server logout if we have a token
      if (AuthUtils.getToken()) {
        // Call logout endpoint but don't wait for response
        await api.post("/api/auth/logout").catch((err) => {
          console.warn("🔑 AuthService: Error during server logout", err);
        });
      }

      // Always clear token locally regardless of server response
      AuthUtils.clearToken();
      sessionStorage.removeItem("isLoggedIn");
      console.log("🔑 AuthService: User logged out successfully");

      return { success: true };
    } catch (error) {
      console.error("🔑 AuthService: Error during logout", error);

      // Still clear token locally on error
      AuthUtils.clearToken();
      sessionStorage.removeItem("isLoggedIn");

      return { success: true, message: "Logged out locally" };
    }
  },

  /**
   * Check if user is authenticated
   * @returns True if authenticated
   */
  isAuthenticated: (): boolean => {
    const token = AuthUtils.getToken();
    console.log("🔑 AuthService: Checking if authenticated", {
      hasToken: !!token,
    });
    return !!token;
  },

  /**
   * Validate the current token
   * @returns Promise with ApiResponse containing validation status
   */
  validateToken: async (): Promise<ApiResponse<boolean>> => {
    console.log("🔑 AuthService: Validating token");

    // In development mode, always return success if token exists
    if (process.env.NODE_ENV !== "production") {
      const token = AuthUtils.getToken();
      if (token) {
        console.log("🔑 AuthService: DEV MODE - Auto-validating token");
        return {
          success: true,
          data: true,
          message: "Development mode token auto-validated",
        };
      }
    }

    try {
      const response = await api.get("/api/auth/validate");
      console.log("🔑 AuthService: Token validation successful", response.data);
      return {
        success: true,
        data: response.data,
        message: "Token validation successful",
      };
    } catch (error) {
      console.error("🔑 AuthService: Token validation failed", error);

      // In development mode, still return success
      if (process.env.NODE_ENV !== "production") {
        console.log(
          "🔑 AuthService: DEV MODE - Treating failed validation as success"
        );
        return {
          success: true,
          data: true,
          message: "Development mode validation override",
        };
      }

      return { success: false, data: false, message: "Invalid token" };
    }
  },
};

// Export API client for use in other services
export { api };
