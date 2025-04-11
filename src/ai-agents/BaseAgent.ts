import { supabase, logAgentAction } from "../services/supabase";
import { AIProvider } from "../services/aiService";

export interface AgentContext {
  sessionId: string;
  campaignId: string;
  userId: string;
  timestamp: string;
}

export interface AgentResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface AgentOptions {
  aiProvider?: AIProvider;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export abstract class BaseAgent {
  protected context: AgentContext;
  protected options: AgentOptions;

  constructor(context: AgentContext, options: AgentOptions = {}) {
    this.context = context;
    this.options = {
      aiProvider: "auto",
      temperature: 0.7,
      maxTokens: undefined,
      model: undefined,
      ...options,
    };
  }

  // Method to be implemented by specific agents
  abstract process(input: any): Promise<AgentResponse>;

  // Method to update AI provider preference
  setAIProvider(provider: AIProvider): void {
    this.options.aiProvider = provider;
  }

  // Get current AI provider setting
  getAIProvider(): AIProvider {
    return this.options.aiProvider || "auto";
  }

  // Common method to update state in Supabase
  protected async updateStateInDatabase(params: {
    tableId: string;
    data: any;
    id?: string;
  }): Promise<any> {
    const { tableId, data, id } = params;

    try {
      if (id) {
        // Update existing record
        const { data: result, error } = await supabase
          .from(tableId)
          .update(data)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;
        return result;
      } else {
        // Insert new record
        const { data: result, error } = await supabase
          .from(tableId)
          .insert({ ...data, campaign_id: this.context.campaignId })
          .select()
          .single();

        if (error) throw error;
        return result;
      }
    } catch (error) {
      console.error(`Error updating database in ${tableId}:`, error);
      throw error;
    }
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

  // Method to validate input
  protected validateInput(input: any): boolean {
    return input !== null && input !== undefined;
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
