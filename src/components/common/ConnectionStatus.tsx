import React, { useState, useEffect } from 'react';
import { getConnectionStatus, pingSupabase, retryOnlineMode } from '../../services/supabase';
import './ConnectionStatus.css';

interface ConnectionStatusProps {
  // Optional props could be added here
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = () => {
  const [expanded, setExpanded] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [status, setStatus] = useState({
    isOfflineMode: false,
    lastSuccessTimestamp: 0,
    failedRequestCount: 0,
    latency: 0
  });

  // Update connection status every 5 seconds
  useEffect(() => {
    const checkConnection = async () => {
      // Get the current connection state
      const connectionStatus = getConnectionStatus();
      setStatus(prev => ({
        ...prev,
        isOfflineMode: connectionStatus.isOfflineMode,
        failedRequestCount: connectionStatus.failedRequestCount,
        lastSuccessTimestamp: connectionStatus.lastSuccessTimestamp
      }));
    };

    // Initial check
    checkConnection();

    // Set up interval for checks
    const intervalId = setInterval(checkConnection, 5000);

    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, []);

  // Handle manual retry
  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const latencyStart = Date.now();
      await pingSupabase();
      const latencyEnd = Date.now();
      setStatus(prev => ({
        ...prev,
        latency: latencyEnd - latencyStart
      }));
      
      // Try to switch back to online mode
      await retryOnlineMode();
      
      // Update status after retry
      const connectionStatus = getConnectionStatus();
      setStatus(prev => ({
        ...prev,
        isOfflineMode: connectionStatus.isOfflineMode,
        failedRequestCount: connectionStatus.failedRequestCount,
        lastSuccessTimestamp: connectionStatus.lastSuccessTimestamp
      }));
    } catch (error) {
      console.error('Connection retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  // Determine status dot color
  const getStatusColor = () => {
    if (status.isOfflineMode) return '#ff5722'; // Orange-red for offline
    if (status.failedRequestCount > 3) return '#f44336'; // Red for high failure count
    if (status.failedRequestCount > 0) return '#ff9800'; // Orange for some failures
    return '#4caf50'; // Green for healthy connection
  };

  // Get status text
  const getStatusText = () => {
    if (status.isOfflineMode) return 'Offline Mode';
    if (status.failedRequestCount > 3) return 'Connection Issues';
    if (status.failedRequestCount > 0) return 'Some Errors';
    return 'Connected';
  };

  // Format relative time
  const getRelativeTime = (timestamp: number) => {
    if (!timestamp) return 'Never';
    
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    return `${Math.floor(seconds / 3600)} hours ago`;
  };

  return (
    <div className={`connection-status ${expanded ? 'expanded' : ''}`}>
      <div className="status-indicator" onClick={() => setExpanded(!expanded)}>
        <div 
          className="status-dot" 
          style={{ backgroundColor: getStatusColor() }}
        />
        <div className="status-text">{getStatusText()}</div>
        <div className="status-chevron">
          {expanded ? '▼' : '▲'}
        </div>
      </div>
      {expanded && (
        <div className="status-details">
          <div className="status-row">
            <div className="status-label">Status:</div>
            <div className="status-value">{getStatusText()}</div>
          </div>
          <div className="status-row">
            <div className="status-label">Offline Mode:</div>
            <div className="status-value">{status.isOfflineMode ? 'Active' : 'Inactive'}</div>
          </div>
          <div className="status-row">
            <div className="status-label">Failed Requests:</div>
            <div className="status-value">{status.failedRequestCount}</div>
          </div>
          <div className="status-row">
            <div className="status-label">Last Success:</div>
            <div className="status-value">{getRelativeTime(status.lastSuccessTimestamp)}</div>
          </div>
          {status.latency > 0 && (
            <div className="status-row">
              <div className="status-label">Latency:</div>
              <div className="status-value">{status.latency}ms</div>
            </div>
          )}
          <button 
            className="retry-button"
            onClick={handleRetry}
            disabled={isRetrying}
          >
            {isRetrying ? 'Retrying...' : 'Retry Connection'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus; 