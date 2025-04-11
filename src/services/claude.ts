import env from "../config/env";
import { logAgentAction } from "./supabase";
import { Anthropic } from "@anthropic-ai/sdk";

// Initialize Claude with our API key from the env config
const anthropic = new Anthropic({
  apiKey: env.claude.apiKey,
});

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SystemPrompt {
  content: string;
}

class ClaudeService {
  private static instance: ClaudeService;
  private context: Map<
    string,
    { messages: ClaudeMessage[]; system?: SystemPrompt }
  > = new Map();

  private constructor() {}

  static getInstance(): ClaudeService {
    if (!ClaudeService.instance) {
      ClaudeService.instance = new ClaudeService();
    }
    return ClaudeService.instance;
  }

  async getChatCompletion(
    messages: ClaudeMessage[],
    system?: SystemPrompt,
    sessionId?: string,
    campaignId?: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<ClaudeMessage> {
    try {
      // Start tracking usage for logging purposes
      const startTime = Date.now();

      // Get contextual messages if sessionId is provided
      const contextualData = this.getContextualMessages(
        messages,
        system,
        sessionId
      );

      // Prepare the message for Claude
      const response = await anthropic.messages.create({
        model: options?.model || env.claude.defaultModel,
        system: contextualData.system?.content,
        messages: contextualData.messages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 4096,
      });

      const assistantMessage: ClaudeMessage = {
        role: "assistant",
        content: response.content[0].text,
      };

      // Update context if sessionId is provided
      if (sessionId) {
        this.updateContext(sessionId, messages, assistantMessage, system);
      }

      // Log this API call if we have a campaign ID
      if (campaignId) {
        await this.logClaudeUsage(
          campaignId,
          sessionId || null,
          contextualData.messages,
          contextualData.system,
          assistantMessage,
          {
            inputTokens: response.usage?.input_tokens || 0,
            outputTokens: response.usage?.output_tokens || 0,
            totalTokens:
              (response.usage?.input_tokens || 0) +
              (response.usage?.output_tokens || 0),
          },
          Date.now() - startTime
        );
      }

      return assistantMessage;
    } catch (error) {
      console.error("Error in Claude chat completion:", error);
      throw error;
    }
  }

  private getContextualMessages(
    messages: ClaudeMessage[],
    system?: SystemPrompt,
    sessionId?: string
  ): { messages: ClaudeMessage[]; system?: SystemPrompt } {
    if (!sessionId) return { messages, system };

    const contextData = this.context.get(sessionId);
    if (!contextData) return { messages, system };

    return {
      messages: [...contextData.messages, ...messages],
      system: system || contextData.system,
    };
  }

  private updateContext(
    sessionId: string,
    newMessages: ClaudeMessage[],
    response: ClaudeMessage,
    system?: SystemPrompt
  ) {
    const currentContext = this.context.get(sessionId) || { messages: [] };
    const updatedMessages = [
      ...currentContext.messages,
      ...newMessages,
      response,
    ];

    // Keep only last N messages to prevent context from growing too large
    const maxContextLength = 10;
    this.context.set(sessionId, {
      messages: updatedMessages.slice(-maxContextLength),
      system: system || currentContext.system,
    });
  }

  clearContext(sessionId: string) {
    this.context.delete(sessionId);
  }

  private async logClaudeUsage(
    campaignId: string,
    sessionId: string | null,
    input: ClaudeMessage[],
    system: SystemPrompt | undefined,
    output: ClaudeMessage,
    tokenUsage: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    },
    durationMs: number
  ) {
    try {
      await logAgentAction(
        campaignId,
        sessionId,
        "claude",
        "chat_completion",
        {
          messages: input,
          system: system,
          model: env.claude.defaultModel,
          durationMs,
          tokenUsage,
        },
        output
      );
    } catch (error) {
      console.error("Error logging Claude usage:", error);
      // Non-critical error, so we don't throw here
    }
  }
}

export const claudeService = ClaudeService.getInstance();
