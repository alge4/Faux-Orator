import React from 'react';
import './CampaignMenu.css';

interface CampaignMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete?: () => void;
}

const CampaignMenu: React.FC<CampaignMenuProps> = ({
  isOpen,
  onClose,
  onEdit,
  onDelete
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="menu-overlay" onClick={onClose} />
      <div className="campaign-menu">
        <button className="menu-item" onClick={onEdit}>
          <span className="menu-icon">✏️</span>
          Edit Campaign
        </button>
        {onDelete && (
          <button className="menu-item delete" onClick={onDelete}>
            <span className="menu-icon">🗑️</span>
            Delete Campaign
          </button>
        )}
      </div>
    </>
  );
};

export default CampaignMenu; 