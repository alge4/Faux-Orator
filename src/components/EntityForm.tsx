import React, { useState, useEffect } from 'react';
import { supabase, withRetry } from '../services/supabase';
import './EntityForm.css';

interface EntityFormProps {
  entityType: string;
  campaignId: string;
  entity?: any;
  onClose: () => void;
  onSave: (data?: any) => void;
  handleCreateEntitySubmit?: (data: any) => Promise<boolean>;
  handleUpdateEntitySubmit?: (id: string, data: any) => Promise<boolean>;
}

const EntityForm: React.FC<EntityFormProps> = ({
  entityType,
  campaignId,
  entity,
  onClose,
  onSave,
  handleCreateEntitySubmit,
  handleUpdateEntitySubmit
}) => {
  const isEditing = !!entity;
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ...getEntityTypeSpecificFields(entityType)
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize form with entity data if editing
  useEffect(() => {
    if (entity) {
      setFormData({
        name: entity.name || '',
        description: entity.description || '',
        ...getEntitySpecificValues(entity, entityType)
      });
    }
  }, [entity, entityType]);
  
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
  
  function getEntityTypeSpecificFields(type: string): Record<string, any> {
    switch (type) {
      case 'npc':
        return {
          personality: '',
          status: '',
          current_location: ''
        };
      case 'location':
        return {
          type: '',
          parent_location: null
        };
      case 'faction':
        return {
          type: '',
          current_status: '',
          goals: ''
        };
      case 'item':
        return {
          type: '',
          is_magical: false
        };
      default:
        return {};
    }
  }
  
  function getEntitySpecificValues(entity: any, type: string): Record<string, any> {
    switch (type) {
      case 'npc':
        return {
          personality: entity.personality || '',
          status: entity.status || '',
          current_location: entity.current_location || ''
        };
      case 'location':
        return {
          type: entity.type || '',
          parent_location: entity.parent_location || null
        };
      case 'faction':
        return {
          type: entity.type || '',
          current_status: entity.current_status || '',
          goals: entity.goals || ''
        };
      case 'item':
        return {
          type: entity.type || '',
          is_magical: entity.is_magical || false
        };
      default:
        return {};
    }
  }
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Handle checkbox inputs
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData({
        ...formData,
        [name]: checkbox.checked
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // If parent component provided custom handlers, use them
      if (isEditing && handleUpdateEntitySubmit && entity) {
        const success = await handleUpdateEntitySubmit(entity.id, formData);
        if (success) {
          onSave(formData);
          return;
        }
      } else if (!isEditing && handleCreateEntitySubmit) {
        const success = await handleCreateEntitySubmit(formData);
        if (success) {
          onSave(formData);
          return;
        }
      }
      
      // Default implementation using Supabase directly
      const tableName = getTableName(entityType);
      const dataToSave = {
        ...formData,
        campaign_id: campaignId,
        updated_at: new Date().toISOString()
      };
      
      if (isEditing) {
        // Update existing entity
        const { error } = await withRetry(() => 
          supabase
            .from(tableName)
            .update(dataToSave)
            .eq('id', entity.id)
        );
          
        if (error) throw error;
      } else {
        // Create new entity
        const { error } = await withRetry(() => 
          supabase
            .from(tableName)
            .insert({
              ...dataToSave,
              created_at: new Date().toISOString()
            })
        );
          
        if (error) throw error;
      }
      
      onSave(formData);
    } catch (err) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} ${entityType}:`, err);
      setError(`Failed to ${isEditing ? 'update' : 'create'} ${entityType}. Please try again.`);
      setIsSubmitting(false);
    }
  };
  
  const getFormTitle = () => {
    const action = isEditing ? 'Edit' : 'Create New';
    switch (entityType) {
      case 'npc':
        return `${action} NPC`;
      case 'location':
        return `${action} Location`;
      case 'faction':
        return `${action} Faction`;
      case 'item':
        return `${action} Item`;
      case 'quest':
        return `${action} Quest`;
      case 'event':
        return `${action} Event`;
      default:
        return `${action} Entity`;
    }
  };
  
  // Render entity-specific fields
  const renderEntitySpecificFields = () => {
    switch (entityType) {
      case 'npc':
        return (
          <>
            <div className="form-group">
              <label htmlFor="personality">Personality</label>
              <textarea
                id="personality"
                name="personality"
                value={formData.personality || ''}
                onChange={handleChange}
                placeholder="Describe the NPC's personality..."
                rows={3}
              />
            </div>
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <input
                type="text"
                id="status"
                name="status"
                value={formData.status || ''}
                onChange={handleChange}
                placeholder="Alive, Dead, Missing, etc."
              />
            </div>
            <div className="form-group">
              <label htmlFor="current_location">Current Location</label>
              <input
                type="text"
                id="current_location"
                name="current_location"
                value={formData.current_location || ''}
                onChange={handleChange}
                placeholder="Where is this NPC currently located?"
              />
            </div>
          </>
        );
      
      case 'location':
        return (
          <>
            <div className="form-group">
              <label htmlFor="type">Type</label>
              <input
                type="text"
                id="type"
                name="type"
                value={formData.type || ''}
                onChange={handleChange}
                placeholder="City, Dungeon, Forest, etc."
              />
            </div>
            {/* Parent location would ideally be a select dropdown populated with other locations */}
          </>
        );
      
      case 'faction':
        return (
          <>
            <div className="form-group">
              <label htmlFor="type">Type</label>
              <input
                type="text"
                id="type"
                name="type"
                value={formData.type || ''}
                onChange={handleChange}
                placeholder="Guild, Kingdom, Cult, etc."
              />
            </div>
            <div className="form-group">
              <label htmlFor="current_status">Current Status</label>
              <input
                type="text"
                id="current_status"
                name="current_status"
                value={formData.current_status || ''}
                onChange={handleChange}
                placeholder="Active, Disbanded, Growing, etc."
              />
            </div>
            <div className="form-group">
              <label htmlFor="goals">Goals</label>
              <textarea
                id="goals"
                name="goals"
                value={formData.goals || ''}
                onChange={handleChange}
                placeholder="What are this faction's goals?"
                rows={3}
              />
            </div>
          </>
        );
      
      case 'item':
        return (
          <>
            <div className="form-group">
              <label htmlFor="type">Type</label>
              <input
                type="text"
                id="type"
                name="type"
                value={formData.type || ''}
                onChange={handleChange}
                placeholder="Weapon, Armor, Quest Item, etc."
              />
            </div>
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="is_magical"
                  checked={formData.is_magical || false}
                  onChange={handleChange}
                />
                Magical Item
              </label>
            </div>
          </>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div className="entity-form-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="entity-form-container">
        <div className="entity-form-header">
          <h2>{getFormTitle()}</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        
        {error && <div className="form-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter name"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              placeholder="Enter description"
              rows={4}
            />
          </div>
          
          {renderEntitySpecificFields()}
          
          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-button" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="save-button" 
              disabled={isSubmitting || !formData.name.trim()}
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EntityForm; 