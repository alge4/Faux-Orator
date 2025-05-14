import React, { useState } from 'react';
import { CampaignMode, useCampaignStore2 } from '../hooks/useCampaign';
import { ChatInterface } from './ChatInterface';
import NetworkView from './NetworkView';
import DataView from './DataView';
import ModeSwitcher from './common/ModeSwitcher';
import VoiceChat from './VoiceChat';
import EntityTabsBar from './EntityTabsBar';
import './CampaignWorkspace.css';

// Interface for entity data
interface EntityData {
  id: string;
  name: string;
  description?: string;
  content?: Record<string, unknown>;
  [key: string]: unknown;
}

const CampaignWorkspace: React.FC = () => {
  const { campaignMode, currentCampaign, entities, pinEntity } = useCampaignStore2();
  const [mainContentPadding, setMainContentPadding] = useState(false);
  const [selectedEntityForView, setSelectedEntityForView] = useState<EntityData | null>(null);
  
  const handleEntitySelect = (entity: EntityData) => {
    console.log('Selected entity:', entity);
    // Here you can handle pinning the entity or displaying its details
    if (entity && entity.id) {
      pinEntity(entity.id);
      setSelectedEntityForView(entity);
    }
  };
  
  const renderMainContent = () => {
    switch (campaignMode) {
      case CampaignMode.Planning:
        return <DataView />;
      case CampaignMode.Running:
        return <ChatInterface availableEntities={entities} onEntityClick={pinEntity} />;
      case CampaignMode.Review:
        // In Review mode, just show NetworkView to visualize entity relationships
        return (
          <div className="review-content">
            <NetworkView />
            {selectedEntityForView && (
              <div className="selected-entity-details">
                <h2>{selectedEntityForView.name}</h2>
                <p>{selectedEntityForView.description || 'No description available'}</p>
                {/* You can add more details from the selectedEntityForView here */}
              </div>
            )}
          </div>
        );
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
      
      <div className={`workspace-content ${mainContentPadding ? 'expanded-padding' : ''}`}>
        <main className="main-content">
          {renderMainContent()}
        </main>
        
        <aside className="voice-sidebar">
          <VoiceChat />
        </aside>
      </div>
      
      <EntityTabsBar 
        campaignId={currentCampaign.id}
        onEntitySelect={handleEntitySelect}
        onExpand={(isExpanded) => setMainContentPadding(isExpanded)}
      />
    </div>
  );
};

export default CampaignWorkspace; 