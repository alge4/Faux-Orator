import React, { createContext, useContext, useRef, useMemo, ReactNode } from 'react';
import { useWebSocket } from '../utils/websocket';

interface WebSocketContextType {
  isConnected: boolean;
  messages: any[];
  error: Error | null;
  sendMessage: (data: any) => boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  messages: [],
  error: null,
  sendMessage: () => false,
});

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Create a unique session ID that stays stable across renders
  const sessionIdRef = useRef(`session-${Math.random().toString(36).substring(2, 15)}`);
  
  // Create a memoized WebSocket URL that won't change on re-renders
  const wsUrl = useMemo(() => {
    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
    return `${backendUrl.replace(/^http/, 'ws')}/ws?session=${sessionIdRef.current}`;
  }, []);
  
  // Log once during initialization
  console.log("WebSocketContext: Initializing with URL", wsUrl);
  
  // Use the stable URL
  const wsConnection = useWebSocket(wsUrl);
  
  return (
    <WebSocketContext.Provider value={wsConnection}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = () => useContext(WebSocketContext); 