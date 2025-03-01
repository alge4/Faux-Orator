import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useMsal } from '@azure/msal-react';

const Home: React.FC = () => {
  const [campaigns, setCampaigns] = useState([]);
  const { user, logout } = useAuth();
  const { instance, accounts } = useMsal();

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        // Get access token for API calls
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          console.error("No auth token found");
          return;
        }
        
        const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
        const response = await axios.get(`${backendUrl}/api/campaigns`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setCampaigns(response.data);
      } catch (error) {
        console.error("Error fetching campaigns:", error);
      }
    };

    fetchCampaigns();
  }, []);

  const getAccessToken = async () => {
    if (accounts.length === 0) {
      throw new Error("No accounts logged in");
    }
    
    const clientId = process.env.REACT_APP_AZURE_CLIENT_ID;
    
    const request = {
      scopes: [`api://${clientId}/access_as_user`],
      account: accounts[0]
    };
    
    try {
      const response = await instance.acquireTokenSilent(request);
      return response.accessToken;
    } catch (error) {
      // If silent token acquisition fails, try interactive
      const response = await instance.acquireTokenPopup(request);
      return response.accessToken;
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="user-info">
          <p>Welcome, {user?.name || 'User'}</p>
          <button onClick={logout}>Sign Out</button>
        </div>
        <h1>Campaigns</h1>
        <ul>
          {campaigns.map((campaign: any) => (
            <li key={campaign.id}>{campaign.name}</li>
          ))}
        </ul>
      </header>
    </div>
  );
};

export default Home;
