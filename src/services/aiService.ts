import OpenAI from "openai";
import { Anthropic } from "@anthropic-ai/sdk";
import env from "../config/env";
import { logAgentAction } from "./supabase";

// Initialize API clients
const openai = env.openai.apiKey
  ? new OpenAI({
      apiKey: env.openai.apiKey,
      dangerouslyAllowBrowser: true, // Note: In production, proxy through backend
    })
  : null;

const anthropic = env.claude.apiKey
  ? new Anthropic({
      apiKey: env.claude.apiKey,
    })
  : null;

export type AIProvider = "openai" | "claude" | "auto";

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

class AIService {
  private static instance: AIService;
  private contexts: Map<
    string,
    {
      messages: ChatMessage[];
      provider: AIProvider;
    }
  > = new Map();
  private preferredProvider: AIProvider = "auto";

  private constructor() {
    // Determine default provider based on available API keys
    if (env.claude.apiKey) {
      this.preferredProvider = "claude";
    } else if (env.openai.apiKey) {
      this.preferredProvider = "openai";
    }
  }

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Get chat completion from the selected or available AI provider
   */
  async getChatCompletion(
    messages: ChatMessage[],
    options?: {
      provider?: AIProvider;
      functions?: FunctionDefinition[];
      sessionId?: string;
      campaignId?: string;
      temperature?: number;
      maxTokens?: number;
      model?: string;
    }
  ): Promise<ChatMessage> {
    const provider = this.determineProvider(options?.provider);

    try {
      // Start tracking usage for logging purposes
      const startTime = Date.now();
      let tokenUsage = { prompt: 0, completion: 0, total: 0 };

      // Get contextual messages if sessionId is provided
      const contextualMessages = this.getContextualMessages(
        messages,
        options?.sessionId,
        provider
      );

      let response: ChatMessage;

      if (provider === "claude") {
        response = await this.callClaude(contextualMessages, {
          temperature: options?.temperature,
          maxTokens: options?.maxTokens,
          model: options?.model,
        });
      } else {
        response = await this.callOpenAI(contextualMessages, {
          functions: options?.functions,
          temperature: options?.temperature,
          maxTokens: options?.maxTokens,
          model: options?.model,
        });
      }

      // Calculate token usage if available (will be different for each provider)
      // This is simplified; in practice, you'd track this differently per provider

      // Update context if sessionId is provided
      if (options?.sessionId) {
        this.updateContext(
          options.sessionId,
          contextualMessages,
          response,
          provider
        );
      }

      // Log this API call if we have a campaign ID
      if (options?.campaignId) {
        await this.logAIUsage(
          options.campaignId,
          options.sessionId || null,
          provider,
          contextualMessages,
          response,
          tokenUsage,
          Date.now() - startTime
        );
      }

      return response;
    } catch (error) {
      console.error(`Error in ${provider} chat completion:`, error);
      throw error;
    }
  }

  /**
   * Set the preferred AI provider
   */
  setPreferredProvider(provider: AIProvider) {
    this.preferredProvider = provider;
  }

  /**
   * Get the current preferred AI provider
   */
  getPreferredProvider(): AIProvider {
    return this.preferredProvider;
  }

  /**
   * Determine which provider to use based on preference and availability
   */
  private determineProvider(requested?: AIProvider): AIProvider {
    // Use requested provider if specified
    if (requested && requested !== "auto") {
      // Validate requested provider is available
      if (requested === "claude" && !anthropic) {
        console.warn("Claude API key not configured, falling back to OpenAI");
        return "openai";
      } else if (requested === "openai" && !openai) {
        console.warn("OpenAI API key not configured, falling back to Claude");
        return "claude";
      }
      return requested;
    }

    // Otherwise use preferred provider
    if (this.preferredProvider !== "auto") {
      if (this.preferredProvider === "claude" && anthropic) {
        return "claude";
      } else if (this.preferredProvider === "openai" && openai) {
        return "openai";
      }
    }

    // Auto-select based on availability
    if (anthropic) return "claude";
    if (openai) return "openai";

    throw new Error(
      "No AI provider available. Configure API keys in .env file."
    );
  }

  /**
   * Make a call to Claude API
   */
  private async callClaude(
    messages: ChatMessage[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      model?: string;
    }
  ): Promise<ChatMessage> {
    if (!anthropic) {
      throw new Error("Claude API key not configured");
    }

    // Extract system message if present
    let systemPrompt: string | undefined;
    const claudeMessages = messages
      .filter((msg) => {
        if (msg.role === "system") {
          systemPrompt = msg.content;
          return false;
        }
        return true;
      })
      .map((msg) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      }));

    // Call Claude API
    const response = await anthropic.messages.create({
      model: options?.model || env.claude.defaultModel,
      system: systemPrompt,
      messages: claudeMessages,
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 4096,
    });

    return {
      role: "assistant",
      content: response.content[0].text,
    };
  }

  /**
   * Make a call to OpenAI API
   */
  private async callOpenAI(
    messages: ChatMessage[],
    options?: {
      functions?: FunctionDefinition[];
      temperature?: number;
      maxTokens?: number;
      model?: string;
    }
  ): Promise<ChatMessage> {
    if (!openai) {
      throw new Error("OpenAI API key not configured");
    }

    const completion = await openai.chat.completions.create({
      model: options?.model || env.openai.defaultModel,
      messages: messages,
      functions: options?.functions,
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens,
    });

    return completion.choices[0].message as ChatMessage;
  }

  /**
   * Get contextual messages for a session
   */
  private getContextualMessages(
    messages: ChatMessage[],
    sessionId?: string,
    provider?: AIProvider
  ): ChatMessage[] {
    if (!sessionId) return messages;

    const context = this.contexts.get(sessionId);
    if (!context) return messages;

    // If switching providers, adjust messages accordingly
    if (provider && context.provider !== provider) {
      // Could implement provider-specific context conversion here
      return messages;
    }

    return [...context.messages, ...messages];
  }

  /**
   * Update context for a session
   */
  private updateContext(
    sessionId: string,
    newMessages: ChatMessage[],
    response: ChatMessage,
    provider: AIProvider
  ) {
    const currentContext = this.contexts.get(sessionId);
    const updatedMessages = currentContext
      ? [...currentContext.messages, ...newMessages, response]
      : [...newMessages, response];

    // Keep only last N messages to prevent context from growing too large
    const maxContextLength = 10;
    this.contexts.set(sessionId, {
      messages: updatedMessages.slice(-maxContextLength),
      provider,
    });
  }

  /**
   * Clear context for a session
   */
  clearContext(sessionId: string) {
    this.contexts.delete(sessionId);
  }

  /**
   * Log AI usage
   */
  private async logAIUsage(
    campaignId: string,
    sessionId: string | null,
    provider: string,
    input: ChatMessage[],
    output: ChatMessage,
    tokenUsage: { prompt: number; completion: number; total: number },
    durationMs: number
  ) {
    try {
      await logAgentAction(
        campaignId,
        sessionId,
        provider,
        "chat_completion",
        {
          messages: input,
          model:
            provider === "claude"
              ? env.claude.defaultModel
              : env.openai.defaultModel,
          durationMs,
          tokenUsage,
        },
        output
      );
    } catch (error) {
      console.error(`Error logging ${provider} usage:`, error);
      // Non-critical error, so we don't throw here
    }
  }
}

export const aiService = AIService.getInstance();
