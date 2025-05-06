import React, { useEffect, useState } from 'react';
import { 
  supabase, 
  simpleRetry, 
  pingSupabase, 
  shouldUseOfflineMode, 
  retryOnlineMode,
  fetchAllEntitiesForCampaign,
  clearCache
} from '../services/supabase';
import './EntityPanel.css';
import EntityForm from './EntityForm';
import DeleteConfirmation from './DeleteConfirmation';
import { FaPlus, FaPencilAlt, FaTrash, FaSync, FaWifi, FaExclamationTriangle } from 'react-icons/fa';
import { getMockEntities, createMockEntity, updateMockEntity, deleteMockEntity } from '../data/mockEntities';

interface EntityData {
  id: string;
  name: string;
  description?: string;
  content?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  campaign_id?: string;
  [key: string]: unknown;
}

interface EntityPanelProps {
  entityType: string;
  campaignId: string;
  onSelect?: (entity: EntityData) => void;
}

// Track loading states globally to prevent duplicate requests
const loadingStates: {[key: string]: boolean} = {};

const EntityPanel: React.FC<EntityPanelProps> = ({ 
  entityType, 
  campaignId,
  onSelect = () => {}
}) => {
  const [entities, setEntities] = useState<EntityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<EntityData | null>(null);
  const [selectedAction, setSelectedAction] = useState<'edit' | 'delete' | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  
  const tableName = getTableName(entityType);
  const loadingKey = `${entityType}_${campaignId}`;
  
  // Fetch entities when entity type or campaign ID changes
  useEffect(() => {
    // If already loading this entity type for this campaign, don't duplicate the request
    if (loadingStates[loadingKey]) return;
    
    fetchEntities();
    
    // Cleanup function
    return () => {
      loadingStates[loadingKey] = false;
    };
  }, [entityType, campaignId, loadingKey]);
  
  // Get the appropriate table name based on entity type
  function getTableName(type: string): string {
    switch (type) {
      case 'npc':
        return 'npcs';
      case 'location':
        return 'locations';
      case 'faction':
        return 'factions';
      case 'item':
        return 'items';
      case 'quest':
        return 'quests';
      case 'event':
        return 'events';
      default:
        return 'npcs';
    }
  }
  
  // Fetch entities from Supabase
  async function fetchEntities() {
    setLoading(true);
    setError(null);
    loadingStates[loadingKey] = true;
    
    try {
      // Check if we're in offline mode
      const isOffline = shouldUseOfflineMode();
      setIsOfflineMode(isOffline);
      
      // Use the batch loading function to get all entities at once
      const allEntities = await fetchAllEntitiesForCampaign(campaignId);
      
      // Extract the correct entity type from the result
      switch(entityType) {
        case 'npc':
          setEntities(allEntities.npcs);
          break;
        case 'location':
          setEntities(allEntities.locations);
          break;
        case 'faction':
          setEntities(allEntities.factions);
          break;
        case 'item':
          setEntities(allEntities.items);
          break;
        case 'quest':
        case 'event':
          // For these entity types, we'll need to add specific handling
          // or use mock data for now
          setEntities(getMockEntities(entityType));
          break;
        default:
          setEntities([]);
      }
    } catch (err) {
      console.error(`Error fetching ${entityType}:`, err);
      setError(`Unable to load ${entityType}s. Please check your connection and try again.`);
      
      // Use mock data as fallback
      const mockData = getMockEntities(entityType);
      if (mockData && mockData.length > 0) {
        console.log(`Using mock data for ${entityType}s as fallback.`);
        setEntities(mockData);
        setError(null);
        setIsOfflineMode(true);
      }
    } finally {
      setLoading(false);
      loadingStates[loadingKey] = false;
    }
  }

  // Force reconnect to Supabase
  const handleReconnect = async () => {
    setLoading(true);
    retryOnlineMode(); // Reset the offline mode flag
    clearCache(); // Clear all cache to force fresh data
    await fetchEntities(); // Try to fetch again
  };
  
  // Filter entities based on search term
  const filteredEntities = entities.filter(entity => 
    entity.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    entity.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Get title for the panel based on entity type
  const getPanelTitle = () => {
    switch (entityType) {
      case 'npc':
        return 'NPCs';
      case 'location':
        return 'Locations';
      case 'faction':
        return 'Factions';
      case 'item':
        return 'Items';
      case 'quest':
        return 'Quests';
      case 'event':
        return 'Events';
      default:
        return 'Entities';
    }
  };
  
  // Handle entity selection
  const handleEntityClick = (entity: EntityData) => {
    onSelect(entity);
  };
  
  // Open create entity form
  const handleCreateEntity = () => {
    setSelectedEntity(null);
    setShowForm(true);
  };
  
  // Open edit entity form
  const handleEditEntity = (e: React.MouseEvent, entity: EntityData) => {
    e.stopPropagation(); // Prevent triggering the parent onClick
    setSelectedEntity(entity);
    setSelectedAction('edit');
    setShowForm(true);
  };
  
  // Open delete confirmation
  const handleDeleteEntity = (e: React.MouseEvent, entity: EntityData) => {
    e.stopPropagation(); // Prevent triggering the parent onClick
    setSelectedEntity(entity);
    setSelectedAction('delete');
    setShowDeleteConfirmation(true);
  };
  
  // Handle entity creation
  const handleCreateEntitySubmit = async (entityData: any) => {
    try {
      if (isOfflineMode) {
        // If offline, use mock creation directly
        const mockEntity = createMockEntity(entityType, {
          ...entityData,
          campaign_id: campaignId
        });
        setEntities(prev => [...prev, mockEntity]);
        return true;
      }
      
      const { error } = await simpleRetry(() => 
        supabase
          .from(tableName)
          .insert({
            ...entityData,
            campaign_id: campaignId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
      );
      
      if (error) {
        // If Supabase fails, use mock functionality
        const mockEntity = createMockEntity(entityType, {
          ...entityData,
          campaign_id: campaignId
        });
        setEntities(prev => [...prev, mockEntity]);
        return true;
      }
      
      // Clear cache for this entity type and campaign
      clearCache(tableName, campaignId);
      clearCache('all_entities', campaignId);
      
      // Refresh the entities list
      fetchEntities();
      return true;
    } catch (err) {
      console.error(`Error creating ${entityType}:`, err);
      return false;
    }
  };
  
  // Handle entity update
  const handleUpdateEntitySubmit = async (id: string, entityData: any) => {
    try {
      if (isOfflineMode) {
        // If offline, use mock update directly
        const updatedEntity = updateMockEntity(entityType, id, entityData);
        if (updatedEntity) {
          setEntities(prev => prev.map(entity => 
            entity.id === id ? updatedEntity : entity
          ));
        }
        return true;
      }
      
      const { error } = await simpleRetry(() => 
        supabase
          .from(tableName)
          .update({
            ...entityData,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
      );
      
      if (error) {
        // If Supabase fails, use mock functionality
        const updatedEntity = updateMockEntity(entityType, id, entityData);
        if (updatedEntity) {
          setEntities(prev => prev.map(entity => 
            entity.id === id ? updatedEntity : entity
          ));
        }
        return true;
      }
      
      // Refresh the entities list
      fetchEntities();
      return true;
    } catch (err) {
      console.error(`Error updating ${entityType}:`, err);
      return false;
    }
  };
  
  // Handle entity deletion
  const handleDeleteEntitySubmit = async (id: string) => {
    try {
      if (isOfflineMode) {
        // If offline, use mock deletion directly
        deleteMockEntity(entityType, id);
        setEntities(prev => prev.filter(entity => entity.id !== id));
        return true;
      }
      
      const { error } = await simpleRetry(() => 
        supabase
          .from(tableName)
          .delete()
          .eq('id', id)
      );
      
      if (error) {
        // If Supabase fails, use mock functionality
        deleteMockEntity(entityType, id);
        setEntities(prev => prev.filter(entity => entity.id !== id));
        return true;
      }
      
      // Clear cache for this entity type and campaign
      clearCache(tableName, campaignId);
      clearCache('all_entities', campaignId);
      
      // Refresh the entities list
      fetchEntities();
      return true;
    } catch (err) {
      console.error(`Error deleting ${entityType}:`, err);
      return false;
    }
  };
  
  // Close form and refresh entities
  const handleFormSave = () => {
    setShowForm(false);
    fetchEntities();
  };
  
  // Close delete confirmation and refresh entities
  const handleDeleteConfirm = () => {
    setShowDeleteConfirmation(false);
    fetchEntities();
  };
  
  // In the component, add a function to determine if searching is active
  const isSearchActive = searchTerm.length > 0;
  
  return (
    <div className="entity-panel" 
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Floating toolbar with search and create button */}
      <div className={`entity-panel-floating-toolbar ${isSearchActive || isHovering ? 'is-searching' : ''}`}>
        <div className="floating-toolbar-inner">
          {isOfflineMode ? (
            <button 
              onClick={handleReconnect}
              className="offline-indicator"
              title="You are working offline. Click to try reconnecting."
            >
              <FaExclamationTriangle /> Offline
            </button>
          ) : (
            <span className="online-indicator" title="Connected to database">
              <FaWifi /> Online
            </span>
          )}
          
          <div className="search-container">
            <input
              type="text"
              placeholder={`Search ${getPanelTitle().toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              onFocus={(e) => e.currentTarget.parentElement?.parentElement?.parentElement?.classList.add('is-searching')}
              onBlur={(e) => !searchTerm && e.currentTarget.parentElement?.parentElement?.parentElement?.classList.remove('is-searching')}
            />
            {searchTerm && (
              <button
                className="clear-search"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
          </div>
          
          <button
            className="create-button"
            onClick={handleCreateEntity}
            aria-label={`Create new ${entityType}`}
            title={`Create new ${entityType}`}
          >
            <FaPlus />
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="loading-state">Loading {getPanelTitle()}...</div>
      ) : error ? (
        <div className="error-state">
          <p>{error}</p>
          <button onClick={fetchEntities} className="retry-button">
            <FaSync /> Retry
          </button>
        </div>
      ) : filteredEntities.length === 0 ? (
        <div className="empty-state">
          <p>No {getPanelTitle().toLowerCase()} found{searchTerm ? ' matching your search' : ''}.</p>
          <button 
            className="create-entity-button"
            onClick={handleCreateEntity}
          >
            Create New {entityType === 'npc' ? 'NPC' : getPanelTitle().slice(0, -1)}
          </button>
        </div>
      ) : (
        <div className="entity-list">
          {filteredEntities.map(entity => (
            <div 
              key={entity.id} 
              className="entity-card"
              onClick={() => handleEntityClick(entity)}
            >
              <div className="entity-content">
                <div className="entity-name">{entity.name}</div>
                <div className="entity-description">
                  {entity.description || 'No description available'}
                </div>
              </div>
              <div className="entity-actions">
                <button 
                  className="edit-button" 
                  onClick={(e) => handleEditEntity(e, entity)}
                  aria-label="Edit"
                  title="Edit"
                >
                  <FaPencilAlt />
                </button>
                <button 
                  className="delete-button" 
                  onClick={(e) => handleDeleteEntity(e, entity)}
                  aria-label="Delete"
                  title="Delete"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Entity Form Modal */}
      {showForm && (
        <EntityForm
          entityType={entityType}
          campaignId={campaignId}
          entity={selectedEntity}
          onClose={() => setShowForm(false)}
          onSave={handleFormSave}
          handleCreateEntitySubmit={handleCreateEntitySubmit}
          handleUpdateEntitySubmit={handleUpdateEntitySubmit}
          isOfflineMode={isOfflineMode}
        />
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && selectedEntity && (
        <DeleteConfirmation
          entityType={entityType}
          entityName={selectedEntity.name}
          entityId={selectedEntity.id}
          onClose={() => setShowDeleteConfirmation(false)}
          onDelete={handleDeleteConfirm}
          handleDeleteEntitySubmit={handleDeleteEntitySubmit}
          isOfflineMode={isOfflineMode}
        />
      )}
    </div>
  );
};

export default EntityPanel; 