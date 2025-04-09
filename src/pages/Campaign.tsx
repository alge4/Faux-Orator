import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCampaign } from '../hooks/useCampaign';
import './Campaign.css';

const Campaign: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { campaigns, setCurrentCampaign } = useCampaign();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Find the current campaign based on the URL parameter
  const campaign = campaigns.find(c => c.id === id);
  
  useEffect(() => {
    if (campaign) {
      setCurrentCampaign(campaign);
      setLoading(false);
    } else if (!loading && campaigns.length > 0) {
      // If campaign not found but we have campaigns, redirect to dashboard
      navigate('/dashboard');
    }
  }, [campaign, campaigns.length, id, navigate, setCurrentCampaign]);
  
  if (loading) {
    return <div className="loading">Loading campaign...</div>;
  }
  
  if (!campaign) {
    return <div className="loading">Campaign not found. Redirecting...</div>;
  }
  
  return (
    <div className="campaign-page">
      <div className="campaign-header">
        <div className="campaign-header-left">
          <Link to="/dashboard" className="back-link">
            ← Back to Dashboard
          </Link>
          <h1>{campaign.name}</h1>
          <p className="campaign-setting">{campaign.setting || 'No setting defined'}</p>
        </div>
        <div className="campaign-header-right">
          <span className="campaign-theme">{campaign.theme || 'No theme'}</span>
          <span className="campaign-date">
            Created: {new Date(campaign.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
      
      <div className="campaign-description">
        <h2>Description</h2>
        <p>{campaign.description || 'No description provided.'}</p>
      </div>
      
      <div className="campaign-sections">
        <div className="campaign-section">
          <h2>NPCs</h2>
          <div className="campaign-section-content empty-content">
            <p>No NPCs have been created yet.</p>
            <button className="btn btn-primary" onClick={() => navigate('/npcs')}>
              Create NPCs
            </button>
          </div>
        </div>
        
        <div className="campaign-section">
          <h2>Locations</h2>
          <div className="campaign-section-content empty-content">
            <p>No locations have been created yet.</p>
            <button className="btn btn-primary" onClick={() => navigate('/locations')}>
              Create Locations
            </button>
          </div>
        </div>
        
        <div className="campaign-section">
          <h2>Session Plans</h2>
          <div className="campaign-section-content empty-content">
            <p>No session plans have been created yet.</p>
            <button className="btn btn-primary" onClick={() => navigate('/session-planner')}>
              Create Session Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Campaign; 