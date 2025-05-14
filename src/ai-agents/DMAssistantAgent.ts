import { BaseAgent, AgentContext, AgentResponse } from "./BaseAgent";
import { openAIService } from "../services/openai";
import { 
  supabase, 
  fetchAllEntitiesForCampaign, 
  fetchEntityRelationshipsWithDetails,
  createEntityRelationship,
  updateEntityRelationship,
  deleteEntityRelationship
} from "../services/supabase";
import { v4 as uuidv4 } from "uuid";
import { 
  Entity, 
  EntityType, 
  EntityRelationship, 
  EntityRelationshipInsert, 
  EntityRelationshipUpdate,
  EntityRelationshipDisplay 
} from "../types/entities";

interface DMAssistantInput {
  type: "planning" | "running" | "review";
  message: string;
  context?: {
    pinnedEntities?: Array<{
      id: string;
      name: string;
      type: string;
      content: any;
    }>;
    currentMode?: string;
    sessionHistory?: Array<{
      role: string;
      content: string;
    }>;
  };
}

interface EntityToolInput {
  campaignId: string;
  entityType: EntityType;
  name: string;
  description?: string;
  content?: Record<string, unknown>;
}

export class DMAssistantAgent extends BaseAgent {
  constructor(context: AgentContext) {
    super(context);
  }

  async process(input: DMAssistantInput): Promise<AgentResponse> {
    try {
      this.validateInput(input);
      await this.logAction("dm_assistant_query", input);

      // Get campaign context
      const campaignContext = await this.getCampaignContext();

      // Generate response based on mode
      const response = await this.generateResponse(input, campaignContext);

      // Log the interaction
      await this.logAction("dm_assistant_response", {
        input,
        response,
        campaignContext,
      });

      return {
        success: true,
        message: response,
        data: {
          type: input.type,
          context: campaignContext,
        },
      };
    } catch (error) {
      return this.handleError(error as Error);
    }
  }

  private async getCampaignContext() {
    // Fetch relevant campaign data from Supabase
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", this.context.campaignId)
      .single();

    // Fetch recent entities
    const { data: recentEntities } = await supabase
      .from("campaign_entities")
      .select("*")
      .eq("campaign_id", this.context.campaignId)
      .order("last_referenced", { ascending: false })
      .limit(5);

    return {
      campaign,
      recentEntities,
    };
  }

  private async generateResponse(
    input: DMAssistantInput,
    context: any
  ): Promise<string> {
    const systemPrompt = this.createSystemPrompt(input.type, context);

    // Define function tools for entity CRUD operations
    const functions = this.defineFunctionTools();

    const messages = [
      { role: "system", content: systemPrompt },
      ...(input.context?.sessionHistory || []).map((msg) => ({
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content,
      })),
      { role: "user", content: input.message },
    ];

    const response = await openAIService.getChatCompletion(
      messages,
      {
        functions: functions,
        temperature: 0.7,
      },
      this.context.sessionId,
      this.context.campaignId
    );

    // If the AI used a function, handle it
    if (response.function_call) {
      const functionName = response.function_call.name;
      const args = JSON.parse(response.function_call.arguments);
      
      let result;
      
      switch (functionName) {
        case "getEntities":
          result = await this.getEntities(args.entityType);
          break;
        case "getEntity":
          result = await this.getEntity(args.entityId);
          break;
        case "createEntity":
          result = await this.createEntity(args);
          break;
        case "updateEntity":
          result = await this.updateEntity(args.entityId, args.updates);
          break;
        case "deleteEntity":
          result = await this.deleteEntity(args.entityId);
          break;
        case "getEntityRelationships":
          result = await this.getEntityRelationships();
          break;
        case "createEntityRelationship":
          result = await this.createEntityRelationship(args);
          break;
        case "updateEntityRelationship":
          result = await this.updateEntityRelationship(args.relationshipId, args.updates);
          break;
        case "deleteEntityRelationship":
          result = await this.deleteEntityRelationship(args.relationshipId);
          break;
        default:
          result = { error: "Unknown function call" };
      }
      
      // Generate a new response based on the function result
      const newMessages = [
        ...messages,
        response,
        {
          role: "function",
          name: functionName,
          content: JSON.stringify(result),
        },
      ];
      
      const finalResponse = await openAIService.getChatCompletion(
        newMessages,
        undefined,
        this.context.sessionId,
        this.context.campaignId
      );
      
      return finalResponse.content || "I couldn't complete that operation.";
    }

    return (
      response.content ||
      "I apologize, but I'm unable to generate a response at the moment."
    );
  }

