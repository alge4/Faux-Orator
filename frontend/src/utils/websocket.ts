import { useEffect, useState, useRef, useCallback } from "react";

export const useWebSocket = (url: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Move reconnectCount to a ref so it persists between renders
  const reconnectCountRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  // Store the URL in a ref to compare if it actually changed
  const urlRef = useRef(url);

  // Create a connect function with useCallback to keep it stable
  const connectWebSocket = useCallback(() => {
    // Only create a new connection if we don't have one or URL changed
    if (
      socketRef.current?.readyState === WebSocket.OPEN &&
      urlRef.current === url
    ) {
      console.log("WebSocket: Already connected and URL unchanged");
      return;
    }

    // Update the URL ref
    urlRef.current = url;

    // Close any existing socket first
    if (socketRef.current) {
      console.log(
        "WebSocket: Closing existing connection before creating new one"
      );
      socketRef.current.close();
      socketRef.current = null;
    }

    try {
      console.log("WebSocket: Creating new connection to", url);
      const socket = new WebSocket(url);

      socket.onopen = () => {
        console.log("WebSocket: Connected successfully");
        reconnectCountRef.current = 0; // Reset counter on successful connection
        setIsConnected(true);
        setError(null);
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setMessages((prev) => [...prev, data]);
      };

      socket.onclose = (event) => {
        console.log(
          `WebSocket: Disconnected - code: ${event.code}, reason: ${
            event.reason || "none"
          }`
        );
        setIsConnected(false);

        // Clean reconnect logic
        if (reconnectCountRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectCountRef.current++;
          console.log(
            `WebSocket: Scheduling reconnect attempt ${reconnectCountRef.current}/${MAX_RECONNECT_ATTEMPTS}`
          );

          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, 3000 * reconnectCountRef.current);
        } else {
          console.warn("WebSocket: Maximum reconnection attempts reached");
        }
      };

      socket.onerror = (err) => {
        console.error("WebSocket: Error", err);
        setError(new Error("WebSocket connection error"));
      };

      socketRef.current = socket;
    } catch (err) {
      console.error("WebSocket: Failed to create connection", err);
      setError(
        err instanceof Error ? err : new Error("Unknown WebSocket error")
      );
    }
  }, [url]);

  // Effect for connection management
  useEffect(() => {
    // Initial connection
    connectWebSocket();

    // Clean up on unmount or URL change
    return () => {
      console.log("WebSocket: Cleaning up WebSocket connection");
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connectWebSocket]);

  // Stable sendMessage function
  const sendMessage = useCallback((data: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  return { isConnected, messages, error, sendMessage };
};
