import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCampaign } from '../hooks/useCampaign';
import './Dashboard.css';
import DeleteConfirmation from '../components/DeleteConfirmation';
import { FaTrash } from 'react-icons/fa';

// Define campaign form data interface
interface CampaignFormData {
  name: string;
  description: string;
  setting: string;
  theme: string;
  is_active?: boolean;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { campaigns, createCampaign, setCurrentCampaign, currentCampaign, deleteCampaign } = useCampaign();
  const navigate = useNavigate();
  
  // State for creating a new campaign
  const [showNewCampaignForm, setShowNewCampaignForm] = useState(false);
  const [newCampaignData, setNewCampaignData] = useState<CampaignFormData>({
    name: '',
    description: '',
    setting: '',
    theme: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{id: string, name: string} | null>(null);
  
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'description' && value.length > 500) {
      return; // Don't update if description exceeds 500 characters
    }
    setNewCampaignData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle campaign creation
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCampaignData.name.trim()) {
      return; // Validate name at minimum
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('Creating campaign with data:', {
        ...newCampaignData,
        is_active: true
      });
      
      const campaign = await createCampaign({
        ...newCampaignData,
        is_active: true
      });
      
      console.log('Campaign creation result:', campaign);
      
      if (campaign) {
        setShowNewCampaignForm(false);
        setNewCampaignData({
          name: '',
          description: '',
          setting: '',
          theme: ''
        });
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Select a campaign and navigate to it
  const handleSelectCampaign = (campaignId: string) => {
    const selected = campaigns.find(c => c.id === campaignId);
    if (selected) {
      setCurrentCampaign(selected);
      navigate(`/campaign/${selected.id}/view`);
    }
  };
  
  // Handle campaign deletion
  const handleDeleteCampaign = async (id: string) => {
    await deleteCampaign(id);
    setDeleteTarget(null);
  };
  
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome, {user?.user_metadata?.name || 'Dungeon Master'}</h1>
        <p className="dashboard-subtitle">Manage your D&D campaigns and adventures</p>
      </div>
      
      <div className="dashboard-content">
        {/* Campaign overview section */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Your Campaigns</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className={`btn btn-secondary btn-sm${deleteMode ? ' active' : ''}`}
                onClick={() => setDeleteMode(m => !m)}
                title={deleteMode ? 'Exit Delete Mode' : 'Delete Campaigns'}
              >
                <FaTrash style={{ marginRight: 4 }} /> {deleteMode ? 'Done' : 'Delete'}
              </button>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => setShowNewCampaignForm(true)}
              >
                Create Campaign
              </button>
            </div>
          </div>
          
          {/* Campaign list */}
          <div className="campaign-grid">
            {campaigns.length > 0 ? (
              campaigns.map(campaign => (
                <div 
                  key={campaign.id} 
                  className={`campaign-card ${campaign.is_active ? 'active-campaign' : ''}`}
                  onClick={() => !deleteMode && handleSelectCampaign(campaign.id)}
                  style={{ position: 'relative' }}
                >
                  {deleteMode && (
                    <button
                      className="campaign-delete-btn"
                      title="Delete Campaign"
                      onClick={e => {
                        e.stopPropagation();
                        setDeleteTarget({ id: campaign.id, name: campaign.name });
                      }}
                      style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', zIndex: 2 }}
                    >
                      <FaTrash />
                    </button>
                  )}
                  <h3 className="campaign-title">{campaign.name}</h3>
                  <p className="campaign-setting">{campaign.setting || 'No setting defined'}</p>
                  <p className="campaign-description">{campaign.description || 'No description provided'}</p>
                  <div className="campaign-footer">
                    <span className="campaign-theme">{campaign.theme || 'No theme'}</span>
                    <span className="campaign-date">
                      Created: {new Date(campaign.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>You don't have any campaigns yet.</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowNewCampaignForm(true)}
                >
                  Create Your First Campaign
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Quick actions section */}
        {currentCampaign && (
          <div className="dashboard-section">
            <h2>Quick Actions</h2>
            <div className="quick-actions">
              <div className="action-card" onClick={() => navigate('/npcs')}>
                <h3>NPCs</h3>
                <p>Manage characters in your campaign</p>
              </div>
              <div className="action-card" onClick={() => navigate('/locations')}>
                <h3>Locations</h3>
                <p>Create and organize world locations</p>
              </div>
              <div className="action-card" onClick={() => navigate('/session-planner')}>
                <h3>Session Planning</h3>
                <p>Plan your next gaming session</p>
              </div>
              <button 
                className="action-button"
                onClick={() => setShowNewCampaignForm(true)}
              >
                <i className="fas fa-plus"></i>
                Create New Campaign
              </button>
              <Link to="/voice-chat-test" className="action-button voice-chat-test-link">
                <i className="fas fa-microphone"></i>
                Test Voice Chat
              </Link>
            </div>
          </div>
        )}
      </div>
      
      {/* New Campaign Modal */}
      {showNewCampaignForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create New Campaign</h2>
              <button 
                className="modal-close"
                onClick={() => setShowNewCampaignForm(false)}
                disabled={isSubmitting}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateCampaign}>
              <div className="form-group">
                <label htmlFor="name" className="form-label">Campaign Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="form-control"
                  value={newCampaignData.name}
                  onChange={handleInputChange}
                  placeholder="Enter campaign name"
                  disabled={isSubmitting}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description" className="form-label">Description</label>
                <textarea
                  id="description"
                  name="description"
                  className="form-control"
                  value={newCampaignData.description}
                  onChange={handleInputChange}
                  placeholder="Describe your campaign (max 500 characters)"
                  disabled={isSubmitting}
                  rows={3}
                  maxLength={500}
                />
                <small className="character-count">
                  {newCampaignData.description.length}/500 characters
                </small>
              </div>
              
              <div className="form-group">
                <label htmlFor="setting" className="form-label">Setting</label>
                <input
                  type="text"
                  id="setting"
                  name="setting"
                  className="form-control"
                  value={newCampaignData.setting}
                  onChange={handleInputChange}
                  placeholder="e.g. Forgotten Realms, Homebrew World"
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="theme" className="form-label">Theme</label>
                <input
                  type="text"
                  id="theme"
                  name="theme"
                  className="form-control"
                  value={newCampaignData.theme}
                  onChange={handleInputChange}
                  placeholder="e.g. Dark Fantasy, Epic Adventure"
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowNewCampaignForm(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || !newCampaignData.name.trim()}
                >
                  {isSubmitting ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleteTarget && (
        <DeleteConfirmation
          entityType="campaign"
          entityName={deleteTarget.name}
          entityId={deleteTarget.id}
          onClose={() => setDeleteTarget(null)}
          onDelete={() => handleDeleteCampaign(deleteTarget.id)}
          handleDeleteEntitySubmit={async (id) => { await deleteCampaign(id); return true; }}
        />
      )}
    </div>
  );
};

export default Dashboard; 