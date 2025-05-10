const express = require("express");
const router = express.Router();
const NpcModel = require("../models/npc");
const {
  verifyToken,
  isPlayerOrDM,
  isDungeonMaster,
} = require("../middleware/auth");

// Apply authentication middleware to all routes
router.use(verifyToken);

/**
 * @route   GET /api/npcs/campaign/:campaignId
 * @desc    Get all NPCs for a campaign
 * @access  Private (Players and DM)
 */
router.get("/campaign/:campaignId", isPlayerOrDM, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const result = await NpcModel.getByCampaignId(campaignId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching campaign NPCs:", error);
    return res.status(500).json({
      success: false,
      error: "Server error fetching NPCs",
    });
  }
});

/**
 * @route   GET /api/npcs/:id
 * @desc    Get single NPC by ID
 * @access  Private (Players and DM)
 */
router.get("/:id", isPlayerOrDM, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await NpcModel.getById(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    // Verify the NPC belongs to the campaign the user is a part of
    const campaignId = req.query.campaignId;
    if (campaignId && result.data.campaign_id !== campaignId) {
      return res.status(403).json({
        success: false,
        error: "NPC does not belong to the specified campaign",
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching NPC:", error);
    return res.status(500).json({
      success: false,
      error: "Server error fetching NPC",
    });
  }
});

/**
 * @route   POST /api/npcs
 * @desc    Create a new NPC
 * @access  Private (DM only)
 */
router.post("/", isDungeonMaster, async (req, res) => {
  try {
    const npcData = req.body;

    // Validate campaign ID
    if (!npcData.campaign_id) {
      return res.status(400).json({
        success: false,
        error: "Campaign ID is required",
      });
    }

    // Create the NPC
    const result = await NpcModel.create(npcData);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(201).json(result);
  } catch (error) {
    console.error("Error creating NPC:", error);
    return res.status(500).json({
      success: false,
      error: "Server error creating NPC",
    });
  }
});

/**
 * @route   PUT /api/npcs/:id
 * @desc    Update an NPC
 * @access  Private (DM only)
 */
router.put("/:id", isDungeonMaster, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent updating campaign_id
    if (updates.campaign_id) {
      delete updates.campaign_id;
    }

    const result = await NpcModel.update(id, updates);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error updating NPC:", error);
    return res.status(500).json({
      success: false,
      error: "Server error updating NPC",
    });
  }
});

/**
 * @route   GET /api/npcs/search/:campaignId
 * @desc    Search NPCs in a campaign
 * @access  Private (Players and DM)
 */
router.get("/search/:campaignId", isPlayerOrDM, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Search query is required",
      });
    }

    const result = await NpcModel.search(campaignId, query);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error searching NPCs:", error);
    return res.status(500).json({
      success: false,
      error: "Server error searching NPCs",
    });
  }
});

/**
 * @route   PATCH /api/npcs/:id/lock
 * @desc    Lock or unlock NPC fields
 * @access  Private (DM only)
 */
router.patch("/:id/lock", isDungeonMaster, async (req, res) => {
  try {
    const { id } = req.params;
    const { frozen_by_dm, locked_fields, writeable_by_agents } = req.body;

    // Prepare updates object with only defined fields
    const updates = {};
    if (frozen_by_dm !== undefined) updates.frozen_by_dm = frozen_by_dm;
    if (locked_fields !== undefined) updates.locked_fields = locked_fields;
    if (writeable_by_agents !== undefined)
      updates.writeable_by_agents = writeable_by_agents;

    const result = await NpcModel.update(id, updates);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error updating NPC lock status:", error);
    return res.status(500).json({
      success: false,
      error: "Server error updating NPC lock status",
    });
  }
});

module.exports = router;
