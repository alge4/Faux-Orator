import React from 'react';
import { Link } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../config/authConfig';
import '../styles/Home.css'; // You'll need to create this CSS file

const Home = () => {
  const { instance, accounts } = useMsal();
  const isAuthenticated = accounts.length > 0;

  const handleLogin = async () => {
    try {
      await instance.loginRedirect(loginRequest);
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="logo">Faux Orator</div>
        <nav>
          {isAuthenticated ? (
            <Link to="/dashboard" className="nav-button">Dashboard</Link>
          ) : (
            <button onClick={handleLogin} className="nav-button">Login</button>
          )}
        </nav>
      </header>

      <main className="home-main">
        <section className="hero">
          <h1>Welcome to Faux Orator</h1>
          <p className="subtitle">Your AI-powered D&D campaign assistant</p>
          {isAuthenticated ? (
            <Link to="/dashboard" className="cta-button">Go to Dashboard</Link>
          ) : (
            <button onClick={handleLogin} className="cta-button">Get Started</button>
          )}
        </section>

        <section className="features">
          <h2>Features</h2>
          <div className="feature-grid">
            <div className="feature-card">
              <h3>Campaign Management</h3>
              <p>Create and manage your D&D campaigns with ease.</p>
            </div>
            <div className="feature-card">
              <h3>AI-Powered NPCs</h3>
              <p>Generate realistic NPCs with unique personalities and voices.</p>
            </div>
            <div className="feature-card">
              <h3>Voice Channels</h3>
              <p>Communicate with your players through integrated voice channels.</p>
            </div>
            <div className="feature-card">
              <h3>Story Generation</h3>
              <p>Get AI assistance for creating compelling storylines and quests.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <p>&copy; 2025 Faux Orator. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Home; 