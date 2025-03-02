import React from 'react';
import CampaignList from './CampaignList';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Faux Orator</h3>
      </div>
      <div className="sidebar-content">
        <CampaignList />
      </div>
    </div>
  );
};

export default Sidebar;