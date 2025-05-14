import { BaseAgent, AgentContext, AgentResponse } from "./BaseAgent";
import { claudeService, ClaudeMessage, SystemPrompt } from "../services/claude";
import { supabase } from "../services/supabase";
import { v4 as uuidv4 } from "uuid";

/**
 * Extended agent context with NPC-specific data
 */
export interface NPCAgentContext extends AgentContext {
  npcId: string;
  npcData: any;
}

/**
 * Interface for NPC interaction history
 */
export interface NPCInteraction {
  id?: string;
  npc_id: string;
  speaker_type: "player" | "npc" | "system";
  content: string;
  session_id: string;
  created_at?: string;
  player_id?: string; // Optional: To track which player spoke to the NPC
  emotion?: string; // Optional: To track the emotion of the interaction
  context_note?: string; // Optional: Additional context about the interaction
}

/**
 * IndividualNPCAgent - A specialized agent that represents a single NPC character
 * Each agent maintains its own memory, personality model, and conversation history
 */
export class IndividualNPCAgent extends BaseAgent {
  private npcData: any;
  private memoryLog: NPCInteraction[] = [];
  private personality: string = "";
  private voiceProfile: any = null;
  private statsProfile: any = null;
  private lastInteractionTime: Date = new Date();

  constructor(context: NPCAgentContext) {
    super(context as AgentContext);
    this.npcData = context.npcData;
  }

  /**
   * Initialize the NPC agent with data from the database
   */
  async initialize(): Promise<void> {
    // Load NPC conversation history
    const { data: history, error } = await supabase
      .from("npc_interactions")
      .select("*")
      .eq("npc_id", this.npcData.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error(`Failed to load NPC interaction history: ${error.message}`);
    } else {
      this.memoryLog = history || [];
    }

    // Generate personality profile from NPC data
    this.personality = this.generatePersonalityProfile();

    // Load voice profile if available
    if (this.npcData.voice_profile_id) {
      await this.loadVoiceProfile(this.npcData.voice_profile_id);
    }

    // Process stats if available
    if (this.npcData.stat_block) {
      this.statsProfile = this.npcData.stat_block;
    }

    // Log initialization
    await this.logAction("initialize", {
      npcId: this.npcData.id,
      npcName: this.npcData.name,
    });
  }

  /**
   * Generate a rich personality profile from the NPC data
   */
  private generatePersonalityProfile(): string {
    // Creates a rich profile from all available NPC data
    const profile = [
      `Name: ${this.npcData.name}`,
      `Description: ${this.npcData.description || "No description available."}`,
      `Personality traits: ${
        this.npcData.personality || "No personality traits defined."
      }`,
      `Goals: ${this.npcData.goals || "No specific goals defined."}`,
      `Secrets: ${this.npcData.secrets || "No secrets defined."}`,
      `Background: ${
        this.npcData.history || "No background information available."
      }`,
      `Appearance: ${
        this.npcData.appearance || "No appearance details available."
      }`,
    ];

    // Add faction information if available
    if (this.npcData.factions) {
      profile.push(`Faction: ${this.npcData.factions.name || "No faction"}`);
      profile.push(
        `Faction details: ${
          this.npcData.factions.description || "No faction details available."
        }`
      );
    }

    // Add location information if available
    if (this.npcData.locations) {
      profile.push(
        `Current location: ${this.npcData.locations.name || "Unknown location"}`
      );
      profile.push(
        `Location details: ${
          this.npcData.locations.description || "No location details available."
        }`
      );
    }

    // Add additional details if available
    if (this.npcData.tags && this.npcData.tags.length > 0) {
      profile.push(`Tags: ${this.npcData.tags.join(", ")}`);
    }

    if (this.npcData.status) {
      profile.push(`Current status: ${this.npcData.status}`);
    }

    return profile.join("\n");
  }

  /**
   * Load voice profile for text-to-speech conversion
   */
  private async loadVoiceProfile(voiceProfileId: string): Promise<void> {
    const { data, error } = await supabase
      .from("voice_profiles")
      .select("*")
      .eq("id", voiceProfileId)
      .single();

    if (error) {
      console.error(`Failed to load voice profile: ${error.message}`);
    } else {
      this.voiceProfile = data;
    }
  }

