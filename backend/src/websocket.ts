import { Server as WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { parse } from "url";
import logger from "./utils/logger";
import jwt from "jsonwebtoken";

// Define client interface for better type checking
interface WebSocketClient {
  ws: WebSocket;
  id: string;
  ip: string | string[] | undefined;
  sessionId: string;
  userId?: string; // Add user ID from JWT validation
  authenticated: boolean; // Track if the client is authenticated
  lastPing: number;
  isAlive: boolean;
}

// Rate limiting configuration
const MAX_CONNECTIONS_PER_IP = 10;
const CONNECTION_WINDOW_MS = 60000; // 1 minute

// Connection tracking maps
const clientConnections = new Map<string, WebSocketClient>();
const ipConnections = new Map<string | string[] | undefined, number>();
const ipLastConnectionTime = new Map<string | string[] | undefined, number>();

// Heartbeat interval (ms)
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const CLIENT_TIMEOUT = 60000; // 60 seconds without ping = dead connection

// Rate limiting function
function checkRateLimit(ip: string | string[] | undefined): boolean {
  const now = Date.now();
  const lastConnection = ipLastConnectionTime.get(ip) || 0;
  const connectionCount = ipConnections.get(ip) || 0;

  // Reset connection count if outside window
  if (now - lastConnection > CONNECTION_WINDOW_MS) {
    ipConnections.set(ip, 1);
    ipLastConnectionTime.set(ip, now);
    return true;
  }

  // Check if too many connections in the time window
  if (connectionCount >= MAX_CONNECTIONS_PER_IP) {
    return false;
  }

  // Update connection tracking
  ipConnections.set(ip, connectionCount + 1);
  ipLastConnectionTime.set(ip, now);
  return true;
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({
    server,
    clientTracking: true,
  });

  logger.info("WebSocket server initialized");

  // Set up heartbeat interval
  const heartbeatInterval = setInterval(performHeartbeat, HEARTBEAT_INTERVAL);

  // Clean up on server close
  wss.on("close", () => {
    clearInterval(heartbeatInterval);
    logger.info("WebSocket server closed");
  });

  // Handle connections with better client identification
  wss.on("connection", (ws, req) => {
    // Parse the URL to get query parameters
    const { query } = parse(req.url || "", true);
    const sessionId = (query.session as string) || "anonymous";
    const token = query.token as string;

    // Create a unique client identifier that combines IP and session
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const clientId = `${clientIp}-${sessionId}`;

    // Log the connection request with important details
    logger.info("WebSocket connection request", {
      clientId,
      sessionId,
      hasToken: !!token,
      userAgent: req.headers["user-agent"],
      origin: req.headers.origin || "unknown",
    });

    // Rate limiting check
    if (!checkRateLimit(clientIp)) {
      logger.warn("Rate limit exceeded for client", { clientIp });
      ws.close(1008, "Connection rate limit exceeded");
      return;
    }

    // Check for duplicate connections
    if (clientConnections.has(clientId)) {
      logger.warn("Duplicate connection detected", { clientId });

      // Close the existing connection first (it might be stale)
      const existingClient = clientConnections.get(clientId);
      try {
        if (existingClient && existingClient.ws.readyState === WebSocket.OPEN) {
          existingClient.ws.close(1000, "New connection replacing this one");
          clientConnections.delete(clientId);
        }
      } catch (error) {
        logger.error("Error closing existing connection", { clientId, error });
      }
    }

    // Try to authenticate with token if provided
    let authenticated = false;
    let userId: string | undefined = undefined;

    if (token) {
      try {
        // Verify JWT token
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "your-jwt-secret",
          { algorithms: ["HS256"] }
        ) as { id: string };
        userId = decoded.id;
        authenticated = true;
        logger.info("WebSocket client authenticated", { clientId, userId });
      } catch (error) {
        logger.warn("Invalid WebSocket authentication token", {
          clientId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Register this connection with additional metadata
    const client: WebSocketClient = {
      ws,
      id: clientId,
      ip: clientIp,
      sessionId,
      userId,
      authenticated,
      lastPing: Date.now(),
      isAlive: true,
    };

    clientConnections.set(clientId, client);
    logger.info("WebSocket client connected", {
      clientId,
      authenticated,
      userId: userId || "anonymous",
      connectionCount: clientConnections.size,
    });

    // Set up ping handler to check connection status
    ws.on("pong", () => {
      const client = clientConnections.get(clientId);
      if (client) {
        client.isAlive = true;
        client.lastPing = Date.now();
      }
    });

    // Handle messages with improved error handling
    ws.on("message", (message) => {
      try {
        // Update client's last activity timestamp
        const client = clientConnections.get(clientId);
        if (client) {
          client.lastPing = Date.now();
          client.isAlive = true;
        }

        const data = JSON.parse(message.toString());
        logger.info("Received WebSocket message", {
          type: data.type,
          clientId,
        });

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

          case "auth":
            // Handle authentication messages
            handleAuth(clientId, data);
            break;

          default:
            logger.info("Unknown message type", { type: data.type });
        }
      } catch (error) {
        logger.error("Error handling WebSocket message", {
          error: error instanceof Error ? error.message : String(error),
          clientId,
        });
      }
    });

    // Clean up when the connection closes
    ws.on("close", (code, reason) => {
      const client = clientConnections.get(clientId);
      const connectedDuration = client
        ? Math.round((Date.now() - client.lastPing) / 1000)
        : 0;

      logger.info("WebSocket client disconnected", {
        clientId,
        code,
        reason: reason.toString(),
        connectedDuration: `${connectedDuration} seconds`,
        remainingConnections: clientConnections.size - 1,
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
        authenticated: authenticated,
        userId: userId || "anonymous",
        clientId: clientId,
        activeConnections: clientConnections.size,
      })
    );
  });

  // Handle server-level errors
  wss.on("error", (error) => {
    logger.error("WebSocket server error", { error: error.message });
  });

  // Function to send a message to all clients or specific ones
  function broadcast(
    message: any,
    filter?: (client: WebSocketClient) => boolean
  ) {
    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    clientConnections.forEach((client) => {
      if (
        client.ws.readyState === WebSocket.OPEN &&
        (!filter || filter(client))
      ) {
        try {
          client.ws.send(messageStr);
          sentCount++;
        } catch (error) {
          logger.error("Error sending broadcast message", {
            clientId: client.id,
            error,
          });
        }
      }
    });

    return sentCount;
  }

  // Function to send a message to a specific user across all their sessions
  function sendToUser(userId: string, message: any) {
    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    clientConnections.forEach((client) => {
      if (
        client.userId === userId &&
        client.authenticated &&
        client.ws.readyState === WebSocket.OPEN
      ) {
        try {
          client.ws.send(messageStr);
          sentCount++;
        } catch (error) {
          logger.error("Error sending user message", {
            clientId: client.id,
            userId,
            error,
          });
        }
      }
    });

    return sentCount;
  }

  // Function to perform heartbeat checks and clean up dead connections
  function performHeartbeat() {
    const now = Date.now();
    let deadConnections = 0;

    for (const [clientId, client] of clientConnections.entries()) {
      // Check if client hasn't responded in a while
      if (now - client.lastPing > CLIENT_TIMEOUT) {
        logger.warn("Client connection timed out", {
          clientId,
          lastPingAgo: `${Math.round((now - client.lastPing) / 1000)} seconds`,
        });

        try {
          client.ws.terminate(); // Force close the connection
          clientConnections.delete(clientId);
          deadConnections++;
        } catch (error) {
          logger.error("Error terminating dead connection", {
            clientId,
            error,
          });
        }
      } else if (client.ws.readyState === WebSocket.OPEN) {
        // Send ping to active connections
        try {
          client.isAlive = false; // Will be set to true when pong comes back
          client.ws.ping(); // Send ping frame
        } catch (error) {
          logger.error("Error sending ping", { clientId, error });
        }
      }
    }

    if (deadConnections > 0) {
      logger.info("Heartbeat cleanup", {
        deadConnectionsRemoved: deadConnections,
        remainingConnections: clientConnections.size,
      });
    }
  }

  // Handle authentication messages
  function handleAuth(clientId: string, data: any) {
    const client = clientConnections.get(clientId);
    if (!client) return;

    // Try to authenticate with token if provided
    if (data.token) {
      try {
        // Verify JWT token
        const decoded = jwt.verify(
          data.token,
          process.env.JWT_SECRET || "your-jwt-secret",
          { algorithms: ["HS256"] }
        ) as { id: string };
        client.userId = decoded.id;
        client.authenticated = true;

        logger.info("Client authenticated via message", {
          clientId,
          userId: client.userId,
        });

        // Send auth confirmation
        client.ws.send(
          JSON.stringify({
            type: "auth_result",
            success: true,
            timestamp: Date.now(),
            userId: client.userId,
          })
        );
      } catch (error) {
        logger.warn("Invalid authentication token", {
          clientId,
          error: error instanceof Error ? error.message : String(error),
        });

        client.ws.send(
          JSON.stringify({
            type: "auth_result",
            success: false,
            timestamp: Date.now(),
            error: "Invalid authentication token",
          })
        );
      }
    } else {
      // Send auth failure
      client.ws.send(
        JSON.stringify({
          type: "auth_result",
          success: false,
          timestamp: Date.now(),
          error: "No token provided",
        })
      );
    }
  }

  // Return service functions for use in other parts of the application
  return {
    broadcast,
    sendToUser,
    getClients: () => clientConnections.size,
    getAuthenticatedClients: () =>
      Array.from(clientConnections.values()).filter((c) => c.authenticated)
        .length,
  };
}
