import React, { useState } from 'react';
import EntityPanel from './EntityPanel';
import './EntityTabsBar.css';

// Icons
const NPCIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tab-icon">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const LocationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tab-icon">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const FactionIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tab-icon">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const ItemIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tab-icon">
    <polyline points="9 11 12 14 22 4"></polyline>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
  </svg>
);

const QuestIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tab-icon">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);

const EventIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tab-icon">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

type TabType = {
  id: string;
  label: string;
  type: string;
  icon: React.ReactNode;
};

// Define tabs
const TABS: TabType[] = [
  { id: 'npcs', label: 'NPCs', type: 'npc', icon: <NPCIcon /> },
  { id: 'locations', label: 'Locations', type: 'location', icon: <LocationIcon /> },
  { id: 'factions', label: 'Factions', type: 'faction', icon: <FactionIcon /> },
  { id: 'items', label: 'Items', type: 'item', icon: <ItemIcon /> },
  { id: 'quests', label: 'Quests', type: 'quest', icon: <QuestIcon /> },
  { id: 'events', label: 'Events', type: 'event', icon: <EventIcon /> },
];

// Interface for entity data
interface EntityData {
  id: string;
  name: string;
  description?: string;
  content?: Record<string, unknown>;
  [key: string]: unknown;
}

interface EntityTabsBarProps {
  onSelectTab?: (tabId: string) => void;
  allowSelection?: boolean;
  onExpand?: () => void;
  campaignId: string;
  onEntitySelect?: (entity: EntityData) => void;
}

const EntityTabsBar: React.FC<EntityTabsBarProps> = ({ 
  onSelectTab = () => {}, 
  allowSelection = true,
  onExpand = () => {},
  campaignId,
  onEntitySelect = () => {}
}) => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Handle tab click
  const handleTabClick = (index: number) => {
    if (allowSelection) {
      // If clicking on a different tab when expanded, switch tabs
      if (isExpanded && index !== activeTabIndex) {
        setActiveTabIndex(index);
        onSelectTab(TABS[index].id);
      } 
      // If clicking on the same tab when expanded, collapse
      else if (isExpanded && index === activeTabIndex) {
        setIsExpanded(false);
      } 
      // If not expanded, expand and set the tab
      else {
        setIsExpanded(true);
        setActiveTabIndex(index);
        onSelectTab(TABS[index].id);
        onExpand();
      }
    }
  };
  
  // Get the current tab's entity type
  const currentEntityType = TABS[activeTabIndex].type;
  
  return (
    <div className={`entity-tabs-bar ${isExpanded ? 'expanded' : ''}`}>
      <div className="tabs-container">
        <div className="tabs" role="tablist">
          {TABS.map((tab, index) => {
            // Create two separate button elements based on active state
            return activeTabIndex === index ? (
              <button
                key={tab.id}
                className="tab active"
                onClick={() => handleTabClick(index)}
                aria-selected="true"
                role="tab"
                id={`tab-${tab.id}`}
                aria-controls={`panel-${tab.id}`}
              >
                {tab.icon}
                <span className="tab-label">{tab.label}</span>
              </button>
            ) : (
              <button
                key={tab.id}
                className="tab"
                onClick={() => handleTabClick(index)}
                aria-selected="false"
                role="tab"
                id={`tab-${tab.id}`}
                aria-controls={`panel-${tab.id}`}
              >
                {tab.icon}
                <span className="tab-label">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Show EntityPanel when expanded */}
      {isExpanded && (
        <EntityPanel 
          entityType={currentEntityType}
          campaignId={campaignId}
          onSelect={onEntitySelect}
        />
      )}
    </div>
  );
};

export default EntityTabsBar;  