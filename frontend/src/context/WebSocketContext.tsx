import React, { createContext, useContext, useRef, useMemo, ReactNode, useEffect } from 'react';
import { useWebSocket } from '../utils/websocket';

interface WebSocketContextType {
  isConnected: boolean;
  messages: any[];
  error: Error | null;
  sendMessage: (data: any) => boolean;
  disconnect: () => void;
  reconnect: () => void;
  connectionState: string;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  messages: [],
  error: null,
  sendMessage: () => false,
  disconnect: () => {},
  reconnect: () => {},
  connectionState: 'INITIAL'
});

interface WebSocketProviderProps {
  children: ReactNode;
  disableAutoConnect?: boolean; // Optional prop to control auto-connection
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ 
  children, 
  disableAutoConnect = false 
}) => {
  // Create a unique session ID that stays stable across renders
  const sessionIdRef = useRef<string>(`session-${Math.random().toString(36).substring(2, 15)}`);
  
  // Create a flag to prevent excessive logging
  const hasLoggedRef = useRef(false);
  
  // Create a memoized WebSocket URL that won't change on re-renders
  const wsUrl = useMemo(() => {
    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // Get auth token to include in the connection
    const token = localStorage.getItem('authToken');
    
    // Build the WebSocket URL with session ID and token
    const wsConnection = `${backendUrl.replace(/^https?:/, protocol)}/ws?session=${sessionIdRef.current}${token ? `&token=${token}` : ''}`;
    
    // Only log once during initialization
    if (!hasLoggedRef.current) {
      console.log("WebSocketContext: Initializing with URL", wsConnection.replace(/token=([^&]+)/, 'token=REDACTED'));
      hasLoggedRef.current = true;
    }
    
    return wsConnection;
  }, []); // Empty dependency array means this only runs once
  
  // Use the stable URL with the websocket hook
  const wsConnection = useWebSocket(wsUrl);
  
  // If disableAutoConnect is true, disconnect immediately
  useEffect(() => {
    if (disableAutoConnect) {
      wsConnection.disconnect();
    }
  }, [disableAutoConnect, wsConnection]);
  
  // Authentication change handler
  useEffect(() => {
    // When auth token changes, reconnect the WebSocket
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'authToken') {
        console.log('WebSocketContext: Auth token changed, reconnecting...');
        wsConnection.reconnect();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [wsConnection]);
  
  // Memoize the context value to prevent unnecessary rerenders
  const contextValue = useMemo(() => ({
    ...wsConnection
  }), [
    wsConnection.isConnected,
    wsConnection.messages,
    wsConnection.error,
    wsConnection.connectionState
    // No need to depend on methods as they're stable
  ]);
  
  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = () => useContext(WebSocketContext); 