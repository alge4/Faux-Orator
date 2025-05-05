import React, { useState } from 'react';
import { supabase, withRetry } from '../services/supabase';
import './DeleteConfirmation.css';

interface DeleteConfirmationProps {
  entityType: string;
  entityName: string;
  entityId: string;
  onClose: () => void;
  onDelete: () => void;
  handleDeleteEntitySubmit?: (id: string) => Promise<boolean>;
}

const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({
  entityType,
  entityName,
  entityId,
  onClose,
  onDelete,
  handleDeleteEntitySubmit
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
  
  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    
    try {
      // If parent component provided a custom handler, use it
      if (handleDeleteEntitySubmit) {
        const success = await handleDeleteEntitySubmit(entityId);
        if (success) {
          onDelete();
          return;
        }
      }
      
      // Default implementation using Supabase directly
      const tableName = getTableName(entityType);
      const { error } = await withRetry(() => 
        supabase
          .from(tableName)
          .delete()
          .eq('id', entityId)
      );
        
      if (error) throw error;
      
      onDelete();
    } catch (err) {
      console.error(`Error deleting ${entityType}:`, err);
      setError(`Failed to delete ${entityType}. Please try again.`);
      setIsDeleting(false);
    }
  };
  
  return (
    <div className="delete-confirmation-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="delete-confirmation-container">
        <div className="delete-confirmation-header">
          <h2>Delete {entityType === 'npc' ? 'NPC' : entityType}</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        
        <div className="delete-confirmation-content">
          <p>
            Are you sure you want to delete <strong>{entityName}</strong>?
          </p>
          <p className="delete-warning">
            This action cannot be undone.
          </p>
          
          {error && <div className="delete-error">{error}</div>}
        </div>
        
        <div className="delete-confirmation-actions">
          <button 
            className="cancel-button" 
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button 
            className="delete-button" 
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmation; 