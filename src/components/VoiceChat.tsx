import React, { useEffect, useState } from 'react';
import AgoraService from '../services/AgoraService';
import './VoiceChat.css';

interface VoiceChatProps {
  campaignId?: string;
  userId?: string;
}

const VoiceChat: React.FC<VoiceChatProps> = ({ campaignId, userId }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set up event handlers
    AgoraService.onUserJoined((user) => {
      setParticipants(prev => [...prev, user.uid.toString()]);
    });

    AgoraService.onUserLeft((user) => {
      setParticipants(prev => prev.filter(id => id !== user.uid.toString()));
    });

    AgoraService.onConnectionStateChange((curState) => {
      setIsConnected(curState === 'CONNECTED');
    });

    // Clean up on unmount
    return () => {
      if (isConnected) {
        handleDisconnect();
      }
    };
  }, []);

  const handleConnect = async () => {
    try {
      setError(null);
      await AgoraService.join(userId);
      setIsConnected(true);
    } catch (err) {
      setError('Failed to connect to voice chat. Please check your microphone permissions.');
      console.error('Error connecting to voice chat:', err);
    }
  };

  const handleDisconnect = async () => {
    try {
      await AgoraService.leave();
      setIsConnected(false);
      setParticipants([]);
    } catch (err) {
      console.error('Error disconnecting from voice chat:', err);
    }
  };

  const handleToggleMute = async () => {
    try {
      const isMicEnabled = await AgoraService.toggleMic();
      setIsMuted(!isMicEnabled);
    } catch (err) {
      console.error('Error toggling microphone:', err);
    }
  };

  return (
    <div className="voice-chat">
      <div className="voice-chat-header">
        <h3>Voice Chat</h3>
        {error && <div className="voice-chat-error">{error}</div>}
      </div>

      <div className="voice-chat-controls">
        {!isConnected ? (
          <button 
            className="connect-btn"
            onClick={handleConnect}
          >
            Connect to Voice
          </button>
        ) : (
          <>
            <button 
              className={`mute-btn ${isMuted ? 'muted' : ''}`}
              onClick={handleToggleMute}
            >
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
            <button 
              className="disconnect-btn"
              onClick={handleDisconnect}
            >
              Disconnect
            </button>
          </>
        )}
      </div>

      {isConnected && (
        <div className="voice-chat-participants">
          <h4>Participants ({participants.length + 1})</h4>
          <ul>
            <li>You {isMuted && '(Muted)'}</li>
            {participants.map(id => (
              <li key={id}>User {id}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default VoiceChat; 