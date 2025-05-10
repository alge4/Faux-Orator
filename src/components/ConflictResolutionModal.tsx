import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { ConflictQueueItem, ResolutionStrategy } from '../types/versioning';
import { EntityType } from '../types/locking';
import './ConflictResolutionModal.css';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  conflictId?: string;
  campaignId: string;
  onClose: () => void;
  onResolve: (conflictId: string, valueIndex: number, strategy: ResolutionStrategy, notes?: string) => void;
}

const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  conflictId,
  campaignId,
  onClose,
  onResolve
}) => {
  const [conflict, setConflict] = useState<ConflictQueueItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedValueIndex, setSelectedValueIndex] = useState<number>(-1);
  const [resolutionStrategy, setResolutionStrategy] = useState<ResolutionStrategy>('dm_manual');
  const [notes, setNotes] = useState('');
  const [entityDetails, setEntityDetails] = useState<{ name?: string, type: EntityType } | null>(null);

  // Fetch conflict data when the modal opens or conflictId changes
  useEffect(() => {
    if (!isOpen || !conflictId) {
      return;
    }

    const fetchConflictData = async () => {
      try {
        setLoading(true);
        
        // Fetch the conflict details
        const { data: conflictData, error } = await supabase
          .from('conflict_resolution_queue')
          .select('*')
          .eq('id', conflictId)
          .single();
          
        if (error) {
          throw error;
        }
        
        setConflict(conflictData);
        
        // Fetch entity details
        if (conflictData?.entity_id && conflictData?.entity_type) {
          const tableName = getTableName(conflictData.entity_type as EntityType);
          
          const { data: entityData, error: entityError } = await supabase
            .from(tableName)
            .select('name')
            .eq('id', conflictData.entity_id)
            .single();
            
          if (!entityError && entityData) {
            setEntityDetails({
              name: entityData.name,
              type: conflictData.entity_type as EntityType
            });
          }
        }
      } catch (error) {
        console.error('Error fetching conflict data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConflictData();
  }, [isOpen, conflictId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedValueIndex(-1);
      setResolutionStrategy('dm_manual');
      setNotes('');
    }
  }, [isOpen]);

  // Handle resolving the conflict
  const handleResolve = () => {
    if (!conflict || selectedValueIndex === -1) {
      return;
    }
    
    onResolve(conflict.id, selectedValueIndex, resolutionStrategy, notes || undefined);
    onClose();
  };

  // Get a formatted representation of a value for display
  const getFormattedValue = (value: any, index: number): JSX.Element => {
    const valueStr = JSON.stringify(value, null, 2);
    const agent = conflict?.source_agents[index] || 'Unknown Agent';
    
    return (
      <div 
        className={`value-option ${selectedValueIndex === index ? 'selected' : ''}`}
        onClick={() => setSelectedValueIndex(index)}
      >
        <div className="value-header">
          <div className="agent-label">{agent}</div>
          <div className="selection-indicator">
            <input 
              type="radio" 
              name="selectedValue" 
              checked={selectedValueIndex === index}
              onChange={() => setSelectedValueIndex(index)}
              aria-label={`Select ${agent}'s value`}
            />
          </div>
        </div>
        <pre className="value-content">{valueStr}</pre>
      </div>
    );
  };

  // Get table name from entity type
  const getTableName = (entityType: EntityType): string => {
    const tableMap: Record<EntityType, string> = {
      npc: 'npcs',
      location: 'locations',
      item: 'items',
      faction: 'factions',
      story_arc: 'story_arcs'
    };
    
    return tableMap[entityType] || entityType;
  };

  // Format entity type for display
  const formatEntityType = (type: string): string => {
    return type.replace('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="conflict-resolution-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 id="modal-title">Resolve Conflict</h2>
          <button className="close-button" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>
        
        {loading ? (
          <div className="modal-loading">
            <span>Loading conflict details...</span>
          </div>
        ) : !conflict ? (
          <div className="modal-error">
            <p>Conflict not found or has already been resolved.</p>
            <button onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            <div className="conflict-details">
              <div className="entity-field-info">
                <h3>
                  {entityDetails?.name || 'Unknown Entity'} 
                  <span className="entity-type">
                    ({formatEntityType(conflict.entity_type)})
                  </span>
                </h3>
                <div className="field-name">
                  Field: <strong>{conflict.field}</strong>
                </div>
                <div className="conflict-priority">
                  Priority: <span className={`priority-${conflict.priority}`}>{conflict.priority}</span>
                </div>
              </div>
              
              <div className="conflict-description">
                <p>Multiple agents have suggested different values for this field. Please select which value to use.</p>
              </div>
            </div>
            
            <div className="value-options">
              {(conflict.proposed_values as any[]).map((value, index) => (
                <React.Fragment key={index}>
                  {getFormattedValue(value, index)}
                </React.Fragment>
              ))}
            </div>
            
            <div className="resolution-options">
              <div className="resolution-strategy">
                <label htmlFor="resolution-strategy">Resolution Strategy:</label>
                <select 
                  id="resolution-strategy"
                  value={resolutionStrategy}
                  onChange={(e) => setResolutionStrategy(e.target.value as ResolutionStrategy)}
                  aria-label="Resolution strategy"
                >
                  <option value="dm_manual">Manual Selection</option>
                  <option value="rule_applied">Apply Rule</option>
                  <option value="auto">Auto-Resolve</option>
                </select>
              </div>
              
              <div className="resolution-notes">
                <label htmlFor="resolution-notes">Notes (optional):</label>
                <textarea 
                  id="resolution-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this resolution..."
                  aria-label="Resolution notes"
                />
              </div>
            </div>
            
            <div className="modal-actions">
              <button className="cancel-button" onClick={onClose}>
                Cancel
              </button>
              <button 
                className="resolve-button" 
                onClick={handleResolve}
                disabled={selectedValueIndex === -1}
              >
                Resolve Conflict
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ConflictResolutionModal; 