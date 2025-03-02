import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CampaignItem from './CampaignItem';
import CreateCampaign from './CreateCampaign';
import './CampaignList.css';

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

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setError("No auth token found");
        setIsLoading(false);
        return;
      }
      
      const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
      const response = await axios.get(`${backendUrl}/api/campaigns`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setCampaigns(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      setError("Failed to load campaigns");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreateCampaign = async (name: string, description: string) => {
    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setError("No auth token found");
        return;
      }
      
      const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
      await axios.post(
        `${backendUrl}/api/campaigns`, 
        { name, description },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setIsCreateModalOpen(false);
      fetchCampaigns(); // Refresh the campaign list
    } catch (error) {
      console.error("Error creating campaign:", error);
      setError("Failed to create campaign");
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setError("No auth token found");
        return;
      }
      
      const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
      await axios.delete(`${backendUrl}/api/campaigns/${campaignId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      fetchCampaigns(); // Refresh the campaign list
    } catch (error) {
      console.error("Error deleting campaign:", error);
      setError("Failed to delete campaign");
    }
  };

  const handleRenameCampaign = async (campaignId: string, newName: string) => {
    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setError("No auth token found");
        return;
      }
      
      // Find the campaign to get its current description
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) {
        setError("Campaign not found");
        return;
      }
      
      const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
      await axios.put(
        `${backendUrl}/api/campaigns/${campaignId}`, 
        { 
          name: newName,
          description: campaign.description // Keep the existing description
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      fetchCampaigns(); // Refresh the campaign list
    } catch (error) {
      console.error("Error renaming campaign:", error);
      setError("Failed to rename campaign");
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