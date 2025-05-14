import { BaseAgent, AgentContext, AgentResponse } from "./BaseAgent";
import { claudeService, ClaudeMessage, SystemPrompt } from "../services/claude";

interface ClaudeAgentOptions {
  defaultSystemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export class ClaudeAgent extends BaseAgent {
  private options: ClaudeAgentOptions;

  constructor(context: AgentContext, options: ClaudeAgentOptions = {}) {
    super(context);
    this.options = {
      defaultSystemPrompt:
        options.defaultSystemPrompt ||
        "You are an AI assistant in a tabletop RPG campaign management system. " +
          "Provide concise, helpful responses to user queries. " +
          "Your goal is to enhance the gameplay experience without disrupting the flow.",
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 1000,
      model: options.model || undefined, // Use the default from env config if not specified
    };
  }

  async process(input: any): Promise<AgentResponse> {
    try {
      if (!this.validateInput(input)) {
        throw new Error("Invalid input provided to ClaudeAgent");
      }

      // Log the action
      await this.logAction("process", { input });

      // Handle different input types
      if (typeof input === "string") {
        return await this.handleTextInput(input);
      } else if (typeof input === "object") {
        if (input.type === "chat") {
          return await this.handleChatInput(input);
        } else if (input.type === "creative") {
          return await this.handleCreativeInput(input);
        } else if (input.type === "analyze") {
          return await this.handleAnalysisInput(input);
        }
      }

      throw new Error(`Unsupported input type: ${typeof input}`);
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async handleTextInput(text: string): Promise<AgentResponse> {
    const message: ClaudeMessage = {
      role: "user",
      content: text,
    };

    const systemPrompt: SystemPrompt = {
      content: this.options.defaultSystemPrompt,
    };

    const response = await claudeService.getChatCompletion(
      [message],
      systemPrompt,
      this.context.sessionId,
      this.context.campaignId,
      {
        temperature: this.options.temperature,
        maxTokens: this.options.maxTokens,
        model: this.options.model,
      }
    );

    return {
      success: true,
      message: "Claude response generated successfully",
      data: {
        content: response.content,
        model: this.options.model || "default",
      },
    };
  }

  private async handleChatInput(input: any): Promise<AgentResponse> {
    const { messages, systemPrompt } = input;

    // Validate messages
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("Chat input requires a non-empty messages array");
    }

    // Convert to Claude message format if needed
    const claudeMessages: ClaudeMessage[] = messages.map((msg) => {
      if (typeof msg === "string") {
        return { role: "user", content: msg };
      } else if (msg.role && msg.content) {
        return {
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content,
        };
      }
      throw new Error("Invalid message format in chat input");
    });

    // Prepare system prompt
    const claudeSystemPrompt: SystemPrompt | undefined = systemPrompt
      ? { content: systemPrompt }
      : { content: this.options.defaultSystemPrompt };

    const response = await claudeService.getChatCompletion(
      claudeMessages,
      claudeSystemPrompt,
      this.context.sessionId,
      this.context.campaignId,
      {
        temperature: input.temperature || this.options.temperature,
        maxTokens: input.maxTokens || this.options.maxTokens,
        model: input.model || this.options.model,
      }
    );

    return {
      success: true,
      message: "Claude chat response generated successfully",
      data: {
        content: response.content,
        model: input.model || this.options.model || "default",
      },
    };
  }

  private async handleCreativeInput(input: any): Promise<AgentResponse> {
    const { prompt, creativeType } = input;

    if (!prompt) {
      throw new Error("Creative input requires a prompt");
    }

    let systemPrompt =
      "You are a creative assistant in a tabletop RPG context. ";

    // Adjust system prompt based on creative type
    switch (creativeType) {
      case "character":
        systemPrompt +=
          "Generate creative and detailed character descriptions that are vivid and memorable.";
        break;
      case "location":
        systemPrompt +=
          "Create immersive location descriptions with atmospheric details and points of interest.";
        break;
      case "plot":
        systemPrompt +=
          "Develop engaging plot hooks and story arcs with interesting twists and challenges.";
        break;
      case "item":
        systemPrompt +=
          "Design unique magical items, artifacts, or equipment with interesting properties and history.";
        break;
      default:
        systemPrompt +=
          "Provide creative and inspiring content that enhances the tabletop RPG experience.";
    }

    const message: ClaudeMessage = {
      role: "user",
      content: prompt,
    };

    const response = await claudeService.getChatCompletion(
      [message],
      { content: systemPrompt },
      this.context.sessionId,
      this.context.campaignId,
      {
        // Creative tasks often benefit from slightly higher temperature
        temperature:
          input.temperature || Math.min(this.options.temperature + 0.2, 1.0),
        maxTokens: input.maxTokens || this.options.maxTokens,
        model: input.model || this.options.model,
      }
    );

    return {
      success: true,
      message: `Claude creative content (${
        creativeType || "general"
      }) generated successfully`,
      data: {
        content: response.content,
        creativeType: creativeType || "general",
        model: input.model || this.options.model || "default",
      },
    };
  }

  private async handleAnalysisInput(input: any): Promise<AgentResponse> {
    const { content, analysisType } = input;

    if (!content) {
      throw new Error("Analysis input requires content to analyze");
    }

    let systemPrompt =
      "You are an analytical assistant for tabletop RPG content. ";

    // Adjust system prompt based on analysis type
    switch (analysisType) {
      case "balance":
        systemPrompt +=
          "Analyze game mechanics and elements for balance issues and provide constructive feedback.";
        break;
      case "narrative":
        systemPrompt +=
          "Review narrative elements and provide insights on story structure, pacing, and engagement.";
        break;
      case "character":
        systemPrompt +=
          "Evaluate character concepts for depth, consistency, and role-playing potential.";
        break;
      default:
        systemPrompt +=
          "Provide thoughtful analysis and constructive feedback on tabletop RPG content.";
    }

    const message: ClaudeMessage = {
      role: "user",
      content: `Please analyze the following content:\n\n${content}`,
    };

    const response = await claudeService.getChatCompletion(
      [message],
      { content: systemPrompt },
      this.context.sessionId,
      this.context.campaignId,
      {
        // Analysis benefits from lower temperature for more consistent results
        temperature:
          input.temperature || Math.max(this.options.temperature - 0.2, 0.1),
        maxTokens: input.maxTokens || this.options.maxTokens,
        model: input.model || this.options.model,
      }
    );

    return {
      success: true,
      message: `Claude analysis (${
        analysisType || "general"
      }) completed successfully`,
      data: {
        content: response.content,
        analysisType: analysisType || "general",
        model: input.model || this.options.model || "default",
      },
    };
  }
}
