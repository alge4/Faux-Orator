import React, { useState } from 'react';
import { Entity } from '../hooks/useCampaign';
import './DataView.css';

type EntityTab = {
  id: string;
  label: string;
  type: string;
  icon: React.ReactNode;
};

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

// Define tabs
const TABS: EntityTab[] = [
  { id: 'npcs', label: 'NPCs', type: 'npc', icon: <NPCIcon /> },
  { id: 'locations', label: 'Locations', type: 'location', icon: <LocationIcon /> },
  { id: 'factions', label: 'Factions', type: 'faction', icon: <FactionIcon /> },
  { id: 'items', label: 'Items', type: 'item', icon: <ItemIcon /> },
  { id: 'quests', label: 'Quests', type: 'quest', icon: <QuestIcon /> },
  { id: 'events', label: 'Events', type: 'event', icon: <EventIcon /> },
];

interface DataViewProps {
  entities?: Entity[];
  onLockEntity?: (id: string, isLocked: boolean) => void;
}

const DataView: React.FC<DataViewProps> = ({ 
  entities = [],
  onLockEntity 
}) => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleEntities, setVisibleEntities] = useState<Entity[]>(entities);
  
  // Filter entities when tab or search changes
  const filterEntities = (type?: string, term?: string) => {
    let filtered = [...entities];
    
    if (type) {
      filtered = filtered.filter(e => e.type === type);
    }
    
    if (term) {
      const lowercaseTerm = term.toLowerCase();
      filtered = filtered.filter(e => 
        e.name.toLowerCase().includes(lowercaseTerm) || 
        (typeof e.content.description === 'string' && 
         e.content.description.toLowerCase().includes(lowercaseTerm))
      );
    }
    
    setVisibleEntities(filtered);
  };
  
  // Handle search input change
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    filterEntities(TABS[activeTabIndex].type, term);
  };
  
  // Handle tab change
  const handleTabChange = (index: number) => {
    setActiveTabIndex(index);
    filterEntities(TABS[index].type, searchTerm);
  };
  
  // Get current tab's entities
  const currentTabType = TABS[activeTabIndex].type;
  const filteredEntities = visibleEntities.filter(entity => entity.type === currentTabType);
  
  // Handle lock toggle - use callback if provided or console.log
  const handleLockToggle = (entityId: string, isLocked: boolean) => {
    if (onLockEntity) {
      onLockEntity(entityId, isLocked);
    } else {
      console.log(`Toggle lock for ${entityId} to ${!isLocked}`);
    }
  };
  
  return (
    <div className="data-view">
      <div className="data-view-header">
        <h2>Campaign Data</h2>
        
        <div className="search-container">
          <input
            type="text"
            placeholder="Search entities..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
          {searchTerm && (
            <button
              className="clear-search"
              onClick={() => {
                setSearchTerm('');
                filterEntities(currentTabType, '');
              }}
              aria-label="Clear search"
            >
              &times;
            </button>
          )}
        </div>
      </div>
      
      <div className="tabs-container">
        <div className="tabs" role="tablist">
          {TABS.map((tab, index) => {
            // Create two separate button elements based on active state
            return activeTabIndex === index ? (
              <button
                key={tab.id}
                className="tab active"
                onClick={() => handleTabChange(index)}
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
                onClick={() => handleTabChange(index)}
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
      
      <div className="data-table-container" 
           role="tabpanel" 
           id={`panel-${TABS[activeTabIndex].id}`}
           aria-labelledby={`tab-${TABS[activeTabIndex].id}`}>
        {filteredEntities.length === 0 ? (
          <div className="no-entities-message">
            <p>No {TABS[activeTabIndex].label.toLowerCase()} found</p>
            <button className="add-entity-button">
              Create {TABS[activeTabIndex].label.slice(0, -1)}
            </button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Description</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntities.map(entity => (
                <tr key={entity.id} className={entity.locked ? 'locked-row' : ''}>
                  <td>
                    <button
                      className={`lock-toggle ${entity.locked ? 'locked' : 'unlocked'}`}
                      onClick={() => handleLockToggle(entity.id, entity.locked)}
                      aria-label={entity.locked ? 'Unlock entity' : 'Lock entity'}
                      title={entity.locked ? 'Locked - AI cannot modify' : 'Unlocked - AI can suggest changes'}
                    >
                      {entity.locked ? '🔒' : '🔓'}
                    </button>
                  </td>
                  <td>{entity.name}</td>
                  <td>{typeof entity.content.description === 'string' ? 
                    entity.content.description.substring(0, 100) + (entity.content.description.length > 100 ? '...' : '') 
                    : 'No description'}
                  </td>
                  <td>{new Date(entity.updated_at).toLocaleString()}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="action-button edit" aria-label="Edit">
                        ✏️
                      </button>
                      <button className="action-button delete" aria-label="Delete">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DataView; 