import { supabase, logAgentAction } from "../services/supabase";
import { AIProvider } from "../services/aiService";
import { SupabaseMemoryManager } from "../services/memoryManager";
import { AgentMemory, MemoryType } from "../types/memory";

export interface AgentContext {
  sessionId: string;
  campaignId: string;
  userId: string;
  timestamp: string;
}

export interface AgentOptions {
  aiProvider?: AIProvider;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  memoryRetentionDays?: number;
}

export interface AgentResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

export abstract class BaseAgent {
  protected context: AgentContext;
  protected options: AgentOptions;
  protected memoryManager: SupabaseMemoryManager;

  constructor(context: AgentContext, options: AgentOptions = {}) {
    this.context = context;
    this.options = {
      aiProvider: "auto",
      temperature: 0.7,
      maxTokens: undefined,
      model: undefined,
      memoryRetentionDays: 30,
      ...options,
    };
    this.memoryManager = new SupabaseMemoryManager();
  }

  // Method to be implemented by specific agents
  abstract process(input: any): Promise<AgentResponse>;

  // Method to update AI provider preference
  setAIProvider(provider: AIProvider): void {
    this.options.aiProvider = provider;
  }

  // Method to update state in the database
  protected async updateStateInDatabase({
    tableId,
    data,
    id = null,
    idField = "id",
  }: {
    tableId: string;
    data: any;
    id?: string | null;
    idField?: string;
  }): Promise<any> {
    try {
      // If ID is provided, update the record, otherwise insert
      if (id) {
        const { data: result, error } = await supabase
          .from(tableId)
          .update(data)
          .eq(idField, id)
          .select()
          .single();

        if (error) throw error;
        return result;
      } else {
        // For new records
        const { data: result, error } = await supabase
          .from(tableId)
          .insert(data)
          .select()
          .single();

        if (error) throw error;
        return result;
      }
    } catch (error) {
      console.error(`Error updating state in database (${tableId}):`, error);
      throw error;
    }
  }

  // Memory management methods
  protected async storeMemory(
    type: MemoryType,
    data: Record<string, any>,
    relatedEntities: string[] = [],
    importanceScore: number = 1,
    expiresAt?: Date
  ): Promise<string> {
    return this.memoryManager.store({
      agent_id: this.constructor.name,
      campaign_id: this.context.campaignId,
      memory_type: type,
      context: {
        session_id: this.context.sessionId,
        related_entities: relatedEntities,
        importance_score: importanceScore,
        data,
      },
      expires_at: expiresAt?.toISOString(),
      archived: false,
    });
  }

  protected async retrieveMemories(type: MemoryType): Promise<AgentMemory[]> {
    return this.memoryManager.retrieve(this.constructor.name, type);
  }

  protected async pruneOldMemories(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.options.memoryRetentionDays);
    await this.memoryManager.prune(this.context.campaignId, cutoffDate);
  }

  // Common method to log agent actions
  protected async logAction(action: string, details: any): Promise<void> {
    // Log to console
    console.log(`Agent Action [${this.constructor.name}]:`, {
      action,
      details,
      context: this.context,
      timestamp: new Date().toISOString(),
    });

    // Log to database
    try {
      await logAgentAction(
        this.context.campaignId,
        this.context.sessionId,
        this.constructor.name,
        action,
        details,
        null // Output will be set later
      );
    } catch (error) {
      console.error(`Error logging agent action to database:`, error);
      // Non-critical, so don't throw
    }
  }

  // Method to handle errors
  protected handleError(error: Error): AgentResponse {
    console.error(`Agent Error [${this.constructor.name}]:`, error);

    // Log the error to the database
    try {
      logAgentAction(
        this.context.campaignId,
        this.context.sessionId,
        this.constructor.name,
        "error",
        {
          message: error.message,
          stack: error.stack,
        },
        null
      ).catch((e) => console.error("Error logging agent error:", e));
    } catch (logError) {
      console.error("Failed to log error to database:", logError);
    }

    return {
      success: false,
      message: "Agent encountered an error",
      error: error.message,
    };
  }
}
