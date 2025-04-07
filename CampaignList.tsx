import React, { useState, useEffect } from 'react';
import CampaignItem from './CampaignItem';
import CreateCampaign from './CreateCampaign';
import './CampaignList.css';
import { CampaignService, Campaign as ApiCampaign } from '../services/api';
import { useSnackbar } from 'notistack';
import { useAuth } from '../context/AuthContext';

// Campaign interface for component use - extending the API interface as needed
interface Campaign {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  role: string;
}

const CampaignList: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { enqueueSnackbar } = useSnackbar();
  const { isAuthenticated } = useAuth();

  // Improved fetchCampaigns function using the API service
  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!isAuthenticated) {
        return;
      }
      
      const response = await CampaignService.getCampaigns();
      
      if (response.success && response.data) {
        console.log("CampaignList: received", response.data.length, "campaigns from API");
        
        // Map API response to component's Campaign interface
        const mappedCampaigns = response.data.map(apiCampaign => ({
          id: apiCampaign.id,
          name: apiCampaign.name,
          description: apiCampaign.description,
          imageUrl: apiCampaign.imageUrl,
          role: apiCampaign.role
        }));
        
        setCampaigns(mappedCampaigns);
      } else {
        console.error("Failed to fetch campaigns:", response.message);
        setError(response.message || "Failed to load campaigns");
        enqueueSnackbar(response.message || 'Failed to load campaigns', { variant: 'error' });
      }
    } catch (err: any) {
      console.error("Error fetching campaigns:", err);
      setError("Failed to load campaigns");
      enqueueSnackbar('Unable to fetch campaigns. Please try again later.', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log("CampaignList: component mounted, fetching initial data");
    fetchCampaigns();
    
    // Add event listener for campaign_created events
    const handleCampaignCreated = () => {
      console.log("CampaignList: detected campaign_created event, refreshing campaigns");
      fetchCampaigns();
    };
    
    // Listen for campaign creation events from Dashboard
    window.addEventListener('campaign_created', handleCampaignCreated);
    
    // Cleanup
    return () => {
      window.removeEventListener('campaign_created', handleCampaignCreated);
    };
  }, []);
  
  // Auto-refresh campaigns periodically
  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log("CampaignList: auto-refreshing campaigns");
      fetchCampaigns();
    }, 30000); // 30 seconds to avoid excessive API calls
    
    return () => clearInterval(intervalId);
  }, []);
  
  useEffect(() => {
    if (refreshKey > 0) {
      fetchCampaigns();
    }
  }, [refreshKey]);

  // Updated handleCreateCampaign to use API service
  const handleCreateCampaign = async (name: string, description: string) => {
    try {
      setIsLoading(true);
      
      if (!isAuthenticated) {
        setError("You need to be logged in to perform this action");
        enqueueSnackbar('You need to be logged in to create campaigns', { variant: 'error' });
        return;
      }
      
      const response = await CampaignService.createCampaign({
        name,
        description,
        imageUrl: null // Optional in API
      });
      
      if (response.success) {
        console.log("CampaignList: Campaign created successfully:", response.data);
        
        // Close the modal
        setIsCreateModalOpen(false);
        
        // Refresh campaigns to get updated list from server
        fetchCampaigns();
        
        // Dispatch event to notify Dashboard component
        window.dispatchEvent(new CustomEvent('sidebar_campaign_created'));
        console.log("CampaignList: Dispatched sidebar_campaign_created event");
        
        // Show success message
        enqueueSnackbar('Campaign created successfully!', { variant: 'success' });
      } else {
        console.error("Failed to create campaign:", response.message);
        setError(response.message || "Failed to create campaign");
        enqueueSnackbar(response.message || 'Failed to create campaign', { variant: 'error' });
      }
    } catch (err: any) {
      console.error("Error creating campaign:", err);
      setError("Failed to create campaign");
      enqueueSnackbar('Error creating campaign', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Updated handleDeleteCampaign to use API service
  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      setIsLoading(true);
      
      if (!isAuthenticated) {
        setError("You need to be logged in to perform this action");
        return;
      }
      
      const response = await CampaignService.deleteCampaign(campaignId);
      
      if (response.success) {
        // Remove campaign from local state for immediate UI update
        setCampaigns(campaigns.filter(c => c.id !== campaignId));
        
        // Show success message
        enqueueSnackbar('Campaign deleted successfully', { variant: 'success' });
      } else {
        setError(response.message || "Failed to delete campaign");
        enqueueSnackbar(response.message || 'Failed to delete campaign', { variant: 'error' });
      }
    } catch (err: any) {
      console.error("Error deleting campaign:", err);
      setError("Failed to delete campaign");
      enqueueSnackbar('Error deleting campaign', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Updated handleRenameCampaign to use API service
  const handleRenameCampaign = async (campaignId: string, newName: string) => {
    try {
      setIsLoading(true);
      
      if (!isAuthenticated) {
        setError("You need to be logged in to perform this action");
        return;
      }
      
      // Find the campaign to get its current description
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) {
        setError("Campaign not found");
        setIsLoading(false);
        return;
      }
      
      const response = await CampaignService.updateCampaign(campaignId, {
        name: newName,
        description: campaign.description,
        imageUrl: campaign.imageUrl
      });
      
      if (response.success) {
        // Update local state for immediate UI update
        setCampaigns(campaigns.map(c => c.id === campaignId ? {
          ...c,
          name: newName
        } : c));
        
        // Show success message
        enqueueSnackbar('Campaign renamed successfully', { variant: 'success' });
      } else {
        setError(response.message || "Failed to rename campaign");
        enqueueSnackbar(response.message || 'Failed to rename campaign', { variant: 'error' });
      }
    } catch (err: any) {
      console.error("Error renaming campaign:", err);
      setError("Failed to rename campaign");
      enqueueSnackbar('Error renaming campaign', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="campaign-list">
      <div className="campaign-list-header">
        <h4>Campaigns</h4>
        <button 
          className="create-campaign-btn"
          onClick={() => setIsCreateModalOpen(true)}
        >
          +
        </button>
      </div>
      
      {isLoading ? (
        <div className="loading">Loading campaigns...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : campaigns.length === 0 ? (
        <div className="empty-state">
          <p>No campaigns found</p>
          <button onClick={() => setIsCreateModalOpen(true)}>Create your first campaign</button>
        </div>
      ) : (
        <>
          <div className="campaign-summary">
            <p>Available campaigns: {campaigns.map(c => c.name).join(', ')}</p>
          </div>
          <ul className="campaigns">
            {campaigns.map(campaign => (
              <CampaignItem 
                key={campaign.id}
                campaign={campaign}
                onDelete={handleDeleteCampaign}
                onRename={handleRenameCampaign}
              />
            ))}
          </ul>
        </>
      )}
      
      {isCreateModalOpen && (
        <CreateCampaign 
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateCampaign}
        />
      )}
    </div>
  );
};

export default CampaignList;