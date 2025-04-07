import express, { Request, Response, NextFunction } from "express";
import { Campaign } from "../models";
import authenticateJWT, { AuthRequest } from "../middleware/authMiddleware";
import { v4 as uuidv4 } from "uuid";
import { UserCampaignPreference } from "../models";
import logger from "../utils/logger";

const router = express.Router();

// Get all campaigns for the logged-in user
router.get("/", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Find campaigns where the user is the DM
    const campaigns = await Campaign.findAll({
      where: { dmId: userId },
      order: [["updatedAt", "DESC"]],
    });

    // TODO: In the future, also include campaigns where the user is a player
    // This will require implementing the CampaignUser model and relationship

    // Get user preferences for these campaigns
    const campaignIds = campaigns.map((campaign) => campaign.id);
    const preferences = await UserCampaignPreference.findAll({
      where: {
        userId,
        campaignId: campaignIds,
      },
    });

    // Create a map of preferences by campaign ID
    const preferencesMap = preferences.reduce((map, pref) => {
      map[pref.campaignId] = pref;
      return map;
    }, {});

    // Merge campaign data with preferences
    const campaignsWithPreferences = campaigns.map((campaign) => {
      const pref = preferencesMap[campaign.id];
      return {
        ...campaign.toJSON(),
        isFavorite: pref ? pref.isFavorite : false,
        lastAccessed: pref ? pref.lastAccessed : null,
      };
    });

    res.json(campaignsWithPreferences);
  } catch (error) {
    logger.error("Error fetching campaigns:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a new campaign
router.post("/", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { name, description } = req.body;

    // Validate input
    if (!name) {
      return res.status(400).json({ message: "Campaign name is required" });
    }

    // Create the campaign
    const newCampaign = await Campaign.create({
      id: uuidv4(),
      name,
      description: description || "",
      dmId: userId,
      // Any other fields like imageUrl can be added here
    });

    // Create initial user preference (to track favorites and access)
    await UserCampaignPreference.create({
      userId,
      campaignId: newCampaign.id,
      lastAccessed: new Date(),
      isFavorite: false,
    });

    logger.info("Campaign created", { campaignId: newCampaign.id, userId });

    return res.status(201).json(newCampaign);
  } catch (error) {
    logger.error("Error creating campaign:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get a specific campaign by ID
router.get(
  "/:campaignId",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      const { campaignId } = req.params;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Find the campaign
      const campaign = await Campaign.findOne({
        where: { id: campaignId },
      });

      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      // Check if the user is the DM of the campaign
      if (campaign.dmId !== userId) {
        // TODO: In the future, check if the user is a player in the campaign
        // For now, only the DM can access the campaign
        return res.status(403).json({
          message: "You do not have permission to access this campaign",
        });
      }

      return res.status(200).json({
        ...campaign.get({ plain: true }),
        role: "DM", // For now, only the DM can access the campaign
      });
    } catch (error) {
      console.error("Error fetching campaign:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

// Update an existing campaign
router.put(
  "/:campaignId",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      const { campaignId } = req.params;
      const { name, description, imageUrl, archived } = req.body;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Find the campaign
      const campaign = await Campaign.findOne({
        where: { id: campaignId },
      });

      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      // Check if the user is the DM of the campaign
      if (campaign.dmId !== userId) {
        return res.status(403).json({
          message: "You do not have permission to update this campaign",
        });
      }

      // Update the campaign
      const updatedFields: any = {};
      if (name !== undefined) updatedFields.name = name;
      if (description !== undefined) updatedFields.description = description;
      if (imageUrl !== undefined) updatedFields.imageUrl = imageUrl;
      if (archived !== undefined) updatedFields.archived = archived;

      await campaign.update(updatedFields);

      return res.status(200).json({
        ...campaign.get({ plain: true }),
        role: "DM",
      });
    } catch (error) {
      console.error("Error updating campaign:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

// Delete a campaign
router.delete(
  "/:campaignId",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      const { campaignId } = req.params;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Find the campaign
      const campaign = await Campaign.findOne({
        where: { id: campaignId },
      });

      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      // Check if the user is the DM of the campaign
      if (campaign.dmId !== userId) {
        return res.status(403).json({
          message: "You do not have permission to delete this campaign",
        });
      }

      // Delete the campaign
      await campaign.destroy();

      return res.status(200).json({ message: "Campaign deleted successfully" });
    } catch (error) {
      console.error("Error deleting campaign:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

// Toggle favorite status
router.patch("/:id/favorite", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { isFavorite } = req.body;
    const userId = req.user.id;

    // Update campaign favorite status in database
    // This might be stored in a UserCampaignPreference model

    // Example implementation with Sequelize:
    const preference = await UserCampaignPreference.findOne({
      where: { userId, campaignId: id },
    });

    if (preference) {
      await preference.update({ isFavorite });
    } else {
      await UserCampaignPreference.create({
        userId,
        campaignId: id,
        isFavorite,
        lastAccessed: new Date(),
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error("Error updating campaign favorite status", error);
    res.status(500).json({ message: "Failed to update favorite status" });
  }
});

// Record campaign access
router.post("/:id/access", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Record access time in database
    const preference = await UserCampaignPreference.findOne({
      where: { userId, campaignId: id },
    });

    if (preference) {
      await preference.update({ lastAccessed: new Date() });
    } else {
      await UserCampaignPreference.create({
        userId,
        campaignId: id,
        lastAccessed: new Date(),
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error("Error recording campaign access", error);
    res.status(500).json({ message: "Failed to record campaign access" });
  }
});

export default router;
