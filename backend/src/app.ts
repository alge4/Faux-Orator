import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { sequelize } from "./config/database";
import session from "express-session";
import { initializeDatabase } from "./models/index";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import campaignRoutes from "./routes/campaignRoutes";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import logger from "./utils/logger";
import passport from "passport";
import { initializePassport } from "./config/passport";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { setupWebSocket } from "./websocket";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Security headers
app.use(helmet());

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many authentication attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to auth routes
app.use("/api/auth", authLimiter);

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure cookie parser is configured before session middleware
app.use(cookieParser(process.env.SESSION_SECRET));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });
  next();
});

// Configure session middleware first
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-session-secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: "lax",
      httpOnly: true,
    },
    name: "fauxorator.sid",
  })
);

// Initialize passport
initializePassport();
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/campaigns", campaignRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Root endpoint
app.get("/", (req, res) => {
  res.send("Faux Orator API");
});

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error("Unhandled error", { error: err.message, stack: err.stack });
    res.status(500).json({ message: "An unexpected error occurred" });
  }
);

console.log("Environment variables:");
console.log("AZURE_CLIENT_ID:", process.env.AZURE_CLIENT_ID);
console.log("AZURE_TENANT_ID:", process.env.AZURE_TENANT_ID);
console.log(
  "AZURE_CLIENT_SECRET:",
  process.env.AZURE_CLIENT_SECRET ? "Set (not showing)" : "Not set"
);
console.log("AZURE_REDIRECT_URI:", process.env.AZURE_REDIRECT_URI);
console.log(
  "JWT_SECRET:",
  process.env.JWT_SECRET ? "Set (not showing)" : "Not set"
);
console.log("FRONTEND_URL:", process.env.FRONTEND_URL);

async function startServer() {
  try {
    // Wait for database connection
    await sequelize.authenticate();
    logger.info("Database connection established");

    // In development, force sync with proper cleanup
    if (process.env.NODE_ENV === "development") {
      // Drop everything in the correct order
      await sequelize.query('DROP TABLE IF EXISTS "Users" CASCADE;');
      await sequelize.query('DROP TABLE IF EXISTS "Campaigns" CASCADE;');
      await sequelize.query('DROP TYPE IF EXISTS "enum_Users_role" CASCADE;');

      // Then sync with force option
      await sequelize.sync({ force: true });
      logger.info("Database models force synchronized");
    } else {
      await sequelize.sync();
      logger.info("Database models synchronized");
    }

    // Create HTTP server
    const server = createServer(app);

    // Setup WebSocket server
    setupWebSocket(server);

    // Start the server
    server.listen(port, () => {
      logger.info(`Server running on port ${port}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

export default app;
