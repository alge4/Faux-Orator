import React, { useState } from 'react';
import './CreateCampaign.css';

interface CreateCampaignProps {
  onClose: () => void;
  onCreate: (name: string, description: string) => void;
}

const CreateCampaign: React.FC<CreateCampaignProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Campaign name is required');
      return;
    }
    
    if (!description.trim()) {
      setError('Campaign description is required');
      return;
    }
    
    onCreate(name, description);
  };
  
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Create New Campaign</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="campaign-name">Campaign Name</label>
            <input
              id="campaign-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter campaign name"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="campaign-description">Description</label>
            <textarea
              id="campaign-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter campaign description"
              rows={4}
            />
          </div>
          
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="create-btn">
              Create Campaign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCampaign; 