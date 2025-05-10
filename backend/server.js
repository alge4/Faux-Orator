const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Database connection
const { initializeDatabases } = require("./config/database");

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan("dev"));

// Import routes
const npcRoutes = require("./routes/npcs");
const agentRoutes = require("./routes/agents");

// API routes
app.use("/api/npcs", npcRoutes);
app.use("/api/agents", agentRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: "Server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Define port
const PORT = process.env.PORT || 3001;

// Initialize databases and start server
async function startServer() {
  try {
    // Connect to databases
    const dbInitialized = await initializeDatabases();

    if (!dbInitialized) {
      console.error("Failed to initialize databases. Exiting...");
      process.exit(1);
    }

    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
startServer();
