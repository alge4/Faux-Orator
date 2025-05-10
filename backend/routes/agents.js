const express = require("express");
const router = express.Router();
const { verifyToken, isDungeonMaster } = require("../middleware/auth");
const AgentFactory = require("../config/agent-factory");
const { ObjectId } = require("mongodb");

// Agent session cache to maintain agent instances
const agentSessions = new Map();

// Apply authentication middleware to all routes
router.use(verifyToken);

/**
 * @route   POST /api/agents/initialize
 * @desc    Initialize an agent for a session
 * @access  Private (DM only)
 */
router.post("/initialize", isDungeonMaster, async (req, res) => {
  try {
    const { agentType, agentName, campaignId } = req.body;

    if (!agentType || !agentName || !campaignId) {
      return res.status(400).json({
        success: false,
        error: "Agent type, name, and campaign ID are required",
      });
    }

    // Create a unique session ID for this agent
    const sessionId = `${req.user.id}_${campaignId}_${agentType}_${Date.now()}`;

    // Create the agent
    const agent = await AgentFactory.createAgent(
      agentName,
      agentType
    ).initialize();

    // Store in session cache
    agentSessions.set(sessionId, {
      agent,
      userId: req.user.id,
      campaignId,
      createdAt: new Date(),
    });

    // Clean up old sessions
    cleanupOldSessions();

    return res.status(200).json({
      success: true,
      data: {
        sessionId,
        agentType,
        agentName,
        capabilities: getAgentCapabilities(agentType),
      },
    });
  } catch (error) {
    console.error("Error initializing agent:", error);
    return res.status(500).json({
      success: false,
      error: "Server error initializing agent",
    });
  }
});

/**
 * @route   POST /api/agents/query
 * @desc    Execute a database query through an agent
 * @access  Private (DM only)
 */
router.post("/query", isDungeonMaster, async (req, res) => {
  try {
    const {
      sessionId,
      operation,
      collection,
      query,
      document,
      filter,
      update,
    } = req.body;

    if (!sessionId || !operation || !collection) {
      return res.status(400).json({
        success: false,
        error: "Session ID, operation, and collection are required",
      });
    }

    // Get agent from cache
    const sessionData = agentSessions.get(sessionId);

    if (!sessionData) {
      return res.status(404).json({
        success: false,
        error: "Agent session not found. Please initialize the agent first.",
      });
    }

    // Verify the user has access to this agent
    if (sessionData.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: "Access denied. This agent belongs to another user.",
      });
    }

    // Update agent activity
    sessionData.agent.updateActivity();

    // Process the operation
    let result;

    switch (operation) {
      case "find":
        result = await sessionData.agent.mongo.find(collection, query || {});
        break;

      case "findOne":
        result = await sessionData.agent.mongo.findOne(collection, query || {});
        break;

      case "insertOne":
        if (!document) {
          return res.status(400).json({
            success: false,
            error: "Document is required for insertOne operation",
          });
        }

        // Ensure document is associated with the correct campaign
        document.campaign_id = sessionData.campaignId;

        result = await sessionData.agent.mongo.insertOne(collection, document);
        break;

      case "updateOne":
        if (!filter || !update) {
          return res.status(400).json({
            success: false,
            error: "Filter and update are required for updateOne operation",
          });
        }

        // Convert string IDs to ObjectId if needed
        if (filter._id && typeof filter._id === "string") {
          filter._id = new ObjectId(filter._id);
        }

        result = await sessionData.agent.mongo.updateOne(
          collection,
          filter,
          update
        );
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported operation: ${operation}`,
        });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error executing agent query:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Server error executing agent query",
    });
  }
});

/**
 * @route   POST /api/agents/release
 * @desc    Release an agent session
 * @access  Private (DM only)
 */
router.post("/release", isDungeonMaster, async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: "Session ID is required",
      });
    }

    // Get agent from cache
    const sessionData = agentSessions.get(sessionId);

    if (!sessionData) {
      return res.status(404).json({
        success: false,
        error: "Agent session not found",
      });
    }

    // Verify the user has access to this agent
    if (sessionData.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: "Access denied. This agent belongs to another user.",
      });
    }

    // Dispose of agent resources
    await sessionData.agent.dispose();

    // Remove from session cache
    agentSessions.delete(sessionId);

    return res.status(200).json({
      success: true,
      message: "Agent released successfully",
    });
  } catch (error) {
    console.error("Error releasing agent:", error);
    return res.status(500).json({
      success: false,
      error: "Server error releasing agent",
    });
  }
});

/**
 * Helper function to clean up old sessions
 * Sessions older than 1 hour will be disposed
 */
function cleanupOldSessions() {
  const now = new Date();
  const ONE_HOUR = 60 * 60 * 1000;

  for (const [sessionId, sessionData] of agentSessions.entries()) {
    if (now - sessionData.createdAt > ONE_HOUR) {
      // Dispose of agent resources
      sessionData.agent.dispose().catch((err) => {
        console.error(`Error disposing agent ${sessionId}:`, err);
      });

      // Remove from session cache
      agentSessions.delete(sessionId);
    }
  }
}

/**
 * Helper function to get agent capabilities
 * @param {string} agentType - Type of agent
 * @returns {Object} Agent capabilities
 */
function getAgentCapabilities(agentType) {
  const baseCapabilities = {
    canAccessMongoDB: true,
    canAccessSupabase: false,
    collections: [],
  };

  switch (agentType) {
    case "DM_Assistant":
      return {
        ...baseCapabilities,
        canAccessSupabase: true,
        collections: [
          "npcs",
          "locations",
          "factions",
          "items",
          "campaigns",
          "session_logs",
        ],
      };
    case "NPC_Agent":
      return {
        ...baseCapabilities,
        collections: ["npcs"],
      };
    case "Lorekeeper_Agent":
      return {
        ...baseCapabilities,
        collections: ["lore", "timeline", "history"],
      };
    case "World_Agent":
      return {
        ...baseCapabilities,
        collections: ["locations", "factions", "items"],
      };
    case "Rules_Agent":
      return {
        ...baseCapabilities,
        collections: ["rules", "mechanics"],
      };
    case "Chronicle_Agent":
      return {
        ...baseCapabilities,
        collections: ["session_logs", "highlighted_actions"],
      };
    default:
      return baseCapabilities;
  }
}

module.exports = router;
