const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");

dotenv.config();

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || "faux-orator";

if (!uri) {
  console.error("MongoDB URI must be provided in environment variables");
  process.exit(1);
}

// Create a new MongoClient
const client = new MongoClient(uri);

// Connection singleton
let db = null;

/**
 * Agent-specific database access layer for MongoDB
 * Includes permissions and locking middleware for AI safety
 */
class AgentMongoAccess {
  constructor(agentName, agentType) {
    this.agentName = agentName;
    this.agentType = agentType;
    this.permissions = this._determinePermissions(agentType);
  }

  /**
   * Set permission levels based on agent type
   * @param {string} agentType - Type of agent (e.g., 'DM_Assistant', 'NPC_Agent')
   * @returns {Object} - Permission object
   */
  _determinePermissions(agentType) {
    const basePermissions = {
      canRead: true,
      canWrite: false,
      canDelete: false,
      collectionsAccess: [],
    };

    switch (agentType) {
      case "DM_Assistant":
        return {
          ...basePermissions,
          canWrite: true,
          canDelete: true,
          collectionsAccess: [
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
          ...basePermissions,
          canWrite: true,
          collectionsAccess: ["npcs"],
        };
      case "Lorekeeper_Agent":
        return {
          ...basePermissions,
          canWrite: true,
          collectionsAccess: ["lore", "timeline", "history"],
        };
      case "World_Agent":
        return {
          ...basePermissions,
          canWrite: true,
          collectionsAccess: ["locations", "factions", "items"],
        };
      case "Rules_Agent":
        return {
          ...basePermissions,
          canWrite: true,
          collectionsAccess: ["rules", "mechanics"],
        };
      case "Chronicle_Agent":
        return {
          ...basePermissions,
          canWrite: true,
          collectionsAccess: ["session_logs", "highlighted_actions"],
        };
      default:
        return basePermissions;
    }
  }

  /**
   * Connect to MongoDB
   * @returns {Promise<Db>} MongoDB database instance
   */
  async connect() {
    if (db) return db;

    try {
      await client.connect();
      console.log(`Agent ${this.agentName} connected to MongoDB Atlas`);

      db = client.db(dbName);
      return db;
    } catch (err) {
      console.error(
        `Agent ${this.agentName} failed to connect to MongoDB:`,
        err
      );
      throw err;
    }
  }

  /**
   * Get a collection with access control
   * @param {string} collectionName - Name of the collection
   * @returns {Collection} MongoDB collection with access controls
   */
  getCollection(collectionName) {
    if (!db) {
      throw new Error("Database not connected. Call connect first.");
    }

    // Check if agent has access to this collection
    if (!this.permissions.collectionsAccess.includes(collectionName)) {
      throw new Error(
        `Agent ${this.agentName} doesn't have access to ${collectionName}`
      );
    }

    return db.collection(collectionName);
  }

  /**
   * Find documents with locking enforcement
   * @param {string} collectionName - Collection to query
   * @param {Object} query - MongoDB query
   * @returns {Promise<Array>} Found documents
   */
  async find(collectionName, query, options = {}) {
    const collection = this.getCollection(collectionName);

    // Filter out frozen documents unless agent is DM Assistant
    if (this.agentType !== "DM_Assistant") {
      query = {
        ...query,
        frozen_by_dm: { $ne: true },
      };
    }

    return collection.find(query, options).toArray();
  }

  /**
   * Insert a document with proper agent attribution
   * @param {string} collectionName - Collection to insert into
   * @param {Object} document - Document to insert
   * @returns {Promise<Object>} Insert result
   */
  async insertOne(collectionName, document) {
    if (!this.permissions.canWrite) {
      throw new Error(`Agent ${this.agentName} doesn't have write permissions`);
    }

    const collection = this.getCollection(collectionName);

    // Add agent metadata
    const documentWithMeta = {
      ...document,
      created_by: this.agentName,
      created_at: new Date(),
      updated_at: new Date(),
      agent_updates: [
        {
          agent: this.agentName,
          timestamp: new Date(),
          action: "create",
        },
      ],
    };

    return collection.insertOne(documentWithMeta);
  }

  /**
   * Update a document with locking enforcement
   * @param {string} collectionName - Collection to update
   * @param {Object} filter - Query filter
   * @param {Object} update - Update operations
   * @returns {Promise<Object>} Update result
   */
  async updateOne(collectionName, filter, update) {
    if (!this.permissions.canWrite) {
      throw new Error(`Agent ${this.agentName} doesn't have write permissions`);
    }

    const collection = this.getCollection(collectionName);

    // Check if document is frozen or has locked fields
    const document = await collection.findOne(filter);

    if (!document) {
      throw new Error("Document not found");
    }

    // Check if document is frozen
    if (document.frozen_by_dm && this.agentType !== "DM_Assistant") {
      throw new Error(
        "This document is frozen by the DM and cannot be updated"
      );
    }

    // Check if document is writeable by agents
    if (
      document.writeable_by_agents === false &&
      this.agentType !== "DM_Assistant"
    ) {
      throw new Error("This document is not writeable by agents");
    }

    // Check locked fields
    if (document.locked_fields && document.locked_fields.length > 0) {
      const updateFields = Object.keys(update.$set || {});
      const attemptingToUpdateLockedField = updateFields.some((field) =>
        document.locked_fields.includes(field)
      );

      if (attemptingToUpdateLockedField && this.agentType !== "DM_Assistant") {
        throw new Error("Attempting to update locked fields");
      }
    }

    // Add agent update metadata
    const updateWithMeta = {
      ...update,
      $set: {
        ...(update.$set || {}),
        updated_at: new Date(),
        last_updated_by: this.agentName,
      },
      $push: {
        ...(update.$push || {}),
        agent_updates: {
          agent: this.agentName,
          timestamp: new Date(),
          action: "update",
          fields: Object.keys(update.$set || {}),
        },
      },
    };

    return collection.updateOne(filter, updateWithMeta);
  }

  /**
   * Close the database connection
   */
  async close() {
    if (client) {
      await client.close();
      db = null;
      console.log("MongoDB connection closed");
    }
  }
}

module.exports = {
  AgentMongoAccess,
  createAgentAccess: (agentName, agentType) =>
    new AgentMongoAccess(agentName, agentType),
};
