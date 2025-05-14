import React, { useState, useEffect } from 'react';
import { 
  COMMON_RELATIONSHIP_TYPES, 
  EntityRelationshipInsert, 
  EntityRelationship,
  EntityType
} from '../types/entities';
import { createEntityRelationship, updateEntityRelationship } from '../services/supabase';
import './EntityRelationshipForm.css';
import { 
  Button, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  FormHelperText,
  Slider,
  FormControlLabel,
  Switch,
  Typography,
  SelectChangeEvent
} from '@mui/material';

interface EntityOption {
  id: string;
  name: string;
  type: EntityType;
}

interface EntityRelationshipFormProps {
  campaignId: string;
  entities: EntityOption[];
  relationship?: EntityRelationship;
  onClose: () => void;
  onSave: (relationship: EntityRelationship) => void;
}

const EntityRelationshipForm: React.FC<EntityRelationshipFormProps> = ({
  campaignId,
  entities,
  relationship,
  onClose,
  onSave
}) => {
  const isEditing = !!relationship;
  
  const [formData, setFormData] = useState<EntityRelationshipInsert>({
    campaign_id: campaignId,
    source_id: '',
    target_id: '',
    relationship_type: '',
    description: '',
    strength: 1,
    bidirectional: false
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customType, setCustomType] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Initialize form with relationship data if editing
  useEffect(() => {
    if (relationship) {
      console.log('Initializing form with relationship data:', relationship);
      setFormData({
        campaign_id: relationship.campaign_id,
        source_id: relationship.source_id,
        target_id: relationship.target_id,
        relationship_type: relationship.relationship_type,
        description: relationship.description || '',
        strength: relationship.strength,
        bidirectional: relationship.bidirectional
      });
      
      // Check if this is a custom relationship type
      if (!COMMON_RELATIONSHIP_TYPES.includes(relationship.relationship_type)) {
        setCustomType(true);
      }
    }
  }, [relationship]);

  // Log when campaign ID changes
  useEffect(() => {
    console.log('EntityRelationshipForm: Campaign ID set to:', campaignId);
  }, [campaignId]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error for this field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };
  
  const handleSelectChange = (e: SelectChangeEvent) => {
    const name = e.target.name as string;
    const value = e.target.value as string;
    
    console.log(`Select changed: ${name} = ${value}`);
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error for this field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };
  
  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    
    setFormData({
      ...formData,
      [name]: checked
    });
  };
  
  const handleStrengthChange = (_event: Event, newValue: number | number[]) => {
    setFormData({
      ...formData,
      strength: newValue as number
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    console.log('=== FORM SUBMISSION STARTED ===');
    console.log('Form submission event:', e);
    console.log('Current form data:', formData);
    console.log('Is editing mode:', isEditing);
    
    e.preventDefault();
    
    if (!formData.source_id || !formData.target_id || !formData.relationship_type) {
      console.error('Form validation failed - missing required fields');
      setFormError('Please complete all required fields');
      return;
    }
    
    if (formData.source_id === formData.target_id) {
      console.error('Source and target cannot be the same entity');
      setFormError('Source and target cannot be the same entity');
      return;
    }
    
    // Clear any previous errors
    setFormError(null);
    setIsSubmitting(true);
    
    try {
      console.log('Proceeding with database operation...');
      console.log('Using campaign_id:', formData.campaign_id);
      
      let result;
      
      if (isEditing && relationship) {
        // Update existing relationship
        console.log('Updating existing relationship with ID:', relationship.id);
        result = await updateEntityRelationship(relationship.id, formData);
      } else {
        // Create new relationship
        console.log('Creating new relationship with data:', formData);
        result = await createEntityRelationship(formData);
      }
      
      console.log('API response:', result);
      
      if (result.error) {
        console.error('Error from API:', result.error);
        
        // Check if it's a permissions error
        const errorMsg = typeof result.error === 'object' && result.error !== null
          ? (result.error as Error)?.message || 'Unknown error'
          : String(result.error);
          
        if (errorMsg.includes('permission') || errorMsg.includes('auth')) {
          throw new Error('You do not have permission to create this relationship. Please check your account access.');
        } else if (errorMsg.includes('duplicate')) {
          throw new Error('This relationship already exists between these entities.');
        } else {
          throw new Error(errorMsg);
        }
      }
      
      if (result.data) {
        console.log('Relationship saved successfully:', result.data);
        
        // Handle properly the single vs array result
        const relationshipData = Array.isArray(result.data) ? result.data[0] : result.data;
        
        if (!relationshipData || !relationshipData.id) {
          throw new Error('Invalid data returned from server');
        }
        
        onSave(relationshipData);
      } else {
        console.warn('No data returned from API but no error either. This is unusual.');
        throw new Error('No data returned from the server');
      }
    } catch (error) {
      console.error('Failed to save relationship:', error);
      setFormError(`Failed to save relationship: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsSubmitting(false);
    }
  };
  
  const handleTypeSelectChange = (e: SelectChangeEvent) => {
    const value = e.target.value as string;
    
    if (value === 'custom') {
      setCustomType(true);
      setFormData({
        ...formData,
        relationship_type: ''
      });
    } else {
      setCustomType(false);
      setFormData({
        ...formData,
        relationship_type: value
      });
    }
    
    // Clear error
    if (errors.relationship_type) {
      setErrors({
        ...errors,
        relationship_type: ''
      });
    }
  };
  
  // Group entities by type for better organization in dropdowns
  const entityGroups: Record<string, EntityOption[]> = entities.reduce((groups, entity) => {
    const type = entity.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(entity);
    return groups;
  }, {} as Record<string, EntityOption[]>);
  
  console.log('Available entities for relationships:', entities.length);
  
  return (
    <div className="entity-relationship-form">
      <h2>{isEditing ? 'Edit Relationship' : 'Create New Relationship'}</h2>
      
      <form onSubmit={handleSubmit}>
        <FormControl fullWidth margin="normal" error={!!errors.source_id}>
          <InputLabel id="source-entity-label">Source Entity</InputLabel>
          <Select
            labelId="source-entity-label"
            id="source_id"
            name="source_id"
            value={formData.source_id}
            onChange={handleSelectChange}
            disabled={isSubmitting || isEditing}
          >
            {Object.entries(entityGroups).map(([type, groupEntities]) => [
              <MenuItem key={`group-${type}`} disabled divider>
                {type.charAt(0).toUpperCase() + type.slice(1)}s
              </MenuItem>,
              ...groupEntities.map(entity => (
                <MenuItem key={entity.id} value={entity.id}>
                  {entity.name}
                </MenuItem>
              ))
            ])}
          </Select>
          {errors.source_id && <FormHelperText>{errors.source_id}</FormHelperText>}
        </FormControl>
        
        <FormControl fullWidth margin="normal" error={!!errors.relationship_type}>
          <InputLabel id="relationship-type-label">Relationship Type</InputLabel>
          <Select
            labelId="relationship-type-label"
            id="relationship-type-select"
            value={customType ? 'custom' : formData.relationship_type}
            onChange={handleTypeSelectChange}
            disabled={isSubmitting}
          >
            {COMMON_RELATIONSHIP_TYPES.map(type => (
              <MenuItem key={type} value={type}>
                {type.replace(/_/g, ' ')}
              </MenuItem>
            ))}
            <MenuItem value="custom">Custom...</MenuItem>
          </Select>
        </FormControl>
        
        {customType && (
          <TextField
            fullWidth
            margin="normal"
            label="Custom Relationship Type"
            name="relationship_type"
            value={formData.relationship_type}
            onChange={handleChange}
            error={!!errors.relationship_type}
            helperText={errors.relationship_type}
            disabled={isSubmitting}
          />
        )}
        
        <FormControl fullWidth margin="normal" error={!!errors.target_id}>
          <InputLabel id="target-entity-label">Target Entity</InputLabel>
          <Select
            labelId="target-entity-label"
            id="target_id"
            name="target_id"
            value={formData.target_id}
            onChange={handleSelectChange}
            disabled={isSubmitting || isEditing}
          >
            {Object.entries(entityGroups).map(([type, groupEntities]) => [
              <MenuItem key={`group-${type}`} disabled divider>
                {type.charAt(0).toUpperCase() + type.slice(1)}s
              </MenuItem>,
              ...groupEntities.map(entity => (
                <MenuItem key={entity.id} value={entity.id}>
                  {entity.name}
                </MenuItem>
              ))
            ])}
          </Select>
          {errors.target_id && <FormHelperText>{errors.target_id}</FormHelperText>}
        </FormControl>
        
        <TextField
          fullWidth
          margin="normal"
          label="Description (optional)"
          name="description"
          multiline
          rows={3}
          value={formData.description || ''}
          onChange={handleChange}
          disabled={isSubmitting}
        />
        
        <Typography gutterBottom>
          Relationship Strength
        </Typography>
        
        <Slider
          value={formData.strength}
          onChange={handleStrengthChange}
          step={1}
          marks
          min={1}
          max={5}
          valueLabelDisplay="auto"
          disabled={isSubmitting}
        />
        
        <FormControlLabel
          control={
            <Switch
              checked={formData.bidirectional}
              onChange={handleSwitchChange}
              name="bidirectional"
              color="primary"
              disabled={isSubmitting}
            />
          }
          label="Bidirectional relationship"
        />
        
        {formError && (
          <div className="error-message">
            {formError}
          </div>
        )}
        
        <div className="form-actions">
          <Button
            variant="contained"
            color="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EntityRelationshipForm; 