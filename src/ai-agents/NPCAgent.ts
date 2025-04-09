import { BaseAgent, AgentContext, AgentResponse } from "./BaseAgent";
import { supabase } from "../services/supabase";
import { getChatCompletion } from "../services/openai";
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

// NPC Agent class
export class NPCAgent extends BaseAgent {
  private npc: NPC | null = null;
  private messageHistory: NPCChatMessage[] = [];

  constructor(context: AgentContext) {
    super(context);
  }

  // Process the input to generate a response
  async process(input: NPCAgentInput): Promise<AgentResponse> {
    try {
      // Validate input
      this.validateInput(input);

      // Load NPC data
      await this.loadNPC(input.npcId);

      // Set message history
      this.messageHistory = input.messageHistory || [];

      // Generate response from NPC
      const npcResponse = await this.generateNPCResponse(
        input.playerMessage,
        input.currentContext
      );

      // Log the interaction
      await this.logAction("npc_conversation", {
        npcId: input.npcId,
        npcName: this.npc?.name,
        playerMessage: input.playerMessage,
        npcResponse,
      });

      // Return successful response
      return {
        success: true,
        message: npcResponse,
        data: {
          npc: this.npc,
          messageHistory: [
            ...this.messageHistory,
            {
              role: "player",
              content: input.playerMessage,
              timestamp: new Date().toISOString(),
            },
            {
              role: "npc",
              content: npcResponse,
              timestamp: new Date().toISOString(),
            },
          ],
        },
      };
    } catch (error) {
      return this.handleError("Error in NPC Agent", error);
    }
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
    const completion = await getChatCompletion({
      messages,
      temperature: 0.7,
      campaignId: this.context.campaignId,
    });

    return (
      completion.choices[0].message.content ||
      "I... (The NPC seems unable to respond)"
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
