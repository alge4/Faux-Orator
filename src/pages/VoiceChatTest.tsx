import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import VoiceChat from '../components/VoiceChat';
import './VoiceChatTest.css';

const VoiceChatTest: React.FC = () => {
  const [userId, setUserId] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [showVoiceChat, setShowVoiceChat] = useState<boolean>(false);

  const handleStartChat = () => {
    // Generate a random user ID if not provided
    if (!userId) {
      setUserId(Math.floor(Math.random() * 1000000).toString());
    }
    setShowVoiceChat(true);
  };

  return (
    <div className="voice-chat-test">
      <div className="voice-chat-test-header">
        <h1>Voice Chat Test</h1>
        <p>
          This page allows you to test the Agora.io voice chat integration
          in a sandbox environment before using it in your game sessions.
        </p>
        <Link to="/dashboard" className="back-link">
          Back to Dashboard
        </Link>
      </div>

      {!showVoiceChat ? (
        <div className="voice-chat-test-form">
          <div className="form-group">
            <label htmlFor="userId">User ID (optional)</label>
            <input
              type="text"
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Leave blank for random ID"
            />
            <p className="help-text">
              This is used to identify you in the voice chat. You can leave it blank
              for a random ID.
            </p>
          </div>
          
          <div className="form-group">
            <label htmlFor="customName">Display Name (optional)</label>
            <input
              type="text"
              id="customName"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Enter your display name"
            />
          </div>

          <button 
            className="start-chat-btn"
            onClick={handleStartChat}
          >
            Start Voice Chat
          </button>
        </div>
      ) : (
        <div className="voice-chat-test-container">
          <div className="user-info">
            <p>
              <strong>Your ID:</strong> {userId}
              {customName && <span> ({customName})</span>}
            </p>
            <p className="help-text">
              To test with multiple users, open this page in multiple browsers or devices
              and connect to the same channel.
            </p>
            <button 
              className="reset-btn"
              onClick={() => setShowVoiceChat(false)}
            >
              Reset
            </button>
          </div>

          <VoiceChat userId={userId} />

          <div className="instructions">
            <h3>Instructions</h3>
            <ol>
              <li>Click "Connect to Voice" to join the voice channel</li>
              <li>Allow microphone access when prompted by your browser</li>
              <li>Speak to test your microphone</li>
              <li>Use the "Mute" button to toggle your microphone</li>
              <li>Other participants will appear in the list when they join</li>
              <li>Click "Disconnect" when you're done testing</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceChatTest; 