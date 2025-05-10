const { supabase } = require("../config/supabase");

/**
 * Middleware to verify JWT token from Supabase
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const verifyToken = async (req, res, next) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please provide a valid token.",
      });
    }

    // Extract token
    const token = authHeader.split(" ")[1];

    // Verify the token with Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token. Please login again.",
      });
    }

    // Add user to request object
    req.user = data.user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication failed due to server error.",
    });
  }
};

/**
 * Middleware to check if user is a DM for a campaign
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const isDungeonMaster = async (req, res, next) => {
  try {
    // First ensure the user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const campaignId = req.params.campaignId || req.body.campaignId;

    if (!campaignId) {
      return res.status(400).json({
        success: false,
        message: "Campaign ID is required",
      });
    }

    // Check if user is DM for this campaign
    const { data, error } = await supabase
      .from("campaign_members")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("user_id", req.user.id)
      .eq("role", "dm")
      .single();

    if (error || !data) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. You are not the Dungeon Master for this campaign.",
      });
    }

    next();
  } catch (error) {
    console.error("DM verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Authorization check failed due to server error",
    });
  }
};

/**
 * Middleware to check if user is a player in a campaign
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const isPlayerOrDM = async (req, res, next) => {
  try {
    // First ensure the user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const campaignId = req.params.campaignId || req.body.campaignId;

    if (!campaignId) {
      return res.status(400).json({
        success: false,
        message: "Campaign ID is required",
      });
    }

    // Check if user is a player or DM for this campaign
    const { data, error } = await supabase
      .from("campaign_members")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("user_id", req.user.id)
      .single();

    if (error || !data) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this campaign.",
      });
    }

    // Add the role to the request for potential role-specific logic
    req.userRole = data.role;
    next();
  } catch (error) {
    console.error("Campaign member verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Authorization check failed due to server error",
    });
  }
};

module.exports = {
  verifyToken,
  isDungeonMaster,
  isPlayerOrDM,
};
