import {
  apiClient,
  ApiResponse,
  Campaign,
  CreateCampaignRequest,
  UpdateCampaignRequest,
} from "./api";

// Campaign Service - handles all campaign-related API calls
export const CampaignService = {
  /**
   * Get all campaigns
   * @returns Promise with campaign data response
   */
  getCampaigns: async (): Promise<ApiResponse<Campaign[]>> => {
    console.log("CampaignService.getCampaigns: Fetching campaigns");

    // In development mode, provide mock data if API call fails
    if (process.env.NODE_ENV !== "production") {
      try {
        const response = await apiClient.get<ApiResponse<Campaign[]>>(
          "/api/campaigns"
        );
        console.log(
          "CampaignService.getCampaigns: Fetched",
          response.data?.length || 0,
          "campaigns"
        );
        return response;
      } catch (error) {
        console.warn(
          "CampaignService.getCampaigns: API call failed in dev mode, returning mock data",
          error
        );

        // Mock campaign data for development
        const mockCampaigns: Campaign[] = [
          {
            id: "mock-1",
            name: "The Lost Mines of Phandelver",
            description: "A starter campaign for new players",
            dmId: "1",
            archived: false,
            role: "DM",
            isFavorite: true,
            lastAccessed: new Date().toISOString(),
            createdAt: new Date(
              Date.now() - 1000 * 60 * 60 * 24 * 7
            ).toISOString(), // 7 days ago
            updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
          },
          {
            id: "mock-2",
            name: "Storm King's Thunder",
            description:
              "Giants have emerged from their strongholds to threaten civilization as never before.",
            dmId: "1",
            archived: false,
            role: "DM",
            isFavorite: false,
            lastAccessed: new Date(
              Date.now() - 1000 * 60 * 60 * 24
            ).toISOString(), // 1 day ago
            createdAt: new Date(
              Date.now() - 1000 * 60 * 60 * 24 * 30
            ).toISOString(), // 30 days ago
            updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
          },
          {
            id: "mock-3",
            name: "Curse of Strahd",
            description: "Gothic horror campaign set in Barovia",
            dmId: "1",
            archived: false,
            role: "Player",
            isFavorite: true,
            lastAccessed: new Date(
              Date.now() - 1000 * 60 * 60 * 2
            ).toISOString(), // 2 hours ago
            createdAt: new Date(
              Date.now() - 1000 * 60 * 60 * 24 * 14
            ).toISOString(), // 14 days ago
            updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
          },
        ];

        return {
          success: true,
          data: mockCampaigns,
          message: "DEV MODE: Returning mock campaign data",
        };
      }
    }

    // Production mode - always use real API
    return await apiClient.get<ApiResponse<Campaign[]>>("/api/campaigns");
  },

  /**
   * Get a campaign by ID
   * @param id Campaign ID
   * @returns Promise with campaign data response
   */
  getCampaign: async (id: string): Promise<ApiResponse<Campaign>> => {
    console.log(`CampaignService.getCampaign: Fetching campaign ${id}`);

    // In development mode, provide mock data if API call fails
    if (process.env.NODE_ENV !== "production") {
      try {
        const response = await apiClient.get<ApiResponse<Campaign>>(
          `/api/campaigns/${id}`
        );
        return response;
      } catch (error) {
        console.warn(
          `CampaignService.getCampaign: API call failed in dev mode, returning mock data for ${id}`
        );

        // Mock campaign data for development
        const mockCampaign: Campaign = {
          id,
          name: `Mock Campaign ${id}`,
          description: "This is a mock campaign for development",
          dmId: "1",
          archived: false,
          role: "DM",
          isFavorite: true,
          lastAccessed: new Date().toISOString(),
          createdAt: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * 7
          ).toISOString(), // 7 days ago
          updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
        };

        return {
          success: true,
          data: mockCampaign,
          message: "DEV MODE: Returning mock campaign data",
        };
      }
    }

    // Production mode - always use real API
    return await apiClient.get<ApiResponse<Campaign>>(`/api/campaigns/${id}`);
  },

  /**
   * Create a new campaign
   * @param campaign Campaign data
   * @returns Promise with created campaign response
   */
  createCampaign: async (
    campaign: CreateCampaignRequest
  ): Promise<ApiResponse<Campaign>> => {
    console.log(
      "CampaignService.createCampaign: Creating campaign",
      campaign.name
    );

    // In development mode, provide mock response if API call fails
    if (process.env.NODE_ENV !== "production") {
      try {
        const response = await apiClient.post<ApiResponse<Campaign>>(
          "/api/campaigns",
          campaign
        );
        return response;
      } catch (error) {
        console.warn(
          "CampaignService.createCampaign: API call failed in dev mode, returning mock response"
        );

        // Mock created campaign for development
        const mockCampaign: Campaign = {
          id: "mock-" + Date.now(),
          name: campaign.name,
          description: campaign.description,
          imageUrl: campaign.imageUrl || undefined,
          dmId: "1",
          archived: false,
          role: "DM",
          isFavorite: false,
          lastAccessed: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        return {
          success: true,
          data: mockCampaign,
          message: "DEV MODE: Campaign created successfully",
        };
      }
    }

    // Production mode - always use real API
    return await apiClient.post<ApiResponse<Campaign>>(
      "/api/campaigns",
      campaign
    );
  },

  /**
   * Update a campaign
   * @param id Campaign ID
   * @param campaign Updated campaign data
   * @returns Promise with updated campaign response
   */
  updateCampaign: async (
    id: string,
    campaign: UpdateCampaignRequest
  ): Promise<ApiResponse<Campaign>> => {
    console.log(`CampaignService.updateCampaign: Updating campaign ${id}`);

    // In development mode, provide mock response if API call fails
    if (process.env.NODE_ENV !== "production") {
      try {
        const response = await apiClient.put<ApiResponse<Campaign>>(
          `/api/campaigns/${id}`,
          campaign
        );
        return response;
      } catch (error) {
        console.warn(
          `CampaignService.updateCampaign: API call failed in dev mode, returning mock response for ${id}`
        );

        // Mock updated campaign for development
        const mockCampaign: Campaign = {
          id,
          name: campaign.name || `Mock Campaign ${id}`,
          description: campaign.description || "Updated mock description",
          imageUrl: campaign.imageUrl,
          dmId: "1",
          archived: false,
          role: "DM",
          isFavorite: true,
          lastAccessed: new Date().toISOString(),
          createdAt: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * 7
          ).toISOString(), // 7 days ago
          updatedAt: new Date().toISOString(),
        };

        return {
          success: true,
          data: mockCampaign,
          message: "DEV MODE: Campaign updated successfully",
        };
      }
    }

    // Production mode - always use real API
    return await apiClient.put<ApiResponse<Campaign>>(
      `/api/campaigns/${id}`,
      campaign
    );
  },

  /**
   * Delete a campaign
   * @param id Campaign ID
   * @returns Promise with delete response
   */
  deleteCampaign: async (id: string): Promise<ApiResponse<null>> => {
    console.log(`CampaignService.deleteCampaign: Deleting campaign ${id}`);

    // In development mode, provide mock response if API call fails
    if (process.env.NODE_ENV !== "production") {
      try {
        const response = await apiClient.delete<ApiResponse<null>>(
          `/api/campaigns/${id}`
        );
        return response;
      } catch (error) {
        console.warn(
          `CampaignService.deleteCampaign: API call failed in dev mode, returning mock response for ${id}`
        );

        return {
          success: true,
          message: "DEV MODE: Campaign deleted successfully",
        };
      }
    }

    // Production mode - always use real API
    return await apiClient.delete<ApiResponse<null>>(`/api/campaigns/${id}`);
  },

  /**
   * Set a campaign as favorite
   * @param id Campaign ID
   * @param isFavorite Favorite status
   * @returns Promise with updated campaign response
   */
  setFavorite: async (
    id: string,
    isFavorite: boolean
  ): Promise<ApiResponse<Campaign>> => {
    console.log(
      `CampaignService.setFavorite: Setting campaign ${id} favorite status to ${isFavorite}`
    );

    // In development mode, provide mock response if API call fails
    if (process.env.NODE_ENV !== "production") {
      try {
        const response = await apiClient.patch<ApiResponse<Campaign>>(
          `/api/campaigns/${id}/favorite`,
          { isFavorite }
        );
        return response;
      } catch (error) {
        console.warn(
          `CampaignService.setFavorite: API call failed in dev mode, returning mock response for ${id}`
        );

        // Mock favorite response for development
        const mockCampaign: Campaign = {
          id,
          name: `Mock Campaign ${id}`,
          description: "This is a mock campaign for development",
          dmId: "1",
          archived: false,
          role: "DM",
          isFavorite,
          lastAccessed: new Date().toISOString(),
          createdAt: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * 7
          ).toISOString(), // 7 days ago
          updatedAt: new Date().toISOString(),
        };

        return {
          success: true,
          data: mockCampaign,
          message: `DEV MODE: Campaign ${
            isFavorite ? "added to" : "removed from"
          } favorites successfully`,
        };
      }
    }

    // Production mode - always use real API
    return await apiClient.patch<ApiResponse<Campaign>>(
      `/api/campaigns/${id}/favorite`,
      { isFavorite }
    );
  },
};
