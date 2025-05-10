const {
  supabase,
  testConnection: testSupabaseConnection,
} = require("./supabase");
const {
  connectToDatabase,
  testConnection: testMongoConnection,
  getCollection,
} = require("./mongodb");

/**
 * Initialize all database connections
 * @returns {Promise<boolean>} Success status
 */
async function initializeDatabases() {
  try {
    // Test Supabase connection
    const supabaseConnected = await testSupabaseConnection();
    if (!supabaseConnected) {
      console.error("Could not connect to Supabase");
      return false;
    }

    // Connect to MongoDB
    await connectToDatabase();
    const mongoConnected = await testMongoConnection();
    if (!mongoConnected) {
      console.error("Could not connect to MongoDB");
      return false;
    }

    console.log("All database connections established successfully");
    return true;
  } catch (error) {
    console.error("Error initializing databases:", error);
    return false;
  }
}

/**
 * Database access layer for user management (Supabase)
 */
const userDb = {
  /**
   * Create a new user
   * @param {Object} userData User details
   * @returns {Promise<Object>} Created user or error
   */
  async createUser(userData) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
      });

      if (error) throw error;

      // Also store user profile data
      if (data?.user?.id) {
        const { error: profileError } = await supabase.from("profiles").insert([
          {
            id: data.user.id,
            username: userData.username || null,
            display_name: userData.displayName || null,
            created_at: new Date().toISOString(),
          },
        ]);

        if (profileError) throw profileError;
      }

      return { success: true, data };
    } catch (error) {
      console.error("Error creating user:", error);
      return { success: false, error };
    }
  },

  /**
   * Get user by ID
   * @param {string} userId User ID
   * @returns {Promise<Object>} User data or error
   */
  async getUserById(userId) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error getting user:", error);
      return { success: false, error };
    }
  },

  /**
   * Update user profile
   * @param {string} userId User ID
   * @param {Object} updates Fields to update
   * @returns {Promise<Object>} Update result or error
   */
  async updateUserProfile(userId, updates) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error updating user profile:", error);
      return { success: false, error };
    }
  },
};

/**
 * Database access layer for campaign data (MongoDB)
 */
const campaignDb = {
  /**
   * Create a new campaign
   * @param {Object} campaignData Campaign details
   * @returns {Promise<Object>} Created campaign or error
   */
  async createCampaign(campaignData) {
    try {
      const campaignsCollection = getCollection("campaigns");

      const result = await campaignsCollection.insertOne({
        ...campaignData,
        created_at: new Date(),
        updated_at: new Date(),
      });

      if (!result.acknowledged) {
        throw new Error("Campaign creation failed");
      }

      return {
        success: true,
        data: { id: result.insertedId, ...campaignData },
      };
    } catch (error) {
      console.error("Error creating campaign:", error);
      return { success: false, error };
    }
  },

  /**
   * Get campaign by ID
   * @param {string} campaignId Campaign ID
   * @returns {Promise<Object>} Campaign data or error
   */
  async getCampaignById(campaignId) {
    try {
      const campaignsCollection = getCollection("campaigns");
      const campaign = await campaignsCollection.findOne({ _id: campaignId });

      if (!campaign) {
        throw new Error("Campaign not found");
      }

      return { success: true, data: campaign };
    } catch (error) {
      console.error("Error getting campaign:", error);
      return { success: false, error };
    }
  },

  /**
   * Get campaigns for a user
   * @param {string} userId User ID
   * @returns {Promise<Object>} List of campaigns or error
   */
  async getUserCampaigns(userId) {
    try {
      const campaignsCollection = getCollection("campaigns");
      const campaigns = await campaignsCollection
        .find({ $or: [{ dm_id: userId }, { players: userId }] })
        .toArray();

      return { success: true, data: campaigns };
    } catch (error) {
      console.error("Error getting user campaigns:", error);
      return { success: false, error };
    }
  },
};

module.exports = {
  initializeDatabases,
  userDb,
  campaignDb,
  supabase, // Export the raw clients for direct access when needed
  getMongoCollection: getCollection,
};
