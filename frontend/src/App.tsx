import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await axios.get('/api/campaigns'); // No auth yet
        setCampaigns(response.data);
      } catch (error) {
        console.error("Error fetching campaigns:", error);
      }
    };

    fetchCampaigns();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Campaigns</h1>
        <ul>
          {campaigns.map((campaign: any) => (
            <li key={campaign.id}>{campaign.name}</li>
          ))}
        </ul>
      </header>
    </div>
  );
}

export default App;
