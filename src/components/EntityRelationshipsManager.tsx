import React, { useState, useEffect } from 'react';
import { 
  EntityRelationship, 
  EntityRelationshipDisplay,
  EntityType
} from '../types/entities';
import { 
  deleteEntityRelationship
} from '../services/supabase';
import EntityRelationshipForm from './EntityRelationshipForm';
import './EntityRelationshipsManager.css';
import {
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  Typography,
  Paper,
  Tooltip,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BidirectionalIcon from '@mui/icons-material/CompareArrows';
import DirectionalIcon from '@mui/icons-material/ArrowRightAlt';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

// Define proper entity option type
interface EntityOption {
  id: string;
  name: string;
  type: EntityType;
}

interface EntityRelationshipsManagerProps {
  campaignId: string;
  entities: EntityOption[]; // Using proper type instead of any[]
  relationships: EntityRelationshipDisplay[];
  isLoading?: boolean;
  error?: string | null;
  onRelationshipsChange?: () => void;
  selectedEntityId?: string;
}

const EntityRelationshipsManager: React.FC<EntityRelationshipsManagerProps> = ({
  campaignId,
  entities,
  relationships = [],
  isLoading = false,
  error = null,
  onRelationshipsChange,
  selectedEntityId
}) => {
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<EntityRelationship | null>(null);
  const [minimized, setMinimized] = useState(() => {
    const saved = localStorage.getItem('entityRelationshipsMinimized');
    return saved === 'true';
  });
  
  useEffect(() => {
    localStorage.setItem('entityRelationshipsMinimized', String(minimized));
    
    // Add class to parent world-graph container when minimized
    const parentContainer = document.querySelector('.relationship-manager-container')?.parentElement;
    if (parentContainer) {
      if (minimized) {
        parentContainer.classList.add('relationships-minimized');
      } else {
        parentContainer.classList.remove('relationships-minimized');
      }
    }
  }, [minimized]);
  
  useEffect(() => {
    console.log('EntityRelationshipsManager: entities count:', entities.length);
    console.log('EntityRelationshipsManager: relationships count:', relationships.length);
  }, [entities, relationships]);
  
  // Open create relationship form
  const handleCreateRelationship = () => {
    setSelectedRelationship(null);
    setShowForm(true);
  };
  
  // Open edit relationship form
  const handleEditRelationship = (relationship: EntityRelationshipDisplay) => {
    // Convert display relationship to full relationship format
    const fullRelationship: EntityRelationship = {
      id: relationship.id,
      campaign_id: campaignId,
      source_id: relationship.source.id,
      target_id: relationship.target.id,
      relationship_type: relationship.relationship_type,
      description: relationship.description,
      strength: relationship.strength,
      bidirectional: relationship.bidirectional,
      created_at: '', // These fields don't matter for the form
      updated_at: ''
    };
    
    setSelectedRelationship(fullRelationship);
    setShowForm(true);
  };
  
  // Confirm deletion
  const handleDeleteConfirm = (relationship: EntityRelationshipDisplay) => {
    setSelectedRelationship({
      id: relationship.id,
      campaign_id: campaignId,
      source_id: relationship.source.id,
      target_id: relationship.target.id,
      relationship_type: relationship.relationship_type,
      description: relationship.description,
      strength: relationship.strength,
      bidirectional: relationship.bidirectional,
      created_at: '',
      updated_at: ''
    });
    setShowDeleteConfirm(true);
  };
  
  // Delete relationship
  const handleDelete = async () => {
    if (!selectedRelationship) return;
    
    try {
      const result = await deleteEntityRelationship(selectedRelationship.id, campaignId);
      if (result.error) throw result.error;
      
      // Notify parent to refresh relationships
      if (onRelationshipsChange) {
        onRelationshipsChange();
      }
    } catch (err) {
      console.error('Error deleting relationship:', err);
    } finally {
      setShowDeleteConfirm(false);
      setSelectedRelationship(null);
    }
  };
  
  // Handle form save
  const handleSaveRelationship = (relationship: EntityRelationship) => {
    console.log('EntityRelationshipsManager: Relationship saved:', relationship);
    // Close the form
    setShowForm(false);
    
    // Notify parent to refresh relationships
    if (onRelationshipsChange) {
      console.log('EntityRelationshipsManager: Calling onRelationshipsChange callback');
      onRelationshipsChange();
    } else {
      console.warn('EntityRelationshipsManager: onRelationshipsChange callback is not provided');
    }
  };
  
  // Render strength indicators
  const renderStrength = (strength: number) => {
    return '●'.repeat(strength);
  };
  
  // Filter relationships if a specific entity is selected
  const filteredRelationships = selectedEntityId 
    ? relationships.filter(r => r.source.id === selectedEntityId || r.target.id === selectedEntityId)
    : relationships;
  
  return (
    <div className={`entity-relationships-manager ${minimized ? 'minimized' : ''}`}>
      <div className="relationships-header">
        <div className="header-left">
          <Typography variant="h6">
            {selectedEntityId ? 'Entity Relationships' : 'All Relationships'}
          </Typography>
          <Tooltip title={minimized ? "Expand" : "Minimize"}>
            <IconButton onClick={() => setMinimized(!minimized)} size="small">
              {minimized ? <ExpandMoreIcon /> : <ExpandLessIcon />}
            </IconButton>
          </Tooltip>
        </div>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateRelationship}
          disabled={!entities || entities.length < 2}
        >
          Add Relationship
        </Button>
      </div>
      
      {!minimized && (
        <>
          {isLoading ? (
            <div className="loading-container">
              <CircularProgress />
            </div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : !entities || entities.length < 2 ? (
            <div className="no-relationships">
              <Typography>
                You need at least two entities to create relationships.
                <br />
                Add more entities to your campaign first.
              </Typography>
            </div>
          ) : filteredRelationships.length === 0 ? (
            <div className="no-relationships">
              <Typography>
                {selectedEntityId 
                  ? 'No relationships for this entity. Create one to connect it to your world.'
                  : 'No relationships defined yet. Create your first relationship to start building your world graph.'}
              </Typography>
            </div>
          ) : (
            <List className="relationships-list">
              {filteredRelationships.map(relationship => (
                <Paper key={relationship.id} className="relationship-item" elevation={1}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <div className="relationship-title">
                          <span className={`entity-type-badge ${relationship.source.type}`}>
                            {relationship.source.type}
                          </span>
                          <span className="entity-name">{relationship.source.name}</span>
                          <span className="relationship-direction">
                            {relationship.bidirectional ? (
                              <BidirectionalIcon fontSize="small" />
                            ) : (
                              <DirectionalIcon fontSize="small" />
                            )}
                          </span>
                          <span className="entity-name">{relationship.target.name}</span>
                          <span className={`entity-type-badge ${relationship.target.type}`}>
                            {relationship.target.type}
                          </span>
                        </div>
                      }
                      secondary={
                        <div className="relationship-details">
                          <Typography variant="body2" color="textPrimary" className="relationship-type">
                            {relationship.relationship_type.replace(/_/g, ' ')}
                          </Typography>
                          {relationship.description && (
                            <Typography variant="body2" color="textSecondary" className="relationship-description">
                              {relationship.description}
                            </Typography>
                          )}
                          <div className="relationship-strength">
                            <Typography variant="caption" color="textSecondary">
                              Strength: <span className="strength-dots">{renderStrength(relationship.strength)}</span>
                            </Typography>
                          </div>
                        </div>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Edit relationship">
                        <IconButton
                          edge="end"
                          onClick={() => handleEditRelationship(relationship)}
                          size="small"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete relationship">
                        <IconButton
                          edge="end"
                          onClick={() => handleDeleteConfirm(relationship)}
                          size="small"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                </Paper>
              ))}
            </List>
          )}
        </>
      )}
      
      {/* Relationship Form Dialog */}
      <Dialog 
        open={showForm} 
        onClose={() => setShowForm(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          {showForm && (
            <EntityRelationshipForm
              campaignId={campaignId}
              entities={entities || []}
              relationship={selectedRelationship || undefined}
              onClose={() => setShowForm(false)}
              onSave={handleSaveRelationship}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
        <DialogTitle>Delete Relationship</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this relationship? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default EntityRelationshipsManager; 