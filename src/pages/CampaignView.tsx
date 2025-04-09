import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCampaign, CampaignMode, Entity } from '../hooks/useCampaign';
import { useAuth } from '../hooks/useAuth';
import ChatInterface from '../components/ChatInterface/ChatInterface';
import NetworkView from '../components/NetworkView';
import DataView from '../components/DataView';
import VoiceChat from '../components/VoiceChat';
import { supabase } from '../services/supabase';
import './CampaignView.css';

const CampaignView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentCampaign, loading, error, setCurrentCampaign } = useCampaign();
  
  // State
  const [entities, setEntities] = useState<Entity[]>([]);
  const [activeMode, setActiveMode] = useState<CampaignMode>(CampaignMode.Planning);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

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
  const handleSendMessage = async (message: string) => {
    if (!currentCampaign?.id || !user?.id) return;

    const newMessage = {
      id: Date.now().toString(),
      content: message,
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
          content: message,
          mode: activeMode
        }]);
    } catch (error) {
      console.error('Error saving message:', error);
    }
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
            onClick={() => navigate('/dashboard')}
            className="back-button"
            aria-label="Back to dashboard"
          >
            ← Back to Dashboard
          </button>
          <h3>Campaign Assistant</h3>
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
        <button className="menu-button" aria-label="Menu">
          <span></span>
        </button>
      </div>

      {/* Main three-panel layout */}
      <div className="campaign-content">
        {/* Left panel - Campaign List */}
        <aside className="left-panel">
          <h2>Campaigns</h2>
          <div className="campaign-list">
            {campaigns.map(campaign => (
              <button
                key={campaign.id}
                className={`campaign-item ${currentCampaign?.id === campaign.id ? 'active' : ''}`}
                onClick={() => navigate(`/campaign/${campaign.id}`)}
              >
                {campaign.name}
              </button>
            ))}
          </div>
        </aside>

        {/* Center panel - Main Content */}
        <main className="main-panel">
          {activeMode === CampaignMode.Planning && (
            <div className="campaign-network">
              <h2>Campaign Network</h2>
              <NetworkView 
                currentCampaign={currentCampaign}
                entities={entities}
              />
            </div>
          )}
          {activeMode === CampaignMode.Running && (
            <div className="chat-section">
              <h2>Session Chat</h2>
              <ChatInterface 
                mode="running"
                messages={messages}
                onSendMessage={handleSendMessage}
                availableEntities={entities}
                isTyping={false}
                campaignId={currentCampaign?.id}
                userId={user?.id}
              />
            </div>
          )}
          {activeMode === CampaignMode.Review && (
            <div className="chat-section">
              <h2>Session Review</h2>
              <ChatInterface 
                mode="review"
                messages={messages}
                onSendMessage={handleSendMessage}
                availableEntities={entities}
                isTyping={false}
                campaignId={currentCampaign?.id}
                userId={user?.id}
              />
              <DataView entities={entities} />
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
    </div>
  );
};

export default CampaignView; 