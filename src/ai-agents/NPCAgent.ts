import { BaseAgent, AgentContext, AgentResponse } from "./BaseAgent";
import { supabase } from "../services/supabase";
import { openAIService } from "../services/openai";
import { Database } from "../types/database.types";

// Type for NPC data
export type NPC = Database["public"]["Tables"]["npcs"]["Row"];

// Interface for NPC agent input
export interface NPCAgentInput {
  npcId: string;
  playerMessage: string;
  messageHistory?: NPCChatMessage[];
  currentContext?: string;
}

// Interface for NPC chat messages
export interface NPCChatMessage {
  role: "player" | "npc" | "system";
  content: string;
  timestamp: string;
}

interface NPCData {
  id: string;
  name: string;
  description: string;
  personality: string;
  goals: string[];
  relationships: Record<string, string>;
  location: string;
  faction?: string;
  stats?: Record<string, number>;
  inventory?: string[];
}

// NPC Agent class
export class NPCAgent extends BaseAgent {
  private npcs: Map<string, NPCData>;
  private npc: NPC | null = null;
  private messageHistory: NPCChatMessage[] = [];

  constructor(context: AgentContext) {
    super(context);
    this.npcs = new Map();
  }

  // Process the input to generate a response
  async process(input: any): Promise<AgentResponse> {
    try {
      switch (input.type) {
        case "create":
          return await this.createNPC(input.data);
        case "update":
          return await this.updateNPC(input.id, input.data);
        case "query":
          return await this.queryNPC(input.query);
        case "interact":
          return await this.simulateInteraction(
            input.npcId,
            input.playerAction
          );
        case "brainstorm":
          return await this.brainstormNPCs(input.topic);
        default:
          throw new Error(`Unknown input type: ${input.type}`);
      }
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async createNPC(data: Partial<NPCData>): Promise<AgentResponse> {
    try {
      const { data: npc, error } = await supabase
        .from("npcs")
        .insert([
          {
            ...data,
            campaign_id: this.context.campaignId,
            created_by: this.context.userId,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      this.npcs.set(npc.id, npc);

      return {
        success: true,
        message: `Created NPC: ${npc.name}`,
        data: npc,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async updateNPC(
    id: string,
    updates: Partial<NPCData>
  ): Promise<AgentResponse> {
    try {
      const { data: npc, error } = await supabase
        .from("npcs")
        .update(updates)
        .eq("id", id)
        .eq("campaign_id", this.context.campaignId)
        .select()
        .single();

      if (error) throw error;

      this.npcs.set(id, { ...this.npcs.get(id), ...updates });

      return {
        success: true,
        message: `Updated NPC: ${npc.name}`,
        data: npc,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async queryNPC(query: string): Promise<AgentResponse> {
    try {
      const { data: npcs, error } = await supabase
        .from("npcs")
        .select("*")
        .eq("campaign_id", this.context.campaignId)
        .textSearch("description", query);

      if (error) throw error;

      return {
        success: true,
        message: `Found ${npcs.length} NPCs matching query: ${query}`,
        data: npcs,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async simulateInteraction(
    npcId: string,
    playerAction: string
  ): Promise<AgentResponse> {
    try {
      const npc = this.npcs.get(npcId);
      if (!npc) {
        throw new Error(`NPC with ID ${npcId} not found`);
      }

      // Here we would integrate with the AI model to generate appropriate responses
      // based on the NPC's personality, goals, and the player's action
      const response = await this.generateNPCResponse(npc, playerAction);

      return {
        success: true,
        message: response,
        data: { npcId, response },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async brainstormNPCs(topic: string): Promise<AgentResponse> {
    try {
      // Here we would integrate with the AI model to generate NPC ideas
      // based on the campaign context and topic
      const ideas = await this.generateNPCIdeas(topic);

      return {
        success: true,
        message: `Generated NPC ideas for topic: ${topic}`,
        data: ideas,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async generateNPCResponse(
    npc: NPCData,
    playerAction: string
  ): Promise<string> {
    // This would be implemented with the chosen AI model (OpenAI or Claude)
    // For now, return a placeholder
    return `${npc.name} responds to ${playerAction} based on their personality: ${npc.personality}`;
  }

  private async generateNPCIdeas(topic: string): Promise<Partial<NPCData>[]> {
    // This would be implemented with the chosen AI model (OpenAI or Claude)
    // For now, return a placeholder
    return [
      {
        name: "Example NPC",
        description: `An NPC related to ${topic}`,
        personality: "Generated personality traits",
        goals: ["Generated goal 1", "Generated goal 2"],
      },
    ];
  }

  // Load NPC data from the database
  private async loadNPC(npcId: string): Promise<void> {
    const { data, error } = await supabase
      .from("npcs")
      .select("*")
      .eq("id", npcId)
      .single();

    if (error) {
      throw new Error(`Failed to load NPC data: ${error.message}`);
    }

    if (!data) {
      throw new Error(`NPC with ID ${npcId} not found`);
    }

    this.npc = data;
  }

  // Generate a response from the NPC based on player input
  private async generateNPCResponse(
    playerMessage: string,
    currentContext?: string
  ): Promise<string> {
    if (!this.npc) {
      throw new Error("NPC data not loaded");
    }

    // Create system prompt for the NPC
    const systemPrompt = this.createNPCPrompt(currentContext);

    // Format message history for OpenAI
    const messages = [
      { role: "system", content: systemPrompt },
      ...this.formatMessageHistory(),
      { role: "user", content: playerMessage },
    ];

    // Get completion from OpenAI
    const response = await openAIService.getChatCompletion(
      messages,
      undefined,
      this.context.sessionId,
      this.context.campaignId
    );

    return (
      response.content ||
      "I apologize, but I'm unable to generate a response at the moment."
    );
  }

  // Create a system prompt for the NPC based on their characteristics
  private createNPCPrompt(currentContext?: string): string {
    if (!this.npc) return "";

    return `You are role-playing as ${this.npc.name}, a ${
      this.npc.type || "character"
    } in a D&D campaign.

Character Information:
${this.npc.description ? `Description: ${this.npc.description}` : ""}
${this.npc.personality ? `Personality: ${this.npc.personality}` : ""}
${this.npc.goals ? `Goals: ${this.npc.goals}` : ""}
${this.npc.secrets ? `Secrets (known only to you): ${this.npc.secrets}` : ""}
${this.npc.appearance ? `Appearance: ${this.npc.appearance}` : ""}
${this.npc.history ? `Background: ${this.npc.history}` : ""}
${
  this.npc.current_location
    ? `Current location: ${this.npc.current_location}`
    : ""
}
${this.npc.status ? `Current status: ${this.npc.status}` : ""}

Current context: ${currentContext || "No specific context provided."}

Guidelines:
1. Stay in character at all times.
2. Respond as ${
      this.npc.name
    } would, reflecting their personality, goals, and knowledge.
3. Only reveal secrets if narratively appropriate.
4. If the character wouldn't know something, they shouldn't mention it.
5. Keep responses concise and conversational.
6. Include appropriate emotions, mannerisms, or actions in *asterisks* when relevant.
7. You may reference past interactions that are in the message history.`;
  }

  // Format message history for OpenAI
  private formatMessageHistory(): { role: string; content: string }[] {
    return this.messageHistory.map((msg) => ({
      role:
        msg.role === "player"
          ? "user"
          : msg.role === "npc"
          ? "assistant"
          : "system",
      content: msg.content,
    }));
  }

  // Validate the input
  protected validateInput(input: NPCAgentInput): void {
    if (!input.npcId) {
      throw new Error("NPC ID is required");
    }

    if (!input.playerMessage) {
      throw new Error("Player message is required");
    }
  }
}
