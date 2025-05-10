import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useCampaign, CampaignMode, Entity } from '../hooks/useCampaign';
import { useAuth } from '../hooks/useAuth';
import { FaChevronLeft, FaChevronRight, FaChevronUp, FaChevronDown, FaMinusCircle, FaPlusCircle } from 'react-icons/fa';
import ChatInterface from '../components/ChatInterface/ChatInterface';
import NetworkView from '../components/NetworkView';
import DataView from '../components/DataView';
import VoiceChat from '../components/VoiceChat';
import CampaignMenu from '../components/CampaignMenu';
import SessionPlanningChat from '../components/SessionPlanningChat';
import { supabase } from '../services/supabase';
import chevronIcon from '../assets/icons/chevron.svg';
import { useAssistantChat } from '../hooks/useAssistantChat';
import './CampaignView.css';

interface CampaignFormData {
  name: string;
  description: string;
  setting: string;
  theme: string;
}

interface Panel {
  id: string;
  title: string;
  type: string;
  collapsed: boolean;
  minimized: boolean;
  flex: number;
  minSize?: number;
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
  const [sessionPlan, setSessionPlan] = useState<any>(null);
  
  // Panel state for different modes
  const [planningPanels, setPlanningPanels] = useState<Panel[]>([
    { id: 'worldGraph', title: 'World Graph', type: 'graph', collapsed: false, minimized: false, flex: 1, minSize: 300 },
    { id: 'dmAssistant', title: 'DM Assistant', type: 'assistant', collapsed: false, minimized: false, flex: 1, minSize: 200 }
  ]);
  
  const [runningPanels, setRunningPanels] = useState<Panel[]>([
    { id: 'sessionChat', title: 'Session Chat', type: 'chat', collapsed: false, minimized: false, flex: 3, minSize: 400 },
    { id: 'quickReference', title: 'Quick Reference', type: 'reference', collapsed: false, minimized: false, flex: 1, minSize: 200 }
  ]);
  
  const [reviewPanels, setReviewPanels] = useState<Panel[]>([
    { id: 'sessionReview', title: 'Session Review', type: 'review', collapsed: false, minimized: false, flex: 2, minSize: 300 },
    { id: 'dataView', title: 'Data View', type: 'data', collapsed: false, minimized: false, flex: 1, minSize: 200 }
  ]);
  
  // Refs for resizing
  const resizingRef = useRef<{
    active: boolean,
    index: number,
    startX: number,
    startSizes: number[]
  }>({
    active: false,
    index: -1,
    startX: 0,
    startSizes: []
  });

  // Get active panels based on mode
  const getActivePanels = () => {
    switch (activeMode) {
      case CampaignMode.Planning:
        return planningPanels;
      case CampaignMode.Running:
        return runningPanels;
      case CampaignMode.Review:
        return reviewPanels;
      default:
        return planningPanels;
    }
  };

  // Set panels based on mode
  const setActivePanels = (panels: Panel[]) => {
    switch (activeMode) {
      case CampaignMode.Planning:
        setPlanningPanels(panels);
        break;
      case CampaignMode.Running:
        setRunningPanels(panels);
        break;
      case CampaignMode.Review:
        setReviewPanels(panels);
        break;
    }
  };

  // Start panel resize
  const handleResizeStart = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    const panels = [...getActivePanels()];
    
    // Only allow resizing if there's a panel to the right
    if (index >= panels.length - 1) return;
    
