import React from 'react';
import { useParams } from 'react-router-dom';
import SessionPlanningChat from '../components/SessionPlanningChat';
import { useAuth } from '../hooks/useAuth';

// Inline styles
const styles = {
  page: {
    padding: '0',
    margin: '0',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    background: '#f7f9fc'
  },
  header: {
    background: '#fff',
    padding: '1.5rem 2rem',
    borderBottom: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  title: {
    margin: '0',
    fontSize: '1.75rem',
    fontWeight: '600',
    color: '#111827'
  },
  subtitle: {
    margin: '0.5rem 0 0',
    color: '#6b7280',
    fontSize: '1rem'
  }
};

const SessionPlanningPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  // Use the URL parameter for campaignId and user ID from auth
  const campaignId = id || 'demo-campaign-123';
  const userId = user?.id || 'demo-user-456';
  
  return (
    <div style={styles.page} className="session-planning-page">
      <header style={styles.header} className="session-planning-header">
        <h1 style={styles.title}>Session Planning</h1>
        <p style={styles.subtitle}>Design your next D&D session with detailed plans and ideas</p>
      </header>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <SessionPlanningChat 
          campaignId={campaignId} 
          userId={userId}
          compact={false} // Explicitly set to false for full-page view
        />
      </div>
    </div>
  );
};

export default SessionPlanningPage; 