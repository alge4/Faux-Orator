import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCampaign } from '../hooks/useCampaign';
import './CampaignView.css';

// Add a style block to override the root styles
const rootOverrideStyles = `
  #root {
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    text-align: left !important;
    width: 100% !important;
    height: 100vh !important;
  }
`;

enum CampaignTab {
  Planning = 'Planning',
  Running = 'Running',
  Review = 'Review'
}

const CampaignView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { campaigns, setCurrentCampaign } = useCampaign();
  const [currentTab, setCurrentTab] = useState<CampaignTab>(CampaignTab.Planning);
  const [chatMessage, setChatMessage] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Array<{text: string, sender: string}>>([
    {text: 'Welcome to the campaign chat!', sender: 'system'},
    {text: 'You can use this to coordinate with your players.', sender: 'system'},
  ]);
  const [activeVoiceChannel, setActiveVoiceChannel] = useState<string>('Main');
  
  // Find the current campaign
  const campaign = campaigns.find(c => c.id === id);
  
  useEffect(() => {
    // Create and append style override to head when component mounts
    const style = document.createElement('style');
    style.innerHTML = rootOverrideStyles;
    document.head.appendChild(style);
    
    // Clean up function to remove style when component unmounts
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  useEffect(() => {
    if (campaign) {
      setCurrentCampaign(campaign);
      document.title = `${campaign.name} - Faux Orator`;
    }
  }, [campaign, setCurrentCampaign]);
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    
    setChatMessages([...chatMessages, {text: chatMessage, sender: 'you'}]);
    setChatMessage('');
    
    // Simulate an AI response
    setTimeout(() => {
      setChatMessages(prev => [
        ...prev, 
        {text: `Response to: ${chatMessage}`, sender: 'ai'}
      ]);
    }, 1000);
  };
  
  const handleTabChange = (tab: CampaignTab) => {
    setCurrentTab(tab);
  };
  
  const handleVoiceChannelSelect = (channel: string) => {
    setActiveVoiceChannel(channel);
    // Here you would connect to the appropriate Agora channel
  };
  
  if (!campaign) {
    return <div className="loading">Loading campaign...</div>;
  }
  
  return (
    <div className="campaign-view">
      <header className="campaign-header">
        <h1 className="campaign-title">{campaign.name}</h1>
        
        <div className="campaign-tabs">
          {Object.values(CampaignTab).map(tab => (
            <button
              key={tab}
              className={`tab-button ${currentTab === tab ? 'active' : ''}`}
              onClick={() => handleTabChange(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        
        <button className="menu-button" aria-label="Menu">
          <span className="menu-icon"></span>
        </button>
      </header>
      
      <div className="campaign-content">
        <aside className="campaign-sidebar">
          <h2>Campaigns</h2>
          <ul className="campaign-list">
            {campaigns.map(c => (
              <li 
                key={c.id} 
                className={c.id === campaign.id ? 'active' : ''}
              >
                <Link to={`/campaign/${c.id}`}>{c.name}</Link>
              </li>
            ))}
          </ul>
        </aside>
        
        <main className="campaign-main">
          <section className="network-section">
            <div className="section-header">
              <h2>Campaign Network</h2>
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search entities..."
              />
            </div>
            
            <div className="network-graph">
              {/* This would be replaced with a proper graph visualization library */}
              <div className="placeholder-graph">
                <div className="graph-node central">
                  <div className="node-inner"></div>
                  <div className="node-label">Campaign</div>
                </div>
                <div className="graph-node top-left">
                  <div className="node-inner"></div>
                  <div className="node-label">NPC</div>
                </div>
                <div className="graph-node top">
                  <div className="node-inner"></div>
                  <div className="node-label">Location</div>
                </div>
                <div className="graph-node top-right">
                  <div className="node-inner"></div>
                  <div className="node-label">Faction</div>
                </div>
                <div className="graph-node right">
                  <div className="node-inner"></div>
                  <div className="node-label">Quest</div>
                </div>
                <div className="graph-node bottom-right">
                  <div className="node-inner"></div>
                  <div className="node-label">Item</div>
                </div>
                <div className="graph-node bottom">
                  <div className="node-inner"></div>
                  <div className="node-label">Event</div>
                </div>
                <div className="graph-node bottom-left">
                  <div className="node-inner"></div>
                  <div className="node-label">Player</div>
                </div>
                <div className="graph-node left">
                  <div className="node-inner"></div>
                  <div className="node-label">Encounter</div>
                </div>
                <div className="graph-edge e1"></div>
                <div className="graph-edge e2"></div>
                <div className="graph-edge e3"></div>
                <div className="graph-edge e4"></div>
                <div className="graph-edge e5"></div>
                <div className="graph-edge e6"></div>
                <div className="graph-edge e7"></div>
              </div>
            </div>
          </section>
          
          <section className="chat-section">
            <div className="section-header">
              <h2>Chat</h2>
              <button className="refresh-button">Refresh</button>
            </div>
            
            <div className="chat-messages">
              {chatMessages.map((msg, index) => (
                <div key={index} className={`message ${msg.sender}`}>
                  <div className="message-content">{msg.text}</div>
                </div>
              ))}
            </div>
            
            <form className="chat-input" onSubmit={handleSendMessage}>
              <input 
                type="text" 
                placeholder="Type a message..." 
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
              />
              <button type="submit" disabled={!chatMessage.trim()}>Send</button>
            </form>
          </section>
        </main>
        
        <aside className="voice-sidebar">
          <h2>Voice Channels</h2>
          <ul className="voice-channels">
            {['Main', 'Whisper'].map(channel => (
              <li 
                key={channel} 
                className={channel === activeVoiceChannel ? 'active' : ''}
                onClick={() => handleVoiceChannelSelect(channel)}
              >
                {channel}
              </li>
            ))}
          </ul>
          
          <div className="connected-users">
            <h3>Connected Users</h3>
            <ul className="user-list">
              <li className="user">
                <div className="user-avatar"></div>
                <div className="user-name">You</div>
              </li>
              <li className="user">
                <div className="user-avatar"></div>
                <div className="user-name">AI Assistant</div>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CampaignView; 