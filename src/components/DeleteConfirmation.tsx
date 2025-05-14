import React, { useState } from 'react';
import { supabase, simpleRetry } from '../services/supabase';
import './DeleteConfirmation.css';
import { FaExclamationTriangle } from 'react-icons/fa';

interface DeleteConfirmationProps {
  entityType: string;
  entityName: string;
  entityId: string;
  onClose: () => void;
  onDelete: () => void;
  handleDeleteEntitySubmit?: (id: string) => Promise<boolean>;
  isOfflineMode?: boolean;
}

const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({
  entityType,
  entityName,
  entityId,
  onClose,
  onDelete,
  handleDeleteEntitySubmit,
  isOfflineMode = false
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState('');
  
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
      
      // Only use Supabase directly if we're not in offline mode
      if (!isOfflineMode) {
        // Default implementation using Supabase directly
        const tableName = getTableName(entityType);
        const { error } = await simpleRetry(() => 
          supabase
            .from(tableName)
            .delete()
            .eq('id', entityId)
        );
          
        if (error) throw error;
      } else {
        // We're in offline mode but don't have custom handlers
        throw new Error('Unable to delete in offline mode');
      }
      
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
          {isOfflineMode && (
            <div className="offline-badge" title="This will be deleted from your local data only until connection is restored">
              <FaExclamationTriangle /> Offline Mode
            </div>
          )}
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        
        <div className="delete-confirmation-content">
          <p>
            Are you sure you want to delete <strong>{entityName}</strong>?
          </p>
          <p className="delete-warning">
            This action cannot be undone.
          </p>
          <p className="delete-confirmation-string">
            Please type <strong>DELETE</strong> to confirm.
          </p>
          <input
            type="text"
            className="delete-confirmation-input"
            value={confirmation}
            onChange={e => setConfirmation(e.target.value)}
            placeholder="Type DELETE to confirm"
            disabled={isDeleting}
            autoFocus
          />
          {confirmation && confirmation !== 'DELETE' && (
            <div className="delete-error">You must type DELETE to confirm.</div>
          )}
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
            disabled={isDeleting || confirmation !== 'DELETE'}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmation; 