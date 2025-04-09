import { v4 as uuidv4 } from "uuid";
import { openAIService, ChatMessage, FunctionDefinition } from "./openai";
import {
  SessionPlan,
  ChatSuggestion,
  EntityReference,
  NPCReference,
  LocationReference,
  ItemReference,
  FactionReference,
  SessionPlanningContext,
} from "../types/sessionPlanning";
import { supabase } from "./supabase";

class SessionPlanningService {
  private static instance: SessionPlanningService;

  private planningContexts: Map<string, SessionPlanningContext> = new Map();

  private constructor() {}

  static getInstance(): SessionPlanningService {
    if (!SessionPlanningService.instance) {
      SessionPlanningService.instance = new SessionPlanningService();
    }
    return SessionPlanningService.instance;
  }

  // Initialize a planning context for a campaign
  async initPlanningContext(campaignId: string): Promise<string> {
    const sessionId = uuidv4();

    // Initialize empty context
    const emptyContext: SessionPlanningContext = {
      referencedEntities: {
        npcs: new Map<string, NPCReference>(),
        locations: new Map<string, LocationReference>(),
        items: new Map<string, ItemReference>(),
        factions: new Map<string, FactionReference>(),
      },
      pinnedEntities: new Set<string>(),
      activeFilters: new Set<string>(),
    };

    this.planningContexts.set(sessionId, emptyContext);

    // Fetch some initial context for the campaign
    await this.loadCampaignEntities(sessionId, campaignId);

    return sessionId;
  }

  private async loadCampaignEntities(
    sessionId: string,
    campaignId: string
  ): Promise<void> {
    try {
      // TODO: Replace with actual Supabase queries to fetch campaign data
      // Fetch NPCs for this campaign
      const { data: npcs, error: npcsError } = await supabase
        .from("npcs")
        .select("*")
        .eq("campaign_id", campaignId);

      if (npcsError) throw npcsError;

      // Add NPCs to the context
      const context = this.planningContexts.get(sessionId);
      if (context) {
        npcs?.forEach((npc) => {
          context.referencedEntities.npcs.set(npc.id, {
            id: npc.id,
            name: npc.name,
            type: "npc",
            personality: npc.personality || "",
            currentLocation: npc.current_location_id || "",
            lastUpdate: npc.updated_at,
            tags: npc.tags || [],
          });
        });
      }

      // Similar fetches for locations, items, factions would go here
    } catch (error) {
      console.error("Error loading campaign entities:", error);
    }
  }

