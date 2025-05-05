import React, { useState, useEffect } from 'react';
import { getConnectionStatus, pingSupabase, retryOnlineMode, CircuitState } from '../../services/supabase';
import './ConnectionStatus.css';

interface ConnectionStatusProps {
  // Optional props could be added here
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = () => {
  const [expanded, setExpanded] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [status, setStatus] = useState({
    circuitState: CircuitState.CLOSED,
    isOfflineMode: false,
    consecutiveFailures: 0,
    lastSuccessTimestamp: 0,
    latency: 0
  });

  // Update connection status every 5 seconds
  useEffect(() => {
    const checkConnection = async () => {
      // Get the current connection state
      const connectionStatus = getConnectionStatus();
      setStatus(prev => ({
        ...prev,
        circuitState: connectionStatus.circuitState,
        isOfflineMode: connectionStatus.isOfflineMode,
        consecutiveFailures: connectionStatus.consecutiveFailures,
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
        circuitState: connectionStatus.circuitState,
        isOfflineMode: connectionStatus.isOfflineMode,
        consecutiveFailures: connectionStatus.consecutiveFailures,
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
    
    switch (status.circuitState) {
      case CircuitState.OPEN:
        return '#f44336'; // Red for open circuit
      case CircuitState.HALF_OPEN:
        return '#ff9800'; // Orange for half-open circuit
      case CircuitState.CLOSED:
        return '#4caf50'; // Green for closed circuit
      default:
        return '#9e9e9e'; // Grey for unknown
    }
  };

  // Get status text
  const getStatusText = () => {
    if (status.isOfflineMode) return 'Offline Mode';
    
    switch (status.circuitState) {
      case CircuitState.OPEN:
        return 'Connection Error';
      case CircuitState.HALF_OPEN:
        return 'Checking Connection';
      case CircuitState.CLOSED:
        return 'Connected';
      default:
        return 'Unknown';
    }
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
            <div className="status-label">Circuit:</div>
            <div className="status-value">{status.circuitState}</div>
          </div>
          <div className="status-row">
            <div className="status-label">Offline Mode:</div>
            <div className="status-value">{status.isOfflineMode ? 'Active' : 'Inactive'}</div>
          </div>
          <div className="status-row">
            <div className="status-label">Failures:</div>
            <div className="status-value">{status.consecutiveFailures}</div>
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