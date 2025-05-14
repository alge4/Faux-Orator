import {
  BaseAgent,
  AgentContext,
  AgentResponse,
  AgentOptions,
} from "./BaseAgent";
import { aiService, ChatMessage } from "../services/aiService";
import { supabase } from "../lib/supabaseClient";

interface DialogueContext {
  location: string;
  time: string;
  mood: string;
  participants: string[];
  previousExchanges?: DialogueExchange[];
  activeTopics?: string[];
  environmentalFactors?: string[];
}

interface DialogueExchange {
  speakerId: string;
  content: string;
  emotion?: string;
  timestamp: string;
  referencedTopics?: string[];
}

interface DialoguePrompt {
  context: DialogueContext;
  speakerId: string;
  intent: string;
  style?: string;
  constraints?: string[];
}

export class UnifiedDialogueAgent extends BaseAgent {
  private dialogueHistory: Map<string, DialogueExchange[]>;
  private activeContexts: Map<string, DialogueContext>;

  constructor(context: AgentContext, options: AgentOptions = {}) {
    super(context, {
      temperature: 0.8, // Dialogue benefits from slightly higher temperature
      ...options,
    });
    this.dialogueHistory = new Map();
    this.activeContexts = new Map();
  }

  async process(input: any): Promise<AgentResponse> {
    try {
      switch (input.type) {
        case "generate":
          return await this.generateDialogue(input.prompt);
        case "continue":
          return await this.continueDialogue(
            input.conversationId,
            input.prompt
          );
        case "analyze":
          return await this.analyzeDialogue(input.conversationId);
        case "suggest":
          return await this.suggestResponses(input.context, input.speakerId);
        case "branch":
          return await this.createDialogueBranch(
            input.conversationId,
            input.branchPoint
          );
        default:
          throw new Error(`Unknown input type: ${input.type}`);
      }
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async generateDialogue(
    prompt: DialoguePrompt
  ): Promise<AgentResponse> {
    try {
      const conversationId = crypto.randomUUID();

      // Generate the initial dialogue using AIService
      const dialogue = await this.generateInitialDialogue(prompt);

      // Store the dialogue and context
      this.dialogueHistory.set(conversationId, [dialogue]);
      this.activeContexts.set(conversationId, prompt.context);

      // Save to database
      await this.saveDialogue(conversationId, dialogue, prompt.context);

      return {
        success: true,
        message: "Generated new dialogue",
        data: {
          conversationId,
          dialogue,
          context: prompt.context,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async continueDialogue(
    conversationId: string,
    prompt: DialoguePrompt
  ): Promise<AgentResponse> {
    try {
      const history = this.dialogueHistory.get(conversationId);
      if (!history) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      // Update context with history
      prompt.context.previousExchanges = history;

      // Generate continuation using AIService
      const continuation = await this.generateContinuation(
        prompt,
        conversationId
      );

      // Update history
      history.push(continuation);
      this.dialogueHistory.set(conversationId, history);

      // Save to database
      await this.saveDialogue(conversationId, continuation, prompt.context);

      return {
        success: true,
        message: "Continued dialogue",
        data: {
          conversationId,
          continuation,
          updatedHistory: history,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async analyzeDialogue(
    conversationId: string
  ): Promise<AgentResponse> {
    try {
      const history = this.dialogueHistory.get(conversationId);
      if (!history) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      // Analyze dialogue using AIService
      const analysis = await this.analyzeConversation(history, conversationId);

      return {
        success: true,
        message: "Analyzed dialogue",
        data: {
          conversationId,
          analysis,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async suggestResponses(
    context: DialogueContext,
    speakerId: string
  ): Promise<AgentResponse> {
    try {
      // Generate response suggestions using AIService
      const suggestions = await this.generateResponseSuggestions(
        context,
        speakerId
      );

      return {
        success: true,
        message: "Generated response suggestions",
        data: {
          suggestions,
          context,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async createDialogueBranch(
    conversationId: string,
    branchPoint: number
  ): Promise<AgentResponse> {
    try {
      const history = this.dialogueHistory.get(conversationId);
      if (!history) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      // Create new conversation ID for the branch
      const branchId = crypto.randomUUID();

      // Copy history up to branch point
      const branchHistory = history.slice(0, branchPoint);
      this.dialogueHistory.set(branchId, branchHistory);

      // Copy context
      const context = this.activeContexts.get(conversationId);
      if (context) {
        this.activeContexts.set(branchId, { ...context });
      }

      return {
        success: true,
        message: "Created dialogue branch",
        data: {
          originalConversationId: conversationId,
          branchId,
          branchHistory,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // AI Integration Methods

  private async generateInitialDialogue(
    prompt: DialoguePrompt
  ): Promise<DialogueExchange> {
    // Log the action
    await this.logAction("generate_dialogue", { prompt });

    // Create the messages for AI service
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: this.createSystemPromptForDialogue(prompt),
      },
      {
        role: "user",
        content: this.createUserPromptForDialogue(prompt),
      },
    ];

    // Make the API call
    const response = await aiService.getChatCompletion(messages, {
      provider: this.options.aiProvider,
      temperature: this.options.temperature,
      maxTokens: this.options.maxTokens,
      model: this.options.model,
      sessionId: this.context.sessionId,
      campaignId: this.context.campaignId,
    });

    return {
      speakerId: prompt.speakerId,
      content: response.content,
      timestamp: new Date().toISOString(),
    };
  }

  private async generateContinuation(
    prompt: DialoguePrompt,
    conversationId: string
  ): Promise<DialogueExchange> {
    // Log the action
    await this.logAction("continue_dialogue", { prompt, conversationId });

    // Create the context from previous exchanges
    const previousDialogueText = this.formatDialogueHistory(
      prompt.context.previousExchanges || []
    );

    // Create the messages for AI service
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: this.createSystemPromptForDialogue(prompt),
      },
      {
        role: "user",
        content: `Previous dialogue:\n${previousDialogueText}\n\nGenerate the next line for character ${prompt.speakerId} with intent: ${prompt.intent}`,
      },
    ];

    // Make the API call with session tracking for context
    const response = await aiService.getChatCompletion(messages, {
      provider: this.options.aiProvider,
      temperature: this.options.temperature,
      maxTokens: this.options.maxTokens,
      model: this.options.model,
      sessionId: `dialogue_${conversationId}`,
      campaignId: this.context.campaignId,
    });

    return {
      speakerId: prompt.speakerId,
      content: response.content,
      timestamp: new Date().toISOString(),
    };
  }

  private async analyzeConversation(
    history: DialogueExchange[],
    conversationId: string
  ): Promise<any> {
    // Log the action
    await this.logAction("analyze_dialogue", { conversationId });

    const dialogueText = this.formatDialogueHistory(history);

    // Create the messages for AI service
    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "You are a dialogue analyst for a tabletop RPG system. Analyze the following dialogue and extract key information.",
      },
      {
        role: "user",
        content: `Analyze the following dialogue and provide: 1) Main topics discussed, 2) Overall sentiment/mood, 3) Key points or decisions made, 4) Character relationships\n\n${dialogueText}`,
      },
    ];

    // Make the API call
    const response = await aiService.getChatCompletion(messages, {
      provider: this.options.aiProvider,
      temperature: 0.3, // Lower temperature for analysis tasks
      maxTokens: this.options.maxTokens,
      model: this.options.model,
      campaignId: this.context.campaignId,
    });

    // Parse the output into a structured format
    // This is simplified and could be made more robust
    const analysis = {
      topics: this.extractBulletPoints(response.content, "topics"),
      sentiment: this.extractSentiment(response.content),
      keyPoints: this.extractBulletPoints(response.content, "key points"),
      relationships: this.extractBulletPoints(
        response.content,
        "relationships"
      ),
      raw: response.content,
    };

    return analysis;
  }

  private async generateResponseSuggestions(
    context: DialogueContext,
    speakerId: string
  ): Promise<string[]> {
    // Log the action
    await this.logAction("suggest_responses", { context, speakerId });

    // Create context description for the AI
    const contextDescription = this.formatDialogueContext(context);
    const previousDialogueText = this.formatDialogueHistory(
      context.previousExchanges || []
    );

    // Create the messages for AI service
    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "You are a helpful dialogue assistant for a tabletop RPG game. Generate varied response options for a character.",
      },
      {
        role: "user",
        content: `Context: ${contextDescription}\n\nPrevious dialogue:\n${previousDialogueText}\n\nGenerate 3 different response options for character ${speakerId}. Make each option distinct in tone or approach.`,
      },
    ];

    // Make the API call
    const response = await aiService.getChatCompletion(messages, {
      provider: this.options.aiProvider,
      temperature: 0.9, // Higher temperature for creative variety
      maxTokens: this.options.maxTokens,
      model: this.options.model,
      campaignId: this.context.campaignId,
    });

    // Extract the options from the response
    const options = this.extractOptions(response.content);
    return options.length > 0 ? options : [response.content];
  }

  // Helper Methods

  private createSystemPromptForDialogue(prompt: DialoguePrompt): string {
    return `You are a dialogue generator for a tabletop RPG campaign. 
Generate realistic, character-appropriate dialogue based on the context provided.
${prompt.style ? `Style: ${prompt.style}` : ""}
${
  prompt.constraints?.length
    ? `Constraints: ${prompt.constraints.join(", ")}`
    : ""
}`;
  }

  private createUserPromptForDialogue(prompt: DialoguePrompt): string {
    const contextDescription = this.formatDialogueContext(prompt.context);
    return `Context: ${contextDescription}\n\nGenerate dialogue for character ${prompt.speakerId} with the following intent: ${prompt.intent}`;
  }

  private formatDialogueContext(context: DialogueContext): string {
    return `Location: ${context.location}
Time: ${context.time}
Mood: ${context.mood}
Participants: ${context.participants.join(", ")}
${
  context.activeTopics?.length
    ? `Active Topics: ${context.activeTopics.join(", ")}`
    : ""
}
${
  context.environmentalFactors?.length
    ? `Environmental Factors: ${context.environmentalFactors.join(", ")}`
    : ""
}`;
  }

  private formatDialogueHistory(history: DialogueExchange[]): string {
    return history
      .map(
        (exchange) =>
          `${exchange.speakerId}: ${exchange.content}${
            exchange.emotion ? ` (${exchange.emotion})` : ""
          }`
      )
      .join("\n");
  }

  private extractBulletPoints(text: string, keyword: string): string[] {
    // Simple regex-based extraction, could be improved
    const regex = new RegExp(
      `${keyword}[:\\s-]*((?:[-•*]\\s*[^\\n]+\\n*)+)`,
      "i"
    );
    const match = text.match(regex);
    if (!match) return [];

    return match[1]
      .split(/[-•*]\s*/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private extractSentiment(text: string): string {
    // Simple regex-based extraction, could be improved
    const regex = /sentiment[:\s-]*([^.,\n]+)/i;
    const match = text.match(regex);
    return match ? match[1].trim() : "neutral";
  }

  private extractOptions(text: string): string[] {
    // Extract numbered or bulleted options
    const optionMatches = text.match(/(?:^|\n)(?:[-•*]|\d+\.)\s*([^\n]+)/g);
    if (optionMatches) {
      return optionMatches.map((match) =>
        match.replace(/(?:^|\n)(?:[-•*]|\d+\.)\s*/, "").trim()
      );
    }
    return [];
  }

  private async saveDialogue(
    conversationId: string,
    dialogue: DialogueExchange,
    context: DialogueContext
  ): Promise<void> {
    try {
      await supabase.from("dialogues").insert({
        conversation_id: conversationId,
        campaign_id: this.context.campaignId,
        speaker_id: dialogue.speakerId,
        content: dialogue.content,
        context: context,
        created_at: dialogue.timestamp,
      });
    } catch (error) {
      console.error("Error saving dialogue:", error);
      throw error;
    }
  }
}
