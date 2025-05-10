const { supabase } = require("./supabase");
const { createAgentAccess } = require("./mongodb-agent");

/**
 * Agent factory to create agents with appropriate database access
 */
class AgentFactory {
  /**
   * Create a new agent with appropriate database access
   * @param {string} agentName - Name of the agent instance
   * @param {string} agentType - Type of agent
   * @returns {Object} Agent object with database access
   */
  static createAgent(agentName, agentType) {
    // Validate agent type
    const validAgentTypes = [
      "DM_Assistant",
      "NPC_Agent",
      "Lorekeeper_Agent",
      "World_Agent",
      "Rules_Agent",
      "Chronicle_Agent",
      "Story_Agent",
      "Player_Agent",
    ];

    if (!validAgentTypes.includes(agentType)) {
      throw new Error(`Invalid agent type: ${agentType}`);
    }

    // Create MongoDB access for the agent
    const mongoAccess = createAgentAccess(agentName, agentType);

    // Return the agent object with database access
    return {
      name: agentName,
      type: agentType,

      // Basic agent metadata
      metadata: {
        createdAt: new Date(),
        lastActive: new Date(),
      },

      // Initialize the agent
      async initialize() {
        // Connect to MongoDB
        await mongoAccess.connect();

        // Log agent creation
        console.log(`Agent ${agentName} (${agentType}) initialized`);

        return this;
      },

      // Access to MongoDB collections with permission controls
      mongo: {
        // Get a specific collection (with permission checks)
        getCollection: (collectionName) =>
          mongoAccess.getCollection(collectionName),

        // Find documents with permission filtering
        find: (collectionName, query, options) =>
          mongoAccess.find(collectionName, query, options),

        // Get a single document
        findOne: async (collectionName, query) => {
          const results = await mongoAccess.find(collectionName, query, {
            limit: 1,
          });
          return results.length > 0 ? results[0] : null;
        },

        // Insert a document
        insertOne: (collectionName, document) =>
          mongoAccess.insertOne(collectionName, document),

        // Update a document
        updateOne: (collectionName, filter, update) =>
          mongoAccess.updateOne(collectionName, filter, update),
      },

      // Access to Supabase with appropriate permission scoping
      supabase: {
        // User-related queries (mostly for DM Assistant)
        users: {
          getProfile: async (userId) => {
            if (agentType !== "DM_Assistant") {
              throw new Error(
                `Agent ${agentName} doesn't have access to user profiles`
              );
            }

            const { data, error } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", userId)
              .single();

            if (error) throw error;
            return data;
          },
        },

        // Campaign membership queries
        campaigns: {
          // Check if a user is a member of a campaign
          isMember: async (userId, campaignId) => {
            const { data, error } = await supabase
              .from("campaign_members")
              .select("*")
              .eq("campaign_id", campaignId)
              .eq("user_id", userId)
              .single();

            if (error) return false;
            return !!data;
          },

          // Check if a user is a DM of a campaign
          isDM: async (userId, campaignId) => {
            const { data, error } = await supabase
              .from("campaign_members")
              .select("*")
              .eq("campaign_id", campaignId)
              .eq("user_id", userId)
              .eq("role", "dm")
              .single();

            if (error) return false;
            return !!data;
          },

          // Get all members of a campaign
          getMembers: async (campaignId) => {
            const { data, error } = await supabase
              .from("campaign_members")
              .select("*, profiles(username, display_name)")
              .eq("campaign_id", campaignId);

            if (error) throw error;
            return data;
          },
        },
      },

      // Update the agent's last active timestamp
      updateActivity() {
        this.metadata.lastActive = new Date();
      },

      // Cleanup resources when agent is no longer needed
      async dispose() {
        await mongoAccess.close();
        console.log(`Agent ${agentName} resources released`);
      },
    };
  }
}

module.exports = AgentFactory;
