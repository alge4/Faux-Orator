import OpenAI from "openai";
import env from "../config/env";
import { logAgentAction } from "./supabase";

// Initialize OpenAI with our API key from the env config
const openai = new OpenAI({
  apiKey: env.openai.apiKey,
  dangerouslyAllowBrowser: true, // Note: In production, proxy through backend
});

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

class OpenAIService {
  private static instance: OpenAIService;
  private context: Map<string, ChatMessage[]> = new Map();

  private constructor() {}

  static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  async getChatCompletion(
    messages: ChatMessage[],
    functions?: FunctionDefinition[],
    sessionId?: string,
    campaignId?: string
  ): Promise<ChatMessage> {
    try {
      // Start tracking usage for logging purposes
      const startTime = Date.now();
      let tokenUsage = { prompt: 0, completion: 0, total: 0 };

      const completion = await openai.chat.completions.create({
        model: env.openai.defaultModel,
        messages: this.getContextualMessages(messages, sessionId),
        functions: functions,
        temperature: 0.7,
      });

      // Calculate token usage if available
      if (completion.usage) {
        tokenUsage = {
          prompt: completion.usage.prompt_tokens,
          completion: completion.usage.completion_tokens,
          total: completion.usage.total_tokens,
        };
      }

      const response = completion.choices[0].message;

      // Update context if sessionId is provided
      if (sessionId) {
        this.updateContext(sessionId, messages, response as ChatMessage);
      }

      // Log this API call if we have a campaign ID
      if (campaignId) {
        await this.logOpenAIUsage(
          campaignId,
          sessionId || null,
          messages,
          response as ChatMessage,
          tokenUsage,
          Date.now() - startTime
        );
      }

      return response as ChatMessage;
    } catch (error) {
      console.error("Error in OpenAI chat completion:", error);
      throw error;
    }
  }

  private getContextualMessages(
    messages: ChatMessage[],
    sessionId?: string
  ): ChatMessage[] {
    if (!sessionId) return messages;

    const contextMessages = this.context.get(sessionId) || [];
    return [...contextMessages, ...messages];
  }

  private updateContext(
    sessionId: string,
    newMessages: ChatMessage[],
    response: ChatMessage
  ) {
    const currentContext = this.context.get(sessionId) || [];
    const updatedContext = [...currentContext, ...newMessages, response];

    // Keep only last N messages to prevent context from growing too large
    const maxContextLength = 10;
    this.context.set(sessionId, updatedContext.slice(-maxContextLength));
  }

  clearContext(sessionId: string) {
    this.context.delete(sessionId);
  }

  private async logOpenAIUsage(
    campaignId: string,
    sessionId: string | null,
    input: ChatMessage[],
    output: ChatMessage,
    tokenUsage: { prompt: number; completion: number; total: number },
    durationMs: number
  ) {
    try {
      await logAgentAction(
        campaignId,
        sessionId,
        "openai",
        "chat_completion",
        {
          messages: input,
          model: env.openai.defaultModel,
          durationMs,
          tokenUsage,
        },
        output
      );
    } catch (error) {
      console.error("Error logging OpenAI usage:", error);
      // Non-critical error, so we don't throw here
    }
  }
}

export const openAIService = OpenAIService.getInstance();
