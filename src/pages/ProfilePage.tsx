import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // User metadata for display
  const displayName = user?.user_metadata?.name || user?.user_metadata?.display_name || 'User';
  const email = user?.email || 'No email available';
  
  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', padding: '0 1rem' }}>
      <button 
        onClick={() => navigate('/dashboard')}
        style={{ 
          background: 'none',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          color: '#4b5563',
          marginBottom: '1rem',
          padding: '0.5rem',
          borderRadius: '0.25rem',
        }}
      >
        ← Back to Dashboard
      </button>
      
      <div style={{ 
        backgroundColor: '#fff', 
        borderRadius: '0.75rem', 
        padding: '2rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        marginBottom: '2rem'
      }}>
        <h1 style={{ marginTop: 0, color: '#111827', fontSize: '1.875rem' }}>User Profile & Settings</h1>
        
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#374151', fontSize: '1.25rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Account Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ fontWeight: 500, color: '#4b5563' }}>Name:</div>
            <div>{displayName}</div>
            
            <div style={{ fontWeight: 500, color: '#4b5563' }}>Email:</div>
            <div>{email}</div>
            
            <div style={{ fontWeight: 500, color: '#4b5563' }}>Member Since:</div>
            <div>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}</div>
          </div>
        </div>
        
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#374151', fontSize: '1.25rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Subscription Management</h2>
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
            <p>Your current subscription plan: <strong>Free</strong></p>
            <button 
              style={{ 
                backgroundColor: '#7b3fef', 
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '0.25rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
              disabled={true}
            >
              Upgrade Plan
            </button>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', fontStyle: 'italic', marginTop: '0.5rem' }}>
              Subscription management is coming soon. Stay tuned for premium features!
            </p>
          </div>
        </div>
        
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#374151', fontSize: '1.25rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>User Preferences</h2>
          <div style={{ marginTop: '1rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#4b5563' }}>Display Name</label>
              <input 
                type="text" 
                value={displayName}
                disabled={true}
                aria-label="Display Name"
                style={{ 
                  width: '100%', 
                  padding: '0.5rem', 
                  borderRadius: '0.25rem',
                  border: '1px solid #d1d5db'
                }}
              />
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                Edit functionality coming soon.
              </p>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'not-allowed' }}>
                <input 
                  type="checkbox" 
                  disabled 
                  style={{ marginRight: '0.5rem' }} 
                  aria-label="Enable email notifications"
                />
                <span style={{ color: '#4b5563' }}>Enable email notifications</span>
              </label>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'not-allowed' }}>
                <input 
                  type="checkbox" 
                  disabled 
                  style={{ marginRight: '0.5rem' }} 
                  aria-label="Enable dark mode"
                />
                <span style={{ color: '#4b5563' }}>Dark mode (coming soon)</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 