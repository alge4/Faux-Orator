import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Routes, Route } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import './Home.css';

const CampaignDashboard: React.FC = () => {
  return (
    <div className="campaign-dashboard">
      <h1>Your Campaigns</h1>
      <p>Select a campaign from the sidebar or create a new one to get started.</p>
    </div>
  );
};

const CampaignDetail: React.FC = () => {
  // This will be expanded in the future to show campaign details
  return (
    <div className="campaign-detail">
      <h1>Campaign Details</h1>
      <p>This page will show the details of the selected campaign.</p>
    </div>
  );
};

const Home: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="home-container">
      <Sidebar />
      <div className="main-content">
        <div className="top-bar">
          <div className="user-info">
            <span>Welcome, {user?.name || 'User'}</span>
            <button onClick={logout} className="logout-btn">Sign Out</button>
          </div>
        </div>
        <div className="content-area">
          <Routes>
            <Route path="/" element={<CampaignDashboard />} />
            <Route path="/campaigns/:campaignId" element={<CampaignDetail />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default Home;
