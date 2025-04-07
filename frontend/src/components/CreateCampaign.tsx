import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box
} from '@mui/material';

interface CreateCampaignProps {
  isOpen?: boolean;
  onClose: () => void;
  onSubmit?: (name: string, description: string) => void;
  onCreate?: (name: string, description: string) => void;
}

const CreateCampaign: React.FC<CreateCampaignProps> = ({ 
  isOpen = true, 
  onClose, 
  onSubmit, 
  onCreate 
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');

  const handleSubmit = () => {
    // Validate inputs
    if (!name.trim()) {
      setNameError('Campaign name is required');
      console.log("Campaign creation failed: Name is required");
      return;
    }
    
    console.log("Create campaign button clicked, submitting with name:", name, "description:", description);
    
    // Call either onSubmit or onCreate based on which was provided
    if (onSubmit) {
      console.log("Using onSubmit callback");
      onSubmit(name, description);
    } else if (onCreate) {
      console.log("Using onCreate callback");
      onCreate(name, description);
    } else {
      console.error("No submit handler provided to CreateCampaign component!");
    }
    
    // Reset form
    setName('');
    setDescription('');
    setNameError('');
  };

  const handleClose = () => {
    // Reset form on close
    setName('');
    setDescription('');
    setNameError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Campaign</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Campaign Name"
            fullWidth
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (e.target.value.trim()) {
                setNameError('');
              }
            }}
            error={!!nameError}
            helperText={nameError}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateCampaign; 