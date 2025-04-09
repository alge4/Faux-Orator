import React from 'react';
import { CampaignMode, useCampaignStore2 } from '../hooks/useCampaign';
import { ChatInterface } from './ChatInterface';
import NetworkView from './NetworkView';
import DataView from './DataView';
import ModeSwitcher from './common/ModeSwitcher';
import VoiceChat from './VoiceChat';
import './CampaignWorkspace.css';

const CampaignWorkspace: React.FC = () => {
  const { campaignMode, currentCampaign, entities, pinEntity } = useCampaignStore2();
  
  const renderMainContent = () => {
    switch (campaignMode) {
      case CampaignMode.Planning:
        return <DataView />;
      case CampaignMode.Running:
        return <ChatInterface availableEntities={entities} onEntityClick={pinEntity} />;
      case CampaignMode.Review:
        return <NetworkView />;
      default:
        return <div className="no-mode-selected">Please select a mode</div>;
    }
  };
  
  if (!currentCampaign) {
    return (
      <div className="no-campaign-container">
        <h2>No Campaign Selected</h2>
        <p>Please select a campaign from the dashboard to get started.</p>
      </div>
    );
  }
  
  return (
    <div className="campaign-workspace">
      <div className="workspace-header">
        <h1 className="campaign-title">{currentCampaign.title}</h1>
        <ModeSwitcher />
      </div>
      
      <div className="workspace-content">
        <main className="main-content">
          {renderMainContent()}
        </main>
        
        <aside className="voice-sidebar">
          <VoiceChat />
        </aside>
      </div>
    </div>
  );
};

export default CampaignWorkspace; 