import { Server as WebSocketServer } from "ws";
import { Server } from "http";
import { parse } from "url";
import logger from "./utils/logger";

// Add connection tracking with proper client identification
const clientConnections = new Map();

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    // Allow WebSocket server to handle the upgrade itself
    noServer: false,
  });

  logger.info("WebSocket server initialized");

  // Handle connections with better client identification
  wss.on("connection", (ws, req) => {
    // Parse the URL to get query parameters
    const { query } = parse(req.url || "", true);
    const sessionId = (query.session as string) || "anonymous";

    // Create a unique client identifier that combines IP and session
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const clientId = `${clientIp}-${sessionId}`;

    logger.info("WebSocket connection request", { clientId, sessionId });

    // Check for duplicate connections
    if (clientConnections.has(clientId)) {
      logger.warn("Duplicate connection detected", { clientId });
      // Close duplicate connection politely
      ws.close(1000, "A connection with this session ID already exists");
      return;
    }

    // Register this connection
    clientConnections.set(clientId, ws);
    logger.info("WebSocket client connected", { clientId });

    // Handle messages
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        logger.info("Received WebSocket message", { data, clientId });

        // Handle message types
        switch (data.type) {
          case "ping":
            ws.send(
              JSON.stringify({
                type: "pong",
                timestamp: Date.now(),
                received: data,
              })
            );
            break;
          default:
            logger.info("Unknown message type", { type: data.type });
        }
      } catch (error) {
        logger.error("Error handling WebSocket message", error);
      }
    });

    // Clean up when the connection closes
    ws.on("close", (code, reason) => {
      logger.info("WebSocket client disconnected", {
        clientId,
        code,
        reason: reason.toString(),
      });
      clientConnections.delete(clientId);
    });

    // Handle connection errors
    ws.on("error", (error) => {
      logger.error("WebSocket connection error", {
        clientId,
        error: error.message,
      });
      clientConnections.delete(clientId);
    });

    // Send a welcome message to confirm connection
    ws.send(
      JSON.stringify({
        type: "connected",
        message: "Connected to WebSocket server",
        timestamp: Date.now(),
        sessionId: sessionId,
      })
    );
  });

  // Handle server-level errors
  wss.on("error", (error) => {
    logger.error("WebSocket server error", { error: error.message });
  });

  return wss;
}
