import { aiService, ChatMessage } from "../services/aiService";
import {
  BaseAgent,
  AgentContext,
  AgentResponse,
  AgentOptions,
} from "../ai-agents/BaseAgent";

// A simple agent that uses our unified AI service
class SimpleAgent extends BaseAgent {
  constructor(context: AgentContext, options: AgentOptions = {}) {
    super(context, options);
  }

  // Simple process method that sends the input to the AI service
  async process(input: any): Promise<AgentResponse> {
    try {
      if (!this.validateInput(input)) {
        throw new Error("Invalid input");
      }

      // Log the action
      await this.logAction("process", { input });

      let result: string;

      if (typeof input === "string") {
        // Simple text query
        result = await this.getTextResponse(input);
      } else if (typeof input === "object") {
        if (input.type === "creative") {
          // Creative generation
          result = await this.getCreativeResponse(
            input.prompt,
            input.theme,
            input.temperature || 0.8
          );
        } else {
          result = await this.getTextResponse(JSON.stringify(input));
        }
      } else {
        throw new Error(`Unsupported input type: ${typeof input}`);
      }

      return {
        success: true,
        message: "Request processed successfully",
        data: {
          result,
          provider: this.options.aiProvider || "auto",
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Get a simple text response
  private async getTextResponse(text: string): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "You are a helpful assistant for a tabletop RPG game. Keep responses concise.",
      },
      {
        role: "user",
        content: text,
      },
    ];

    const response = await aiService.getChatCompletion(messages, {
      provider: this.options.aiProvider,
      temperature: this.options.temperature,
      maxTokens: this.options.maxTokens,
      model: this.options.model,
      sessionId: this.context.sessionId,
      campaignId: this.context.campaignId,
    });

    return response.content;
  }

  // Get a creative response with given theme
  private async getCreativeResponse(
    prompt: string,
    theme: string,
    temperature?: number
  ): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are a creative assistant for tabletop RPG content. Theme: ${theme}`,
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    const response = await aiService.getChatCompletion(messages, {
      provider: this.options.aiProvider,
      temperature: temperature || this.options.temperature,
      maxTokens: this.options.maxTokens,
      model: this.options.model,
      sessionId: this.context.sessionId,
      campaignId: this.context.campaignId,
    });

    return response.content;
  }
}

// Test function to demonstrate using our agent with different providers
async function testAgentWithDifferentProviders() {
  console.log("Testing Agent with Different AI Providers");
  console.log("=========================================");

  // Create a test context
  const context: AgentContext = {
    sessionId: "test-session-" + Date.now(),
    campaignId: "test-campaign",
    userId: "test-user",
    timestamp: new Date().toISOString(),
  };

  try {
    console.log("1. Testing with default AI provider...");
    const defaultAgent = new SimpleAgent(context);

    const defaultResult = await defaultAgent.process(
      "Create a name for a magical sword."
    );

    console.log(`Using provider: ${defaultAgent.getAIProvider()}`);
    console.log("Response:", defaultResult.data?.result);
    console.log("\n---\n");

    console.log("2. Testing with Claude as the AI provider...");
    const claudeAgent = new SimpleAgent(context, {
      aiProvider: "claude",
    });

    const claudeResult = await claudeAgent.process({
      type: "creative",
      prompt: "Create a description for a mystical forest location.",
      theme: "dark fantasy",
    });

    console.log(`Using provider: ${claudeAgent.getAIProvider()}`);
    console.log("Response:", claudeResult.data?.result);
    console.log("\n---\n");

    console.log("3. Switching provider at runtime...");
    defaultAgent.setAIProvider("claude");
    console.log(`Provider changed to: ${defaultAgent.getAIProvider()}`);

    const switchedResult = await defaultAgent.process(
      "Create a riddle for a sphinx guardian."
    );

    console.log("Response after switching:", switchedResult.data?.result);
    console.log("\n---\n");

    console.log("Agent Test Completed Successfully!");
  } catch (error) {
    console.error("Error in agent test:", error);
  }
}

// Run the test
if (require.main === module) {
  testAgentWithDifferentProviders();
}

export { testAgentWithDifferentProviders, SimpleAgent };
