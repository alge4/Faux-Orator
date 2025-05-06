import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useCampaign, CampaignMode, Entity } from '../hooks/useCampaign';
import { useAuth } from '../hooks/useAuth';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import ChatInterface from '../components/ChatInterface/ChatInterface';
import NetworkView from '../components/NetworkView';
import DataView from '../components/DataView';
import VoiceChat from '../components/VoiceChat';
import CampaignMenu from '../components/CampaignMenu';
import EntityTabsBar from '../components/EntityTabsBar';
import { supabase, fetchAllEntitiesForCampaign } from '../services/supabase';
import chevronIcon from '../assets/icons/chevron.svg';
import { useAssistantChat } from '../hooks/useAssistantChat';
import './CampaignView.css';

interface CampaignFormData {
  name: string;
  description: string;
  setting: string;
  theme: string;
}

// Interface for entity data
interface EntityData {
  id: string;
  name: string;
  description?: string;
  content?: Record<string, unknown>;
  [key: string]: unknown;
}

const CampaignView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { currentCampaign, loading, error, setCurrentCampaign, refreshCampaigns } = useCampaign();
  
  // State
  const [entities, setEntities] = useState<Entity[]>([]);
  const [activeMode, setActiveMode] = useState<CampaignMode>(() => {
    // Initialize mode from navigation state if available, otherwise default to Planning
    return location.state?.mode || CampaignMode.Planning;
  });
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editFormData, setEditFormData] = useState<CampaignFormData>({
    name: '',
    description: '',
    setting: '',
    theme: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isRotating, setIsRotating] = useState<'left' | 'right' | null>(null);
  const [mainContentPadding, setMainContentPadding] = useState(false);
  const [selectedEntityForView, setSelectedEntityForView] = useState<EntityData | null>(null);

  const {
    assistantChat,
    messages: assistantMessages,
    isLoading: isChatLoading,
    error: chatError,
    sendMessage,
    isTyping
  } = useAssistantChat(currentCampaign?.id || '', activeMode);

  // Define fetchCampaigns function
  const fetchCampaigns = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching campaigns:', error);
        return;
      }
      
      setCampaigns(data || []);
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
    }
  }, []);

  // Define fetchEntities function
  const fetchEntities = useCallback(async () => {
    if (!currentCampaign?.id) return;

    try {
      const allEntities = await fetchAllEntitiesForCampaign(currentCampaign.id);
      const convertedEntities: Entity[] = [
        ...(allEntities.npcs || []).map(npc => ({
          id: npc.id,
          name: npc.name,
          type: 'npc' as const,
          campaign_id: npc.campaign_id,
          content: { description: npc.description },
          locked: false,
          created_at: npc.created_at,
          updated_at: npc.updated_at
        })),
        ...(allEntities.locations || []).map(loc => ({
          id: loc.id,
          name: loc.name,
          type: 'location' as const,
          campaign_id: loc.campaign_id,
          content: { description: loc.description },
          locked: false,
          created_at: loc.created_at,
          updated_at: loc.updated_at
        })),
        ...(allEntities.factions || []).map(faction => ({
          id: faction.id,
          name: faction.name,
          type: 'faction' as const,
          campaign_id: faction.campaign_id,
          content: { description: faction.description },
          locked: false,
          created_at: faction.created_at,
          updated_at: faction.updated_at
        })),
        ...(allEntities.items || []).map(item => ({
          id: item.id,
          name: item.name,
          type: 'item' as const,
          campaign_id: item.campaign_id,
          content: { description: item.description },
          locked: false,
          created_at: item.created_at,
          updated_at: item.updated_at
        }))
      ];

      setEntities(convertedEntities);
    } catch (error) {
      console.error('Error fetching entities:', error);
    }
  }, [currentCampaign?.id]);

  // Load current campaign data into form when opened
  useEffect(() => {
    if (currentCampaign) {
      setEditFormData({
        name: currentCampaign.name || '',
        description: currentCampaign.description || '',
        setting: currentCampaign.setting || '',
        theme: currentCampaign.theme || ''
      });
    }
  }, [currentCampaign]);

  // Load campaigns
  useEffect(() => {
    if (user) {
      fetchCampaigns();
      if (id) {
        fetchEntities();
      }
    }
  }, [user, id]);

  // Handle entity selection
  const handleEntitySelect = (entity: EntityData) => {
    console.log('Selected entity:', entity);
    setSelectedEntityForView(entity);
    // You can add more handling here like adding the entity to the chat
  };

  // Combined input handler for both text inputs and textareas
  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    // Only check length for description field
    if (name === 'description' && value.length > 500) {
      return;
    }

    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCampaign?.id || !editFormData.name.trim()) return;

    setIsSubmitting(true);
    try {
      const updateData = {
        name: editFormData.name.trim(),
        description: editFormData.description.trim(),
        setting: editFormData.setting.trim(),
        theme: editFormData.theme.trim(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', currentCampaign.id)
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        // Update both the current campaign and the campaigns list
        setCurrentCampaign(data);
        setCampaigns(prevCampaigns => 
          prevCampaigns.map(campaign => 
            campaign.id === data.id ? data : campaign
          )
        );
        setShowEditForm(false);
      }
    } catch (error) {
      console.error('Error updating campaign:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle sending messages
  const handleSendMessage = async (content: string, files?: File[]) => {
    if (!currentCampaign?.id || !user?.id) return;

    const newMessage = {
      id: Date.now().toString(),
      content: content,
      sender: user.email || 'Anonymous',
      timestamp: new Date().toISOString(),
      entities: []
    };

    setMessages(prev => [...prev, newMessage]);

    // Here you would typically also save the message to your database
    try {
      await supabase
        .from('messages')
        .insert([{
          campaign_id: currentCampaign.id,
          user_id: user.id,
          content: content,
          mode: activeMode
        }]);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  // Fetch entities when the campaign ID changes
  useEffect(() => {
    if (currentCampaign?.id) {
      fetchEntities();
    }
  }, [currentCampaign?.id]);

  const handleBackToDashboard = async () => {
    await refreshCampaigns();
    navigate('/dashboard');
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Only close if clicking directly on the overlay, not its children
    if (e.target === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();
      // Uncomment the line below if you want to allow closing by clicking the overlay
      // setIsEditing(false);
    }
  };

  const handleCampaignSelect = (campaignId: string) => {
    const selected = campaigns.find(c => c.id === campaignId);
    if (selected) {
      setCurrentCampaign(selected);
      // Navigate to the campaign view while maintaining the current mode
      navigate(`/campaign/${campaignId}/view`, { state: { mode: activeMode } });
    }
  };

  const handleToggleSidebar = () => {
    setIsRotating(isSidebarCollapsed ? 'left' : 'right');
    setIsSidebarCollapsed(prev => !prev);
    // Reset animation class after animation completes
    setTimeout(() => setIsRotating(null), 300);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className={`campaign-view ${mainContentPadding ? 'expanded-padding' : ''}`}>
      <div className="campaign-header">
        <div className="header-left">
          <button 
            onClick={handleBackToDashboard}
            className="back-button"
            aria-label="Back to dashboard"
          >
            ← Back to Dashboard
          </button>
          <h3>{currentCampaign?.name || 'Campaign Assistant'}</h3>
        </div>
        <div className="mode-switcher">
          <button 
            className={`mode-button ${activeMode === CampaignMode.Planning ? 'active' : ''}`}
            onClick={() => setActiveMode(CampaignMode.Planning)}
          >
            Planning
          </button>
          <button 
            className={`mode-button ${activeMode === CampaignMode.Running ? 'active' : ''}`}
            onClick={() => setActiveMode(CampaignMode.Running)}
          >
            Running
          </button>
          <button 
            className={`mode-button ${activeMode === CampaignMode.Review ? 'active' : ''}`}
            onClick={() => setActiveMode(CampaignMode.Review)}
          >
            Review
          </button>
        </div>
        <button 
          className="menu-button" 
          aria-label="Menu"
          onClick={() => setIsMenuOpen(true)}
        >
          <span></span>
        </button>
        <CampaignMenu 
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          onEdit={() => {
            setIsMenuOpen(false);
            setShowEditForm(true);
          }}
        />
      </div>

      {/* Edit Campaign Modal */}
      {showEditForm && (
        <div className="modal-overlay" onClick={handleOverlayClick}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Campaign</h2>
              <button 
                className="modal-close"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEditForm(false);
                }}
                disabled={isSubmitting}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label htmlFor="name" className="form-label">Campaign Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="form-control"
                  value={editFormData.name}
                  onChange={handleFormChange}
                  placeholder="Enter campaign name"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description" className="form-label">Description</label>
                <textarea
                  id="description"
                  name="description"
                  className="form-control"
                  value={editFormData.description}
                  onChange={handleFormChange}
                  placeholder="Describe your campaign (max 500 characters)"
                  rows={3}
                  maxLength={500}
                />
                <small className={`character-count ${
                  editFormData.description.length > 450 ? 'near-limit' : ''
                } ${
                  editFormData.description.length >= 500 ? 'at-limit' : ''
                }`}>
                  {editFormData.description.length}/500 characters
                </small>
              </div>
              
              <div className="form-group">
                <label htmlFor="setting" className="form-label">Setting</label>
                <input
                  type="text"
                  id="setting"
                  name="setting"
                  className="form-control"
                  value={editFormData.setting}
                  onChange={handleFormChange}
                  placeholder="e.g. Forgotten Realms, Homebrew World"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="theme" className="form-label">Theme</label>
                <input
                  type="text"
                  id="theme"
                  name="theme"
                  className="form-control"
                  value={editFormData.theme}
                  onChange={handleFormChange}
                  placeholder="e.g. Dark Fantasy, Epic Adventure"
                />
              </div>
              
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEditForm(false);
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || !editFormData.name.trim()}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main three-panel layout */}
      <div className="campaign-content">
        {/* Left panel - Campaign List */}
        <aside className={`left-panel ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          <button 
            className={`toggle-sidebar ${isRotating ? `rotating-${isRotating}` : ''}`}
            onClick={handleToggleSidebar}
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <img src={chevronIcon} alt="Toggle sidebar" />
          </button>
          <h2>Campaigns</h2>
          <div className="campaign-list">
            {campaigns.map(campaign => (
              <button
                key={campaign.id}
                className={`campaign-item ${currentCampaign?.id === campaign.id ? 'active' : ''}`}
                onClick={() => handleCampaignSelect(campaign.id)}
              >
                {campaign.name}
              </button>
            ))}
          </div>
        </aside>

        {/* Center panel - Main Content */}
        <main className="main-panel">
          {activeMode === CampaignMode.Planning && (
            <div className="planning-view">
              <div className="world-graph">
                <h2>World Graph</h2>
                <NetworkView 
                  currentCampaign={currentCampaign}
                  entities={entities}
                />
              </div>
              <div className="dm-assistant-chat">
                <h2>DM Assistant</h2>
                <ChatInterface 
                  mode="planning"
                  messages={assistantMessages}
                  onSendMessage={handleSendMessage}
                  availableEntities={entities}
                  isTyping={isTyping}
                  campaignId={currentCampaign?.id}
                  userId={user?.id}
                  isAIAssistant={true}
                  assistantChat={assistantChat}
                />
              </div>
            </div>
          )}
          {activeMode === CampaignMode.Running && (
            <div className="chat-section">
              <h2>Session Chat</h2>
              <ChatInterface 
                mode="running"
                messages={assistantMessages}
                onSendMessage={handleSendMessage}
                availableEntities={entities}
                isTyping={isTyping}
                campaignId={currentCampaign?.id}
                userId={user?.id}
                isAIAssistant={true}
                assistantChat={assistantChat}
              />
            </div>
          )}
          {activeMode === CampaignMode.Review && (
            <div className="review-section">
              <h2>Campaign Review</h2>
              <div className="review-content">
                <NetworkView 
                  currentCampaign={currentCampaign}
                  entities={entities}
                />
                {selectedEntityForView && (
                  <div className="selected-entity-details">
                    <h3>{selectedEntityForView.name}</h3>
                    <p>{selectedEntityForView.description || 'No description available'}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Right panel - Voice Channels */}
        <aside className="right-panel">
          <h2>Voice Channels</h2>
          <div className="voice-channels">
            <div className="channel">
              <h3>Main</h3>
              <VoiceChat 
                campaignId={currentCampaign?.id || ''} 
                userId={user?.id || ''}
                channelName="main"
              />
            </div>
            <div className="channel">
              <h3>Whisper</h3>
              <VoiceChat 
                campaignId={currentCampaign?.id || ''} 
                userId={user?.id || ''}
                channelName="whisper"
              />
            </div>
          </div>
        </aside>
      </div>
      
      {/* Add the EntityTabsBar */}
      {currentCampaign && (
        <EntityTabsBar 
          campaignId={currentCampaign.id}
          onEntitySelect={handleEntitySelect}
          onExpand={(isExpanded) => setMainContentPadding(isExpanded)}
        />
      )}
    </div>
  );
};

export default CampaignView; 