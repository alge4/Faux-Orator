import { BaseAgent, AgentContext, AgentResponse } from "./BaseAgent";
import { openAIService } from "../services/openai";
import { supabase } from "../services/supabase";
import { DatabaseManagementAgent } from "./DatabaseManagementAgent";

interface DMAssistantInput {
  type: "planning" | "running" | "review" | "data_import";
  message: string;
  context?: {
    pinnedEntities?: Array<{
      id: string;
      name: string;
      type: string;
      content: any;
    }>;
    currentMode?: string;
    sessionHistory?: Array<{
      role: string;
      content: string;
    }>;
    sourceDocument?: {
      content: string;
      type: string;
      name: string;
    };
  };
}

export class DMAssistantAgent extends BaseAgent {
  private dbAgent: DatabaseManagementAgent;

  constructor(context: AgentContext) {
    super(context);
    this.dbAgent = new DatabaseManagementAgent(context);
  }

  async process(input: DMAssistantInput): Promise<AgentResponse> {
    try {
      this.validateInput(input);
      await this.logAction("dm_assistant_query", input);

      let response: string;

      if (input.type === "data_import" && input.context?.sourceDocument) {
        // Handle document import and data extraction
        response = await this.handleDataImport(input);
      } else {
        // Handle regular DM assistance
        response = await this.handleDMAssistance(input);
      }

      await this.logAction("dm_assistant_response", {
        input,
        response,
      });

      return {
        success: true,
        message: response,
        data: {
          type: input.type,
          context: input.context,
        },
      };
    } catch (error) {
      return this.handleError(error as Error);
    }
  }

  private async handleDataImport(input: DMAssistantInput): Promise<string> {
    if (!input.context?.sourceDocument) {
      throw new Error("No document provided for data import");
    }

    // First, let the database agent extract and store the data
    const dbResponse = await this.dbAgent.process({
      operation: [], // The agent will determine operations based on extracted data
      context: {
        campaignId: this.context.campaignId,
        userId: this.context.userId,
        sourceDocument: input.context.sourceDocument,
      },
    });

    // Then, generate a user-friendly summary of what was imported
    const summaryPrompt = this.createDataImportSummaryPrompt(dbResponse.data);
    const summary = await openAIService.getChatCompletion(
      [
        { role: "system", content: summaryPrompt },
        { role: "user", content: "Summarize the imported data" },
      ],
      undefined,
      this.context.sessionId,
      this.context.campaignId
    );

    return (
      summary.content || "Data import completed, but couldn't generate summary."
    );
  }

  private async handleDMAssistance(input: DMAssistantInput): Promise<string> {
    const systemPrompt = this.createSystemPrompt(input.type, input.context);
    const messages = [
      { role: "system", content: systemPrompt },
      ...(input.context?.sessionHistory || []).map((msg) => ({
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content,
      })),
      { role: "user", content: input.message },
    ];

    const response = await openAIService.getChatCompletion(
      messages,
      undefined,
      this.context.sessionId,
      this.context.campaignId
    );

    return (
      response.content ||
      "I apologize, but I'm unable to generate a response at the moment."
    );
  }

  private createDataImportSummaryPrompt(data: any): string {
    return `You are a helpful D&D campaign assistant. Data has been imported into the campaign database.
Please provide a friendly, natural language summary of what was imported:

Imported Data:
${JSON.stringify(data, null, 2)}

Format your response as a conversation with the DM, highlighting:
1. What types of content were imported (NPCs, locations, etc.)
2. Any interesting connections or relationships found
3. Suggestions for what to flesh out next
4. Any potential gaps or missing information

Keep the tone helpful and enthusiastic, like a DM's assistant eager to help build the campaign.`;
  }

  private createSystemPrompt(type: string, context: any): string {
    const basePrompt = `You are an expert Dungeon Master's assistant for a D&D campaign. 
Campaign: ${context.campaign?.name || "Unnamed Campaign"}
Setting: ${context.campaign?.setting || "Not specified"}
Theme: ${context.campaign?.theme || "Not specified"}

Your role is to assist the DM in creating and managing an engaging and consistent campaign. You should:
1. Maintain consistency with established campaign elements
2. Offer creative suggestions while respecting the DM's authority
3. Help track important details and relationships
4. Provide clear, actionable advice
5. Ask clarifying questions when needed

Remember:
- You are an assistant, not the DM - always defer to their decisions
- Keep responses focused and relevant to the current context
- Reference specific campaign elements when appropriate
- Maintain the campaign's tone and theme
- Offer alternatives when making suggestions`;

    switch (type) {
      case "planning":
        return `${basePrompt}

You are currently helping with session planning. Focus on:
- Story development and pacing
- Encounter design and balance
- NPC motivations and actions
- Plot hooks and story arcs
- Session structure and timing`;

      case "running":
        return `${basePrompt}

You are currently helping run a live session. Focus on:
- Quick rules lookups and clarifications
- Improvised NPC responses and actions
- Dynamic encounter adjustments
- Maintaining narrative flow
- Quick reference for important details`;

      case "review":
        return `${basePrompt}

You are currently helping review and update the campaign. Focus on:
- Analyzing session outcomes
- Updating NPC and faction status
- Identifying potential consequences
- Planning future developments
- Maintaining campaign notes`;

      default:
        return basePrompt;
    }
  }
}
