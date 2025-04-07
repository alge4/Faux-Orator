import { useEffect, useState, useRef, useCallback } from "react";

// Define connection states to implement a state machine pattern
type ConnectionState =
  | "INITIAL" // Initial state
  | "CONNECTING" // Actively trying to connect
  | "CONNECTED" // Successfully connected
  | "RECONNECTING" // Attempting to reconnect
  | "DISCONNECTED" // Permanently disconnected (max retries reached)
  | "ERROR"; // Error state

export const useWebSocket = (url: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // Use a ref for the state machine
  const connectionStateRef = useRef<ConnectionState>("INITIAL");

  // Refs for connection management
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const reconnectCountRef = useRef(0);
  const lastConnectionAttemptRef = useRef(0);
  const urlRef = useRef(url);

  // Configuration constants
  const MAX_RECONNECT_ATTEMPTS = 5;
  const CONNECTION_THROTTLE_MS = 5000; // 5 seconds between connection attempts
  const MESSAGE_QUEUE_LIMIT = 100; // Limit stored messages to prevent memory issues

  // Message queue management - trim messages when they exceed the limit
  const trimMessages = useCallback((newMessage: any) => {
    setMessages((prev) => {
      const updatedMessages = [...prev, newMessage];
      // Keep only the most recent messages to prevent memory issues
      return updatedMessages.slice(
        Math.max(0, updatedMessages.length - MESSAGE_QUEUE_LIMIT)
      );
    });
  }, []);

  // Create one single message handler that won't change between renders
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (!isMountedRef.current) return;

      try {
        const data = JSON.parse(event.data);
        trimMessages(data);
      } catch (err) {
        console.error("WebSocket: Failed to parse message", err);
      }
    },
    [trimMessages]
  );

  // State machine transitions
  const setConnectionState = useCallback((newState: ConnectionState) => {
    const prevState = connectionStateRef.current;

    // Skip if state hasn't changed
    if (prevState === newState) return;

    connectionStateRef.current = newState;
    console.log(`WebSocket: State transition ${prevState} → ${newState}`);

    // Update connected state based on the new connection state
    setIsConnected(newState === "CONNECTED");

    // Clear error on successful transitions
    if (newState === "CONNECTED") {
      setError(null);
    }
  }, []);

  // Create a connect function with useCallback to keep it stable
  const connectWebSocket = useCallback(() => {
    // If already connecting or connected with same URL, do nothing
    if (connectionStateRef.current === "CONNECTING" && urlRef.current === url) {
      return;
    }

    // If already connected with same URL, do nothing
    if (
      connectionStateRef.current === "CONNECTED" &&
      socketRef.current?.readyState === WebSocket.OPEN &&
      urlRef.current === url
    ) {
      return;
    }

    // Prevent reconnecting too rapidly
    const now = Date.now();
    if (now - lastConnectionAttemptRef.current < CONNECTION_THROTTLE_MS) {
      console.log("WebSocket: Throttling connection attempt");
      return;
    }
    lastConnectionAttemptRef.current = now;

    // Update the URL ref
    urlRef.current = url;

    // Close any existing socket first
    if (socketRef.current) {
      socketRef.current.onclose = null; // Remove close handler to prevent reconnection
      socketRef.current.onerror = null; // Remove error handler
      socketRef.current.onmessage = null; // Remove message handler
      socketRef.current.close();
      socketRef.current = null;
    }

    // Set connecting state
    setConnectionState(
      reconnectCountRef.current > 0 ? "RECONNECTING" : "CONNECTING"
    );

    try {
      console.log("WebSocket: Creating new connection to", url);
      const socket = new WebSocket(url);

      socket.onopen = () => {
        if (!isMountedRef.current) return;

        console.log("WebSocket: Connected successfully");
        reconnectCountRef.current = 0; // Reset counter on successful connection
        setConnectionState("CONNECTED");
      };

      socket.onmessage = handleMessage;

      socket.onclose = (event) => {
        if (!isMountedRef.current) return;

        console.log(
          `WebSocket: Disconnected - code: ${event.code}, reason: ${
            event.reason || "none"
          }`
        );

        // Don't attempt to reconnect if:
        // 1. Component is unmounted
        // 2. Max reconnection attempts reached
        // 3. Close was clean (code 1000)
        if (!isMountedRef.current) {
          return;
        }

        if (event.code === 1000) {
          console.log("WebSocket: Clean close, not reconnecting");
          setConnectionState("DISCONNECTED");
          return;
        }

        if (reconnectCountRef.current >= MAX_RECONNECT_ATTEMPTS) {
          console.warn("WebSocket: Maximum reconnection attempts reached");
          setConnectionState("DISCONNECTED");
          return;
        }

        // Schedule reconnection with exponential backoff
        reconnectCountRef.current++;
        console.log(
          `WebSocket: Scheduling reconnect attempt ${reconnectCountRef.current}/${MAX_RECONNECT_ATTEMPTS}`
        );

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        // Exponential backoff for reconnection attempts
        const delay = Math.min(
          3000 * Math.pow(1.5, reconnectCountRef.current),
          30000
        );

        setConnectionState("RECONNECTING");

        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            connectWebSocket();
          }
        }, delay);
      };

      socket.onerror = (err) => {
        if (!isMountedRef.current) return;

        console.error("WebSocket: Error", err);
        setConnectionState("ERROR");
        setError(new Error("WebSocket connection error"));
      };

      socketRef.current = socket;
    } catch (err) {
      if (!isMountedRef.current) return;

      console.error("WebSocket: Failed to create connection", err);
      setConnectionState("ERROR");
      setError(
        err instanceof Error ? err : new Error("Unknown WebSocket error")
      );
    }
  }, [url, handleMessage, setConnectionState]);

  // Effect for connection management
  useEffect(() => {
    // Set mounted flag
    isMountedRef.current = true;

    // Initial connection
    connectWebSocket();

    // Clean up on unmount or URL change
    return () => {
      isMountedRef.current = false;

      console.log("WebSocket: Cleaning up WebSocket connection");

      // Clean up socket
      if (socketRef.current) {
        // Remove all event handlers first to prevent any callbacks
        socketRef.current.onopen = null;
        socketRef.current.onclose = null;
        socketRef.current.onerror = null;
        socketRef.current.onmessage = null;

        // Then close the connection
        socketRef.current.close();
        socketRef.current = null;
      }

      // Clean up reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connectWebSocket]);

  // Stable sendMessage function with error handling
  const sendMessage = useCallback(
    (data: any) => {
      // Only send if connected
      if (
        !isConnected ||
        !socketRef.current ||
        socketRef.current.readyState !== WebSocket.OPEN
      ) {
        console.warn("WebSocket: Cannot send message, not connected");
        return false;
      }

      try {
        socketRef.current.send(JSON.stringify(data));
        return true;
      } catch (err) {
        console.error("WebSocket: Error sending message", err);
        return false;
      }
    },
    [isConnected]
  );

  // Manual connection control functions
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log("WebSocket: Manual disconnect");
      socketRef.current.close(1000, "User initiated disconnect");
      setConnectionState("DISCONNECTED");
    }
  }, [setConnectionState]);

  const reconnect = useCallback(() => {
    console.log("WebSocket: Manual reconnect");
    reconnectCountRef.current = 0; // Reset counter on manual reconnect
    connectWebSocket();
  }, [connectWebSocket]);

  return {
    isConnected,
    messages,
    error,
    sendMessage,
    disconnect,
    reconnect,
    connectionState: connectionStateRef.current,
  };
};
