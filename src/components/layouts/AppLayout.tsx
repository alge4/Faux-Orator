import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCampaign } from '../../hooks/useCampaign';
import './AppLayout.css';

// Icon components (simple SVG implementations)
const DashboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
    <rect x="3" y="3" width="7" height="9"></rect>
    <rect x="14" y="3" width="7" height="5"></rect>
    <rect x="14" y="12" width="7" height="9"></rect>
    <rect x="3" y="16" width="7" height="5"></rect>
  </svg>
);

const NPCIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const LocationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const FactionIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const ItemIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
    <polyline points="9 11 12 14 22 4"></polyline>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
  </svg>
);

const SessionIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);

const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { currentCampaign } = useCampaign();
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      {/* Mobile menu button */}
      <button 
        className="mobile-menu-button" 
        onClick={toggleSidebar}
        aria-label="Toggle menu"
      >
        <MenuIcon />
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1 className="app-title">Faux Orator</h1>
          <button 
            className="close-sidebar" 
            onClick={toggleSidebar}
            aria-label="Close menu"
          >
            &times;
          </button>
        </div>

        <div className="campaign-selector">
          <div className="current-campaign">
            {currentCampaign ? (
              <>
                <h2 className="campaign-name">{currentCampaign.name}</h2>
                <p className="campaign-setting">{currentCampaign.setting || 'No setting defined'}</p>
              </>
            ) : (
              <p className="no-campaign">No campaign selected</p>
            )}
          </div>
        </div>

        <nav className="main-nav">
          <ul>
            <li>
              <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setSidebarOpen(false)}>
                <DashboardIcon /> Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink to="/npcs" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setSidebarOpen(false)}>
                <NPCIcon /> NPCs
              </NavLink>
            </li>
            <li>
              <NavLink to="/locations" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setSidebarOpen(false)}>
                <LocationIcon /> Locations
              </NavLink>
            </li>
            <li>
              <NavLink to="/factions" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setSidebarOpen(false)}>
                <FactionIcon /> Factions
              </NavLink>
            </li>
            <li>
              <NavLink to="/items" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setSidebarOpen(false)}>
                <ItemIcon /> Items
              </NavLink>
            </li>
            <li>
              <NavLink to="/session-planner" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setSidebarOpen(false)}>
                <SessionIcon /> Session Planner
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            {user && (
              <div className="user-profile">
                <div className="avatar">
                  {user.user_metadata?.name?.charAt(0) || user.email?.charAt(0) || '?'}
                </div>
                <div className="user-details">
                  <p className="user-name">{user.user_metadata?.name || 'User'}</p>
                  <p className="user-email">{user.email}</p>
                </div>
              </div>
            )}
          </div>
          <button className="logout-button" onClick={handleSignOut}>
            <LogoutIcon /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}
    </div>
  );
};

export default AppLayout; 