import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CampaignItem.css';

interface Campaign {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  role: string;
}

interface CampaignItemProps {
  campaign: Campaign;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
}

const CampaignItem: React.FC<CampaignItemProps> = ({ campaign, onDelete, onRename }) => {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(campaign.name);
  
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  
  // Handle click outside to close context menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setShowContextMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Focus rename input when renaming starts
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);
  
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };
  
  const handleCampaignClick = () => {
    if (!isRenaming) {
      navigate(`/campaigns/${campaign.id}`);
    }
  };
  
  const handleRenameClick = () => {
    setIsRenaming(true);
    setShowContextMenu(false);
  };
  
  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim() && newName !== campaign.name) {
      onRename(campaign.id, newName);
    } else {
      setNewName(campaign.name); // Reset to original name if empty or unchanged
    }
    setIsRenaming(false);
  };
  
  const handleDeleteClick = () => {
    if (window.confirm(`Are you sure you want to delete "${campaign.name}"?`)) {
      onDelete(campaign.id);
    }
    setShowContextMenu(false);
  };
  
  return (
    <li 
      className="campaign-item"
      onContextMenu={handleContextMenu}
      onClick={handleCampaignClick}
    >
      {isRenaming ? (
        <form onSubmit={handleRenameSubmit}>
          <input
            ref={renameInputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRenameSubmit}
            onClick={(e) => e.stopPropagation()}
            className="rename-input"
          />
        </form>
      ) : (
        <>
          <span className="campaign-name">{campaign.name}</span>
          <span className="campaign-role">{campaign.role}</span>
        </>
      )}
      
      {showContextMenu && (
        <div 
          ref={contextMenuRef}
          className="context-menu"
          style={{ 
            position: 'fixed',
            top: contextMenuPosition.y,
            left: contextMenuPosition.x
          }}
        >
          <ul>
            <li onClick={handleRenameClick}>Rename</li>
            <li onClick={handleDeleteClick} className="delete">Delete</li>
          </ul>
        </div>
      )}
    </li>
  );
};

export default CampaignItem; 