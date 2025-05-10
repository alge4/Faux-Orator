const axios = require("axios");

/**
 * Agent Communication Helper
 * Provides methods for AI models to interact with the database
 */
class AgentCommunication {
  /**
   * Create a new agent communication helper
   * @param {Object} options - Configuration options
   * @param {string} options.apiBaseUrl - Base URL for the API
   * @param {string} options.authToken - JWT authentication token
   * @param {string} options.sessionId - Agent session ID
   */
  constructor(options) {
    this.apiBaseUrl = options.apiBaseUrl || "http://localhost:3001/api";
    this.authToken = options.authToken;
    this.sessionId = options.sessionId;

    // Create axios instance with authentication
    this.api = axios.create({
      baseURL: this.apiBaseUrl,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.authToken}`,
      },
    });
  }

  /**
   * Initialize an agent session
   * @param {string} agentType - Type of agent
   * @param {string} agentName - Name of the agent
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object>} Initialization result
   */
  async initialize(agentType, agentName, campaignId) {
    try {
      const response = await this.api.post("/agents/initialize", {
        agentType,
        agentName,
        campaignId,
      });

      if (response.data.success) {
        this.sessionId = response.data.data.sessionId;
      }

      return response.data;
    } catch (error) {
      console.error(
        "Error initializing agent:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  /**
   * Execute a database query through the agent
   * @param {string} operation - Operation to perform (find, findOne, insertOne, updateOne)
   * @param {string} collection - Collection to operate on
   * @param {Object} params - Operation parameters
   * @returns {Promise<Object>} Query result
   */
  async query(operation, collection, params = {}) {
    if (!this.sessionId) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }

    try {
      const response = await this.api.post("/agents/query", {
        sessionId: this.sessionId,
        operation,
        collection,
        ...params,
      });

      return response.data;
    } catch (error) {
      console.error(
        "Error executing agent query:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  /**
   * Find documents in a collection
   * @param {string} collection - Collection to query
   * @param {Object} query - Query filter
   * @returns {Promise<Array>} Found documents
   */
  async find(collection, query = {}) {
    const result = await this.query("find", collection, { query });
    return result.data;
  }

  /**
   * Find a single document
   * @param {string} collection - Collection to query
   * @param {Object} query - Query filter
   * @returns {Promise<Object>} Found document
   */
  async findOne(collection, query = {}) {
    const result = await this.query("findOne", collection, { query });
    return result.data;
  }

  /**
   * Insert a document
   * @param {string} collection - Collection to insert into
   * @param {Object} document - Document to insert
   * @returns {Promise<Object>} Insert result
   */
  async insertOne(collection, document) {
    const result = await this.query("insertOne", collection, { document });
    return result.data;
  }

  /**
   * Update a document
   * @param {string} collection - Collection to update
   * @param {Object} filter - Query filter
   * @param {Object} update - Update operations
   * @returns {Promise<Object>} Update result
   */
  async updateOne(collection, filter, update) {
    const result = await this.query("updateOne", collection, {
      filter,
      update,
    });
    return result.data;
  }

  /**
   * Release the agent session
   * @returns {Promise<Object>} Release result
   */
  async release() {
    if (!this.sessionId) {
      return { success: true, message: "No active session to release" };
    }

    try {
      const response = await this.api.post("/agents/release", {
        sessionId: this.sessionId,
      });

      this.sessionId = null;

      return response.data;
    } catch (error) {
      console.error(
        "Error releasing agent:",
        error.response?.data || error.message
      );
      throw error;
    }
  }
}

module.exports = AgentCommunication;