  // Get suggestions based on the current planning context
  async getSuggestions(
    sessionId: string,
    userPrompt: string
  ): Promise<ChatSuggestion[]> {
    try {
      const context = this.planningContexts.get(sessionId);
      if (!context) {
        throw new Error(`No planning context found for session ${sessionId}`);
      }

      // Prepare system prompt with context
      const systemPrompt = this.buildSystemPrompt(context);

      // Call OpenAI with function definitions for suggestions
      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ];

      const functions: FunctionDefinition[] = [
        {
          name: "generateSuggestions",
          description: "Generate DM suggestions based on the campaign context",
          parameters: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      enum: [
                        "encounter",
                        "npc_interaction",
                        "plot_twist",
                        "location_description",
                      ],
                    },
                    content: {
                      type: "string",
                      description: "The detailed suggestion content",
                    },
                    relatedEntities: {
                      type: "array",
                      items: {
                        type: "string",
                      },
                      description:
                        "IDs of entities referenced in this suggestion",
                    },
                  },
                  required: ["type", "content"],
                },
              },
            },
            required: ["suggestions"],
          },
        },
      ];

      const response = await openAIService.getChatCompletion(
        messages,
        functions,
        sessionId
      );

      if (
        response.function_call &&
        response.function_call.name === "generateSuggestions"
      ) {
        const functionArgs = JSON.parse(response.function_call.arguments);
        return functionArgs.suggestions as ChatSuggestion[];
      }

      // Fallback: Extract suggestions from text response
      return [
        {
          type: "plot_twist",
          content: response.content || "No suggestions available",
          relatedEntities: [],
        },
      ];
    } catch (error) {
      console.error("Error generating suggestions:", error);
      return [];
    }
  }

  // Generate an initial session plan based on campaign and prompt
  async generateSessionPlan(
    sessionId: string,
    campaignId: string,
    prompt: string
  ): Promise<SessionPlan> {
    try {
      const context = this.planningContexts.get(sessionId);
      if (!context) {
        throw new Error(`No planning context found for session ${sessionId}`);
      }

      // Prepare system prompt with context
      const systemPrompt = this.buildSystemPrompt(context);

      // Call OpenAI with function definitions for session plan
      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Create a session plan for: ${prompt}` },
      ];

      const functions: FunctionDefinition[] = [
        {
          name: "createSessionPlan",
          description: "Create a detailed D&D session plan",
          parameters: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "A compelling title for the session",
              },
              summary: {
                type: "string",
                description:
                  "A brief summary of what will happen in this session",
              },
              objectives: {
                type: "array",
                items: { type: "string" },
                description: "List of DM objectives for this session",
              },
              involvedEntities: {
                type: "object",
                properties: {
                  npcs: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        role: { type: "string" },
                      },
                    },
                  },
                  locations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        significance: { type: "string" },
                      },
                    },
                  },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        purpose: { type: "string" },
                      },
                    },
                  },
                  factions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        involvement: { type: "string" },
                      },
                    },
                  },
                },
              },
              storyBeats: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    description: { type: "string" },
                    type: {
                      type: "string",
                      enum: ["scene", "combat", "roleplay", "exploration"],
                    },
                    expectedDuration: { type: "number" },
                    branches: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          condition: { type: "string" },
                          outcome: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
              tags: {
                type: "array",
                items: { type: "string" },
              },
              difficulty: {
                type: "string",
                enum: ["easy", "medium", "hard"],
              },
              estimatedDuration: { type: "number" },
            },
            required: ["title", "summary", "objectives", "storyBeats"],
          },
        },
      ];

      const response = await openAIService.getChatCompletion(
        messages,
        functions,
        sessionId
      );

      if (
        response.function_call &&
        response.function_call.name === "createSessionPlan"
      ) {
        const planData = JSON.parse(response.function_call.arguments);

        // Add missing properties and IDs
        const sessionPlan: SessionPlan = {
          id: uuidv4(),
          campaignId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...planData,
          // Add IDs to story beats
          storyBeats: planData.storyBeats.map((beat: any) => ({
            ...beat,
            id: uuidv4(),
          })),
        };

        // Store the session plan in Supabase
        // TODO: Implement actual storage in Supabase

        return sessionPlan;
      }

      throw new Error("Failed to generate session plan");
    } catch (error) {
      console.error("Error generating session plan:", error);
      throw error;
    }
  }

  // Update an existing session plan
  async updateSessionPlan(
    sessionId: string,
    planId: string,
    updates: Partial<SessionPlan>
  ): Promise<SessionPlan> {
    try {
      // TODO: Implement actual update in Supabase

      // For now, return a mock response
      return {
        ...updates,
        id: planId,
        updatedAt: new Date().toISOString(),
      } as SessionPlan;
    } catch (error) {
      console.error("Error updating session plan:", error);
      throw error;
    }
  }

  // Pin an entity to the planning context
  pinEntity(sessionId: string, entityId: string): void {
    const context = this.planningContexts.get(sessionId);
    if (context) {
      context.pinnedEntities.add(entityId);
    }
  }

  // Unpin an entity from the planning context
  unpinEntity(sessionId: string, entityId: string): void {
    const context = this.planningContexts.get(sessionId);
    if (context) {
      context.pinnedEntities.delete(entityId);
    }
  }

  // Add a filter to the planning context
  addFilter(sessionId: string, filter: string): void {
    const context = this.planningContexts.get(sessionId);
    if (context) {
      context.activeFilters.add(filter);
    }
  }

  // Remove a filter from the planning context
  removeFilter(sessionId: string, filter: string): void {
    const context = this.planningContexts.get(sessionId);
    if (context) {
      context.activeFilters.delete(filter);
    }
  }

  // Helper method to build system prompt with context
  private buildSystemPrompt(context: SessionPlanningContext): string {
    const pinnedEntitiesData: EntityReference[] = [];

    // Add pinned NPCs
    for (const entityId of context.pinnedEntities) {
      const npc = context.referencedEntities.npcs.get(entityId);
      if (npc) pinnedEntitiesData.push(npc);

      const location = context.referencedEntities.locations.get(entityId);
      if (location) pinnedEntitiesData.push(location);

      const item = context.referencedEntities.items.get(entityId);
      if (item) pinnedEntitiesData.push(item);

      const faction = context.referencedEntities.factions.get(entityId);
      if (faction) pinnedEntitiesData.push(faction);
    }

    return `
      You are an expert Dungeons & Dragons session planning assistant.
      You help Dungeon Masters plan gameplay sessions by providing creative ideas,
      structured outlines, and narrative guidance.
      
      Your responses should be tailored to D&D 5th Edition rules and conventions.
      Focus on creating dramatic, engaging, and balanced encounters that challenge
      players while advancing the story.
      
      ${
        pinnedEntitiesData.length > 0
          ? `Incorporate these specific entities into your suggestions:
           ${JSON.stringify(pinnedEntitiesData, null, 2)}`
          : "No specific entities have been pinned yet. Provide general session planning advice."
      }
      
      ${
        context.activeFilters.size > 0
          ? `Current active filters: ${Array.from(context.activeFilters).join(
              ", "
            )}`
          : "No filters are currently active."
      }
      
      When referencing NPCs, locations, items, or factions, explicitly mention them
      by name so they can be highlighted in the interface.
    `;
  }
}

export const sessionPlanningService = SessionPlanningService.getInstance();
