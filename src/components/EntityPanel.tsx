import React, { useEffect, useState } from 'react';
import { supabase, withRetry, pingSupabase } from '../services/supabase';
import './EntityPanel.css';
import EntityForm from './EntityForm';
import DeleteConfirmation from './DeleteConfirmation';
import { FaPlus, FaPencilAlt, FaTrash, FaSync } from 'react-icons/fa';
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
  
  const tableName = getTableName(entityType);
  
  // Fetch entities when entity type or campaign ID changes
  useEffect(() => {
    fetchEntities();
  }, [entityType, campaignId]);
  
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
    
    try {
      // First check connectivity
      const pingResult = await pingSupabase();
      if (!pingResult.success) {
        throw new Error(`Connection issue: ${pingResult.error}`);
      }
      
      // Use withRetry for better error handling
      const { data, error } = await withRetry(() => 
        supabase
          .from(tableName)
          .select('*')
          .eq('campaign_id', campaignId)
      );
        
      if (error) throw error;
      
      setEntities(data || []);
    } catch (err) {
      console.error(`Error fetching ${entityType}:`, err);
      setError(`Unable to load ${entityType}s. Please check your connection and try again.`);
      
      // Use mock data if we have too many fetch failures
      if (err instanceof Error && (
        err.message.includes('Failed to fetch') || 
        err.message.includes('Connection issue') ||
        err.message.includes('timed out')
      )) {
        const mockData = getMockEntities(entityType);
        if (mockData && mockData.length > 0) {
          console.log(`Using mock data for ${entityType}s due to connection issues.`);
          setEntities(mockData);
          setError(null);
        } else {
          setTimeout(() => {
            console.log(`Retrying ${entityType} fetch...`);
            fetchEntities();
          }, 5000);
        }
      }
    } finally {
      setLoading(false);
    }
  }
  
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
      const { error } = await withRetry(() => 
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
      const { error } = await withRetry(() => 
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
      const { error } = await withRetry(() => 
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
  
  return (
    <div className="entity-panel">
      <div className="entity-panel-header">
        <h3>{getPanelTitle()}</h3>
        
        <div className="entity-panel-actions">
          <div className="search-container">
            <input
              type="text"
              placeholder={`Search ${getPanelTitle().toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
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
            Retry
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
        />
      )}
    </div>
  );
};

export default EntityPanel; 