    // Store the current sizes and mouse position
    resizingRef.current = {
      active: true,
      index,
      startX: e.clientX,
      startSizes: panels.map(p => p.flex)
    };
    
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };
  
  // Handle resize movement
  const handleResizeMove = (e: MouseEvent) => {
    if (!resizingRef.current?.active) return;
    
    const { index, startX, startSizes } = resizingRef.current;
    const deltaX = e.clientX - startX;
    const panels = [...getActivePanels()];
    
    // Calculate the total width of the container
    const containerWidth = panelContainerRef.current?.clientWidth || 1000;
    
    // Calculate how much one flex unit is worth in pixels
    const totalFlex = panels.reduce((sum, panel) => sum + panel.flex, 0);
    const flexUnit = containerWidth / totalFlex;
    
    // Calculate new flex values
    const newSizes = [...startSizes];
    const flexDelta = deltaX / flexUnit;
    
    // Apply size changes to current and next panel
    newSizes[index] = Math.max(0.1, startSizes[index] + flexDelta);
    newSizes[index + 1] = Math.max(0.1, startSizes[index + 1] - flexDelta);
    
    // Update panel sizes
    setPanels(prev => {
      const updated = [...prev];
      panels.forEach((panel, i) => {
        const panelIndex = updated.findIndex(p => p.id === panel.id);
        if (panelIndex !== -1) {
          updated[panelIndex] = {
            ...updated[panelIndex],
            flex: newSizes[i]
          };
        }
      });
      return updated;
    });
  };
  
  // End panel resize
  const handleResizeEnd = () => {
    if (resizingRef.current?.active) {
      resizingRef.current.active = false;
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    }
  };
  
  // Handle panel collapse toggle
  const togglePanelCollapse = (index: number) => {
    const panels = [...getActivePanels()];
    panels[index].collapsed = !panels[index].collapsed;
    setActivePanels(panels);
  };
  
  // Handle panel minimize toggle
  const togglePanelMinimize = (index: number) => {
    const panels = [...getActivePanels()];
    panels[index].minimized = !panels[index].minimized;
    setActivePanels(panels);
  };
  
  // Handle panel restore from minimized state
  const restoreMinimizedPanel = (id: string) => {
    const panels = [...getActivePanels()];
    const index = panels.findIndex(panel => panel.id === id);
    if (index !== -1) {
      panels[index].minimized = false;
      setActivePanels(panels);
    }
  };

  const {
    assistantChat,
    messages: assistantMessages,
    isLoading: isChatLoading,
    error: chatError,
    sendMessage,
    isTyping
  } = useAssistantChat(currentCampaign?.id || '', activeMode);

  // Handler for session plan updates from the session planning chat
  const handleSessionPlanUpdate = (plan: any) => {
    setSessionPlan(plan);
  };

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

  // Fetch campaigns from Supabase
  useEffect(() => {
    const fetchCampaigns = async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching campaigns:', error);
        return;
      }
      
      setCampaigns(data || []);
    };

    fetchCampaigns();
  }, []);

  // Fetch entities for current campaign
  useEffect(() => {
    const fetchEntities = async () => {
      if (!currentCampaign?.id) return;

      // Fetch all entity types in parallel
      const [npcs, locations, factions, items] = await Promise.all([
        supabase.from('npcs').select('*').eq('campaign_id', currentCampaign.id),
        supabase.from('locations').select('*').eq('campaign_id', currentCampaign.id),
        supabase.from('factions').select('*').eq('campaign_id', currentCampaign.id),
        supabase.from('items').select('*').eq('campaign_id', currentCampaign.id)
      ]);

      // Convert to Entity type
      const allEntities: Entity[] = [
        ...(npcs.data || []).map(npc => ({
          id: npc.id,
          name: npc.name,
          type: 'npc' as const,
          campaign_id: npc.campaign_id,
          content: { description: npc.description },
          locked: false,
          created_at: npc.created_at,
          updated_at: npc.updated_at
        })),
        ...(locations.data || []).map(loc => ({
          id: loc.id,
          name: loc.name,
          type: 'location' as const,
          campaign_id: loc.campaign_id,
          content: { description: loc.description },
          locked: false,
          created_at: loc.created_at,
          updated_at: loc.updated_at
        })),
        ...(factions.data || []).map(faction => ({
          id: faction.id,
          name: faction.name,
          type: 'faction' as const,
          campaign_id: faction.campaign_id,
          content: { description: faction.description },
          locked: false,
          created_at: faction.created_at,
          updated_at: faction.updated_at
        })),
        ...(items.data || []).map(item => ({
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

      setEntities(allEntities);
    };

    fetchEntities();
  }, [currentCampaign?.id]);

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

  const renderPanelContent = (panel: Panel) => {
    switch (panel.type) {
      case 'graph':
        return (
          <NetworkView 
            currentCampaign={currentCampaign}
            entities={entities}
          />
        );
      case 'assistant':
        return (
          <div className="assistant-container">
            <div className="assistant-tabs">
              <div className="tab active">Chat</div>
              <div className="tab">Session Planning</div>
              <div className="tab">NPCs</div>
              <div className="tab">Encounters</div>
            </div>
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
        );
      case 'chat':
        // Keeping this for backward compatibility
        return (
          <SessionPlanningChat
            campaignId={currentCampaign?.id || ''}
            userId={user?.id || ''}
            compact={true}
            onPlanUpdate={handleSessionPlanUpdate}
          />
        );
      case 'plan':
        // Keeping this for backward compatibility
        return (
          <div className="session-plan-output">
            {sessionPlan ? (
              <>
                <div className="plan-header">
                  <h3>{sessionPlan.title}</h3>
                  <div className="plan-summary">{sessionPlan.summary}</div>
                </div>
                
                <div className="plan-section">
                  <h4>Objectives</h4>
                  <ul className="objectives-list">
                    {sessionPlan.objectives && sessionPlan.objectives.map((objective: string, index: number) => (
                      <li key={index}>{objective}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="plan-section">
                  <h4>Story Beats</h4>
                  <div className="story-beats">
                    {sessionPlan.storyBeats && sessionPlan.storyBeats.map((beat: any) => (
                      <div key={beat.id} className={`story-beat ${beat.type}`}>
                        <div className="beat-type">{beat.type}</div>
                        <div className="beat-description">{beat.description}</div>
                        <div className="beat-duration">{beat.expectedDuration} min</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-plan">
                <p>No session plan created yet.</p>
                <p>Use the Session Planning panel to create a plan.</p>
              </div>
            )}
          </div>
        );
      case 'review':
        return (
          <ChatInterface 
            mode="review"
            messages={assistantMessages}
            onSendMessage={handleSendMessage}
            availableEntities={entities}
            isTyping={isTyping}
            campaignId={currentCampaign?.id}
            userId={user?.id}
            isAIAssistant={true}
            assistantChat={assistantChat}
          />
        );
      case 'data':
        return (
          <DataView entities={entities} />
        );
      case 'reference':
        return (
          <div className="quick-reference">
            <h3>Quick Reference</h3>
            <p>Reference content will go here</p>
          </div>
        );
      default:
        return <div>Panel content not implemented</div>;
    }
  };

  // Render the minimized panels bar
  const renderMinimizedBar = () => {
    const minimizedPanels = getActivePanels().filter(panel => panel.minimized);
    
    if (minimizedPanels.length === 0) return null;
    
    return (
      <div className="minimized-panels-bar">
        {minimizedPanels.map(panel => (
          <button 
            key={panel.id}
            className="minimized-panel-tab"
            onClick={() => restoreMinimizedPanel(panel.id)}
            title={`Restore ${panel.title}`}
          >
            <FaPlusCircle className="restore-icon" />
            <span>{panel.title}</span>
          </button>
        ))}
      </div>
    );
  };

  // Render the active panels
  const renderPanels = () => {
    const activePanels = getActivePanels();
    const visiblePanels = activePanels.filter(panel => !panel.minimized);
    
    if (visiblePanels.length === 0) {
      return (
        <div className="no-panels-message">
          <p>All panels are minimized. Restore panels from the bottom bar.</p>
        </div>
      );
    }
    
    return (
      <>
        <div className="panels-container">
          {visiblePanels.map((panel, index) => (
            <div
              key={panel.id}
              className={`panel-wrapper ${panel.collapsed ? 'collapsed' : ''}`}
              style={{ flex: panel.collapsed ? 'none' : panel.flex }}
            >
              <div className="panel-header">
                <h3>{panel.title}</h3>
                <div className="panel-controls">
                  <button
                    className="panel-control"
                    onClick={() => togglePanelCollapse(index)}
                    aria-label={panel.collapsed ? "Expand panel" : "Collapse panel"}
                  >
                    {panel.collapsed ? <FaChevronDown /> : <FaChevronUp />}
                  </button>
                  <button
                    className="panel-control"
                    onClick={() => togglePanelMinimize(index)}
                    aria-label="Minimize panel"
                  >
                    <FaMinusCircle />
                  </button>
                </div>
              </div>
              
              <div className="panel-content">
                {!panel.collapsed && renderPanelContent(panel)}
              </div>
              
              {/* Resizer between panels (except for the last one) */}
              {!panel.collapsed && index < visiblePanels.length - 1 && !visiblePanels[index + 1].collapsed && (
                <div 
                  className="panel-resizer"
                  onMouseDown={(e) => handleResizeStart(index, e)}
                ></div>
              )}
            </div>
          ))}
        </div>
        {renderMinimizedBar()}
      </>
    );
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="campaign-view">
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

        {/* Center panel - Main Content with resizable panels */}
        <main className="main-panel">
          {renderPanels()}
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
    </div>
  );
};

export default CampaignView; 