  private defineFunctionTools() {
    return [
      {
        name: "getEntities",
        description: "Get all entities of a specific type in the campaign",
        parameters: {
          type: "object",
          properties: {
            entityType: {
              type: "string",
              enum: ["npc", "location", "faction", "item", "all"],
              description: "The type of entities to fetch, or 'all' for all types",
            },
          },
          required: ["entityType"],
        },
      },
      {
        name: "getEntity",
        description: "Get details of a specific entity by ID",
        parameters: {
          type: "object",
          properties: {
            entityId: {
              type: "string",
              description: "The ID of the entity to fetch",
            },
          },
          required: ["entityId"],
        },
      },
      {
        name: "createEntity",
        description: "Create a new entity in the campaign",
        parameters: {
          type: "object",
          properties: {
            entityType: {
              type: "string",
              enum: ["npc", "location", "faction", "item"],
              description: "The type of entity to create",
            },
            name: {
              type: "string",
              description: "The name of the entity",
            },
            description: {
              type: "string",
              description: "Description of the entity",
            },
            content: {
              type: "object",
              description: "Additional data for the entity",
            },
          },
          required: ["entityType", "name"],
        },
      },
      {
        name: "updateEntity",
        description: "Update an existing entity",
        parameters: {
          type: "object",
          properties: {
            entityId: {
              type: "string",
              description: "The ID of the entity to update",
            },
            updates: {
              type: "object",
              description: "The fields to update",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                content: { type: "object" },
              },
            },
          },
          required: ["entityId", "updates"],
        },
      },
      {
        name: "deleteEntity",
        description: "Delete an entity from the campaign",
        parameters: {
          type: "object",
          properties: {
            entityId: {
              type: "string",
              description: "The ID of the entity to delete",
            },
          },
          required: ["entityId"],
        },
      },
      {
        name: "getEntityRelationships",
        description: "Get all entity relationships in the campaign",
        parameters: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "createEntityRelationship",
        description: "Create a new relationship between entities",
        parameters: {
          type: "object",
          properties: {
            sourceId: {
              type: "string",
              description: "The ID of the source entity",
            },
            targetId: {
              type: "string",
              description: "The ID of the target entity",
            },
            relationshipType: {
              type: "string",
              description: "The type of relationship",
            },
            description: {
              type: "string",
              description: "Description of the relationship",
            },
            strength: {
              type: "number",
              description: "Strength of the relationship (1-10)",
            },
            bidirectional: {
              type: "boolean",
              description: "Whether the relationship is bidirectional",
            },
          },
          required: ["sourceId", "targetId", "relationshipType"],
        },
      },
      {
        name: "updateEntityRelationship",
        description: "Update an existing entity relationship",
        parameters: {
          type: "object",
          properties: {
            relationshipId: {
              type: "string",
              description: "The ID of the relationship to update",
            },
            updates: {
              type: "object",
              description: "The fields to update",
              properties: {
                relationshipType: { type: "string" },
                description: { type: "string" },
                strength: { type: "number" },
                bidirectional: { type: "boolean" },
              },
            },
          },
          required: ["relationshipId", "updates"],
        },
      },
      {
        name: "deleteEntityRelationship",
        description: "Delete an entity relationship",
        parameters: {
          type: "object",
          properties: {
            relationshipId: {
              type: "string",
              description: "The ID of the relationship to delete",
            },
          },
          required: ["relationshipId"],
        },
      },
    ];
  }

  private createSystemPrompt(type: string, context: any): string {
    const basePrompt = `You are an expert Dungeon Master's assistant for a D&D campaign. 
Campaign: ${context.campaign?.name || "Unnamed Campaign"}
Setting: ${context.campaign?.setting || "Not specified"}
Theme: ${context.campaign?.theme || "Not specified"}

Your role is to assist the DM in creating and managing an engaging and consistent campaign. You should:
1. Maintain consistency with established campaign elements
2. Offer creative suggestions while respecting the DM's authority
3. Help track important details and relationships
4. Provide clear, actionable advice
5. Ask clarifying questions when needed

You can create, read, update, and delete entities (NPCs, locations, factions, items) and their relationships.
Use the provided function tools to manage campaign entities when the user requests it.

Remember:
- You are an assistant, not the DM - always defer to their decisions
- Keep responses focused and relevant to the current context
- Reference specific campaign elements when appropriate
- Maintain the campaign's tone and theme
- Offer alternatives when making suggestions`;

    switch (type) {
      case "planning":
        return `${basePrompt}

You are currently helping with session planning. Focus on:
- Story development and pacing
- Encounter design and balance
- NPC motivations and actions
- Plot hooks and story arcs
- Session structure and timing`;

      case "running":
        return `${basePrompt}

You are currently helping run a live session. Focus on:
- Quick rules lookups and clarifications
- Improvised NPC responses and actions
- Dynamic encounter adjustments
- Maintaining narrative flow
- Quick reference for important details`;

      case "review":
        return `${basePrompt}

You are currently helping review and update the campaign. Focus on:
- Analyzing session outcomes
- Updating NPC and faction status
- Identifying potential consequences
- Planning future developments
- Maintaining campaign notes`;

      default:
        return basePrompt;
    }
  }

  // Entity CRUD Operations
  private async getEntities(entityType: string) {
    try {
      const result = await fetchAllEntitiesForCampaign(this.context.campaignId);
      
      if (entityType === "all") {
        return result;
      }
      
      switch (entityType) {
        case "npc":
          return { entities: result.npcs || [] };
        case "location":
          return { entities: result.locations || [] };
        case "faction":
          return { entities: result.factions || [] };
        case "item":
          return { entities: result.items || [] };
        default:
          return { error: "Invalid entity type" };
      }
    } catch (error) {
      console.error("Error fetching entities:", error);
      return { error: "Failed to fetch entities" };
    }
  }

  private async getEntity(entityId: string) {
    try {
      // First get all entities
      const allEntities = await fetchAllEntitiesForCampaign(this.context.campaignId);
      
      // Search for the entity in all entity types
      const entity = [
        ...(allEntities.npcs || []),
        ...(allEntities.locations || []),
        ...(allEntities.factions || []),
        ...(allEntities.items || [])
      ].find(e => e.id === entityId);
      
      if (!entity) {
        return { error: "Entity not found" };
      }
      
      return { entity };
    } catch (error) {
      console.error("Error fetching entity:", error);
      return { error: "Failed to fetch entity" };
    }
  }

  private async createEntity(data: EntityToolInput) {
    try {
      const tableName = this.getTableName(data.entityType);
      
      // Prepare entity data
      const entityData = {
        id: uuidv4(),
        campaign_id: this.context.campaignId,
        name: data.name,
        description: data.description || "",
        content: data.content || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Create entity in Supabase
      const { data: createdEntity, error } = await supabase
        .from(tableName)
        .insert(entityData)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return { 
        success: true, 
        message: `Successfully created ${data.entityType} "${data.name}"`,
        entity: createdEntity 
      };
    } catch (error) {
      console.error(`Error creating ${data.entityType}:`, error);
      return { 
        success: false, 
        error: `Failed to create ${data.entityType}` 
      };
    }
  }

  private async updateEntity(entityId: string, updates: Partial<Entity>) {
    try {
      // First get the entity to determine its type
      const { entity, error: getError } = await this.getEntity(entityId);
      
      if (getError || !entity) {
        return { error: getError || "Entity not found" };
      }
      
      const tableName = this.getTableName(entity.type);
      
      // Prepare update data
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      // Update entity in Supabase
      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', entityId);
      
      if (error) {
        throw error;
      }
      
      return { 
        success: true, 
        message: `Successfully updated ${entity.type} "${entity.name}"` 
      };
    } catch (error) {
      console.error("Error updating entity:", error);
      return { 
        success: false, 
        error: "Failed to update entity" 
      };
    }
  }

  private async deleteEntity(entityId: string) {
    try {
      // First get the entity to determine its type
      const { entity, error: getError } = await this.getEntity(entityId);
      
      if (getError || !entity) {
        return { error: getError || "Entity not found" };
      }
      
      const tableName = this.getTableName(entity.type);
      
      // Delete entity in Supabase
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', entityId);
      
      if (error) {
        throw error;
      }
      
      return { 
        success: true, 
        message: `Successfully deleted ${entity.type} "${entity.name}"` 
      };
    } catch (error) {
      console.error("Error deleting entity:", error);
      return { 
        success: false, 
        error: "Failed to delete entity" 
      };
    }
  }

  // Entity Relationship Operations
  private async getEntityRelationships() {
    try {
      const result = await fetchEntityRelationshipsWithDetails(this.context.campaignId);
      return { relationships: result.data || [] };
    } catch (error) {
      console.error("Error fetching entity relationships:", error);
      return { error: "Failed to fetch entity relationships" };
    }
  }

  private async createEntityRelationship(data: EntityRelationshipInsert) {
    try {
      // Prepare relationship data
      const relationshipData: EntityRelationshipInsert = {
        campaign_id: this.context.campaignId,
        source_id: data.source_id,
        target_id: data.target_id,
        relationship_type: data.relationship_type,
        description: data.description || null,
        strength: data.strength || 5,
        bidirectional: data.bidirectional || false
      };
      
      // Create relationship in Supabase
      const result = await createEntityRelationship(relationshipData);
      
      if (result.error) {
        throw result.error;
      }
      
      return { 
        success: true, 
        message: `Successfully created relationship`,
        relationship: result.data 
      };
    } catch (error) {
      console.error("Error creating entity relationship:", error);
      return { 
        success: false, 
        error: "Failed to create entity relationship" 
      };
    }
  }

  private async updateEntityRelationship(relationshipId: string, updates: EntityRelationshipUpdate) {
    try {
      // Update relationship in Supabase
      const result = await updateEntityRelationship(relationshipId, updates);
      
      if (result.error) {
        throw result.error;
      }
      
      return { 
        success: true, 
        message: `Successfully updated relationship`,
        relationship: result.data 
      };
    } catch (error) {
      console.error("Error updating entity relationship:", error);
      return { 
        success: false, 
        error: "Failed to update entity relationship" 
      };
    }
  }

  private async deleteEntityRelationship(relationshipId: string) {
    try {
      // Delete relationship in Supabase
      const result = await deleteEntityRelationship(relationshipId, this.context.campaignId);
      
      if (result.error) {
        throw result.error;
      }
      
      return { 
        success: true, 
        message: `Successfully deleted relationship`
      };
    } catch (error) {
      console.error("Error deleting entity relationship:", error);
      return { 
        success: false, 
        error: "Failed to delete entity relationship" 
      };
    }
  }

  // Helper methods
  private getTableName(entityType: string): string {
    switch (entityType) {
      case 'npc':
        return 'npcs';
      case 'location':
        return 'locations';
      case 'faction':
        return 'factions';
      case 'item':
        return 'items';
      default:
        throw new Error(`Invalid entity type: ${entityType}`);
    }
  }
}
