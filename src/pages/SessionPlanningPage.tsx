import React, { useState } from 'react';
import SessionPlanningChat from '../components/SessionPlanningChat';

const SessionPlanningPage: React.FC = () => {
  // For demo purposes, we'll use hardcoded IDs
  // In a real app, these would come from the authenticated user and selected campaign
  const campaignId = 'demo-campaign-123';
  const userId = 'demo-user-456';
  
  return (
    <div className="session-planning-page">
      <SessionPlanningChat 
        campaignId={campaignId} 
        userId={userId} 
      />
    </div>
  );
};

export default SessionPlanningPage; 