  /**
   * Main method to process voice input from a player and generate a response
   * @param input The transcribed text input from the player
   * @param contextNote Optional additional context about the current situation
   */
  async respondToVoiceInput(
    input: string,
    contextNote?: string
  ): Promise<AgentResponse> {
    try {
      // Create system prompt that captures this NPC's essence
      const systemPrompt: SystemPrompt = {
        content: this.createCharacterPrompt(contextNote),
      };

      // Record the player's interaction
      const playerInteraction: NPCInteraction = {
        npc_id: this.npcData.id,
        speaker_type: "player",
        content: input,
        session_id: this.context.sessionId,
        created_at: new Date().toISOString(),
        context_note: contextNote,
      };

      // Add to memory log
      this.memoryLog.unshift(playerInteraction);

      // Save to database
      await this.saveInteraction(playerInteraction);

      // Convert relevant memory log to messages for Claude
      const recentMemory = this.formatRecentInteractions();

      // Add current input as the most recent message
      const messages: ClaudeMessage[] = [
        ...recentMemory,
        { role: "user", content: input },
      ];

      // Get response using Claude
      const response = await claudeService.getChatCompletion(
        messages,
        systemPrompt,
        this.context.sessionId,
        this.context.campaignId
      );

      const responseContent =
        response.content || "I'm not sure how to respond to that.";

      // Store NPC's response in memory log and database
      const npcResponse: NPCInteraction = {
        npc_id: this.npcData.id,
        speaker_type: "npc",
        content: responseContent,
        session_id: this.context.sessionId,
        created_at: new Date().toISOString(),
        context_note: contextNote,
      };

      this.memoryLog.unshift(npcResponse);
      await this.saveInteraction(npcResponse);

      // Update last interaction time
      this.lastInteractionTime = new Date();

      // Log the interaction
      await this.logAction("npc_response", {
        npcId: this.npcData.id,
        npcName: this.npcData.name,
        input,
        response: responseContent,
      });

      return {
        success: true,
        message: "NPC response generated",
        data: {
          content: responseContent,
          npcId: this.npcData.id,
          npcName: this.npcData.name,
          voiceProfile: this.voiceProfile,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Creates a detailed character prompt for Claude to roleplay as the NPC
   */
  private createCharacterPrompt(contextNote?: string): string {
    return `You are roleplaying as ${
      this.npcData.name
    }, an NPC in a D&D campaign.
    
${this.personality}

Current context: ${
      contextNote || "Normal conversation with a player character."
    }

Important guidelines:
1. Always respond IN CHARACTER as ${this.npcData.name}
2. Never break character or refer to yourself as an AI
3. Your knowledge is limited to what ${this.npcData.name} would know
4. Use speech patterns, vocabulary and mannerisms authentic to this character
5. Remember the character's goals and motivations in all responses
6. Keep responses conversational and concise (1-3 sentences is ideal)
7. Include subtle emotions, gestures, or expressions in [square brackets] when appropriate
8. Respond directly to the player's input, making appropriate references to the conversation history

You are in a voice conversation, so your responses should sound natural when spoken aloud.`;
  }

  /**
   * Format recent interactions for use in the conversation context
   */
  private formatRecentInteractions(): ClaudeMessage[] {
    // Get the 5 most recent interactions (excluding the current one)
    const recentInteractions = this.memoryLog.slice(0, 5);

    // Convert to Claude message format
    return recentInteractions.map((interaction) => ({
      role: interaction.speaker_type === "npc" ? "assistant" : "user",
      content: interaction.content,
    }));
  }

  /**
   * Save an interaction to the database
   */
  private async saveInteraction(interaction: NPCInteraction): Promise<void> {
    try {
      // Ensure we have an ID
      if (!interaction.id) {
        interaction.id = uuidv4();
      }

      const { error } = await supabase
        .from("npc_interactions")
        .insert(interaction);

      if (error) {
        console.error(`Failed to save interaction: ${error.message}`);
      }
    } catch (error) {
      console.error("Error saving NPC interaction:", error);
    }
  }

  /**
   * Get the NPC data
   */
  getNPCData(): any {
    return this.npcData;
  }

  /**
   * Get the NPC's voice profile
   */
  getVoiceProfile(): any {
    return this.voiceProfile;
  }

  /**
   * Get the last time this NPC had an interaction
   */
  getLastInteractionTime(): Date {
    return this.lastInteractionTime;
  }

  /**
   * Update the NPC's data (e.g., when the NPC moves location)
   */
  async updateNPCData(updates: any): Promise<void> {
    try {
      const { error } = await supabase
        .from("npcs")
        .update(updates)
        .eq("id", this.npcData.id);

      if (error) {
        throw new Error(`Failed to update NPC data: ${error.message}`);
      }

      // Update the local NPC data
      this.npcData = {
        ...this.npcData,
        ...updates,
      };

      // Regenerate personality profile
      this.personality = this.generatePersonalityProfile();

      // Log the update
      await this.logAction("update_npc_data", {
        npcId: this.npcData.id,
        updates,
      });
    } catch (error) {
      console.error("Error updating NPC data:", error);
      throw error;
    }
  }
}
