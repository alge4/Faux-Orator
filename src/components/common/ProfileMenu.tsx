import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

// Simple default avatar SVG
const DefaultAvatar = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="20" fill="#E5E7EB" />
    <circle cx="20" cy="16" r="7" fill="#A3A3A3" />
    <ellipse cx="20" cy="30" rx="12" ry="7" fill="#A3A3A3" />
  </svg>
);

interface ProfileMenuProps {
  showName?: boolean; // If true, show display name, else show username/email
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({ showName = true }) => {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Try to get avatar and name from user metadata
  const avatarUrl = user?.user_metadata?.avatar_url || null;
  const displayName = user?.user_metadata?.name || user?.user_metadata?.display_name || user?.email || 'User';

  return (
    <div
      className="profile-menu-container"
      style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        onClick={() => navigate('/profile')}
        tabIndex={0}
        role="button"
        aria-label="User profile options"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="User avatar"
            style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #ddd' }}
          />
        ) : (
          <DefaultAvatar />
        )}
        <span style={{ fontSize: 12, color: '#333', marginTop: 4 }}>
          {showName ? displayName : user?.email}
        </span>
      </div>
      {open && (
        <div
          className="profile-menu-dropdown"
          style={{
            position: 'absolute',
            top: '110%',
            right: 0,
            background: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            borderRadius: 8,
            minWidth: 120,
            zIndex: 1000,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
          }}
        >
          <button
            onClick={signOut}
            style={{
              background: '#f87171',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              padding: '8px 12px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: 14,
              marginBottom: 4,
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileMenu; 