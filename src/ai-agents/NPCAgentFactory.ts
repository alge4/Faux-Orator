import { BaseAgent, AgentContext } from "./BaseAgent";
import { supabase } from "../services/supabase";
import { IndividualNPCAgent } from "./IndividualNPCAgent";
import { NPC } from "../types/database.types";

export interface NPCAgentFactoryOptions {
  maxConcurrentAgents?: number;
  enableLogging?: boolean;
}

/**
 * Factory class that creates and manages individual NPC agents
 * Dynamically instantiates specialized agents for each NPC from database
 */
export class NPCAgentFactory {
  private activeNPCAgents: Map<string, IndividualNPCAgent> = new Map();
  private context: AgentContext;
  private options: NPCAgentFactoryOptions;

  constructor(context: AgentContext, options: NPCAgentFactoryOptions = {}) {
    this.context = context;
    this.options = {
      maxConcurrentAgents: options.maxConcurrentAgents || 5,
      enableLogging: options.enableLogging || true,
    };
  }

  /**
   * Creates or retrieves an individual NPC agent for the specified NPC
   * @param npcId The ID of the NPC to create an agent for
   * @returns A specialized agent instance for this NPC
   */
  async createNPCAgent(npcId: string): Promise<IndividualNPCAgent> {
    // If agent already exists, return it
    if (this.activeNPCAgents.has(npcId)) {
      return this.activeNPCAgents.get(npcId)!;
    }

    // Enforce concurrent agent limit
    if (this.activeNPCAgents.size >= this.options.maxConcurrentAgents) {
      this.releaseOldestAgent();
    }

    // Fetch NPC data from database
    const { data: npc, error } = await supabase
      .from("npcs")
      .select(
        `
        *,
        locations (id, name, description),
        factions (id, name, description)
      `
      )
      .eq("id", npcId)
      .single();

    if (error) throw new Error(`Failed to load NPC data: ${error.message}`);
    if (!npc) throw new Error(`NPC with ID ${npcId} not found`);

    // Create NPC-specific context by extending the base context
    const npcContext: any = {
      ...this.context,
      npcId: npc.id,
      npcData: npc,
    };

    // Instantiate new agent with NPC-specific context
    const npcAgent = new IndividualNPCAgent(npcContext);

    // Initialize agent with NPC memory and history
    await npcAgent.initialize();

    // Store for future reference
    this.activeNPCAgents.set(npcId, npcAgent);

    if (this.options.enableLogging) {
      console.log(`NPC Agent created for ${npc.name} (${npcId})`);
    }

    return npcAgent;
  }

  /**
   * Gets a list of all currently active NPC agents
   */
  getActiveNPCAgents(): Map<string, IndividualNPCAgent> {
    return this.activeNPCAgents;
  }

  /**
   * Get the count of currently active NPC agents
   */
  getActiveAgentCount(): number {
    return this.activeNPCAgents.size;
  }

  /**
   * Release a specific NPC agent
   * @param npcId The ID of the NPC agent to release
   */
  releaseAgent(npcId: string): boolean {
    if (this.activeNPCAgents.has(npcId)) {
      this.activeNPCAgents.delete(npcId);
      return true;
    }
    return false;
  }

  /**
   * Release the oldest agent when we hit the concurrent limit
   */
  private releaseOldestAgent(): void {
    // Simple implementation - just remove the first entry
    // In a more sophisticated version, you might track last used timestamp
    if (this.activeNPCAgents.size > 0) {
      const oldestKey = this.activeNPCAgents.keys().next().value;
      this.activeNPCAgents.delete(oldestKey);

      if (this.options.enableLogging) {
        console.log(
          `Released oldest NPC agent (${oldestKey}) due to concurrent limit`
        );
      }
    }
  }

  /**
   * Release all active NPC agents
   */
  releaseAllAgents(): void {
    this.activeNPCAgents.clear();

    if (this.options.enableLogging) {
      console.log("All NPC agents released");
    }
  }
}
