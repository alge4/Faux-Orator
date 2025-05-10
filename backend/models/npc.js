const { getCollection } = require("../config/mongodb");
const { ObjectId } = require("mongodb");

// NPC collection name
const COLLECTION_NAME = "npcs";

/**
 * NPC data access model
 */
const NpcModel = {
  /**
   * Create a new NPC
   * @param {Object} npcData NPC data
   * @returns {Promise<Object>} Created NPC or error
   */
  async create(npcData) {
    try {
      const npcsCollection = getCollection(COLLECTION_NAME);

      // Validate required fields
      if (!npcData.name || !npcData.campaign_id) {
        throw new Error("NPC name and campaign_id are required");
      }

      // Add metadata fields
      const npcWithMetadata = {
        ...npcData,
        created_at: new Date(),
        updated_at: new Date(),
        writeable_by_agents: npcData.writeable_by_agents !== false, // Default to true
        frozen_by_dm: npcData.frozen_by_dm || false,
        locked_fields: npcData.locked_fields || [],
      };

      const result = await npcsCollection.insertOne(npcWithMetadata);

      if (!result.acknowledged) {
        throw new Error("NPC creation failed");
      }

      return {
        success: true,
        data: {
          _id: result.insertedId,
          ...npcWithMetadata,
        },
      };
    } catch (error) {
      console.error("Error creating NPC:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get NPC by ID
   * @param {string} npcId NPC ID
   * @returns {Promise<Object>} NPC data or error
   */
  async getById(npcId) {
    try {
      const npcsCollection = getCollection(COLLECTION_NAME);

      // Convert string ID to MongoDB ObjectId
      const objectId = new ObjectId(npcId);
      const npc = await npcsCollection.findOne({ _id: objectId });

      if (!npc) {
        throw new Error("NPC not found");
      }

      return { success: true, data: npc };
    } catch (error) {
      console.error("Error getting NPC:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get NPCs by campaign ID
   * @param {string} campaignId Campaign ID
   * @returns {Promise<Object>} List of NPCs or error
   */
  async getByCampaignId(campaignId) {
    try {
      const npcsCollection = getCollection(COLLECTION_NAME);

      const npcs = await npcsCollection
        .find({ campaign_id: campaignId })
        .sort({ name: 1 })
        .toArray();

      return { success: true, data: npcs };
    } catch (error) {
      console.error("Error getting campaign NPCs:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update an NPC
   * @param {string} npcId NPC ID
   * @param {Object} updates Fields to update
   * @returns {Promise<Object>} Update result or error
   */
  async update(npcId, updates) {
    try {
      const npcsCollection = getCollection(COLLECTION_NAME);

      // Get current NPC state to check locked fields
      const objectId = new ObjectId(npcId);
      const currentNpc = await npcsCollection.findOne({ _id: objectId });

      if (!currentNpc) {
        throw new Error("NPC not found");
      }

      // Check if entity is frozen
      if (currentNpc.frozen_by_dm) {
        throw new Error("This NPC is frozen by the DM and cannot be updated");
      }

      // Check if entity is writeable by agents (if this update is from an agent)
      if (updates.from_agent && !currentNpc.writeable_by_agents) {
        throw new Error("This NPC is not writeable by agents");
      }

      // Check locked fields
      if (currentNpc.locked_fields && currentNpc.locked_fields.length > 0) {
        const attemptingToUpdateLockedField = Object.keys(updates).some(
          (field) => currentNpc.locked_fields.includes(field)
        );

        if (attemptingToUpdateLockedField) {
          throw new Error("Attempting to update locked fields");
        }
      }

      // Add updated_at timestamp
      const updateData = {
        ...updates,
        updated_at: new Date(),
      };

      // Remove from_agent flag if it exists (just for validation)
      if (updateData.from_agent) {
        delete updateData.from_agent;
      }

      const result = await npcsCollection.updateOne(
        { _id: objectId },
        { $set: updateData }
      );

      if (!result.acknowledged) {
        throw new Error("NPC update failed");
      }

      return { success: true, data: { _id: npcId, ...updateData } };
    } catch (error) {
      console.error("Error updating NPC:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Search NPCs by text query
   * @param {string} campaignId Campaign ID
   * @param {string} searchQuery Text to search for
   * @returns {Promise<Object>} Search results or error
   */
  async search(campaignId, searchQuery) {
    try {
      const npcsCollection = getCollection(COLLECTION_NAME);

      // Simple text search (In production, use text indexes)
      const npcs = await npcsCollection
        .find({
          campaign_id: campaignId,
          $or: [
            { name: { $regex: searchQuery, $options: "i" } },
            { description: { $regex: searchQuery, $options: "i" } },
            { location: { $regex: searchQuery, $options: "i" } },
          ],
        })
        .sort({ name: 1 })
        .toArray();

      return { success: true, data: npcs };
    } catch (error) {
      console.error("Error searching NPCs:", error);
      return { success: false, error: error.message };
    }
  },
};

module.exports = NpcModel;
