import { BaseAgent, AgentContext, AgentResponse } from "./BaseAgent";
import { openAIService } from "../services/openai";
import { supabase } from "../services/supabase";

interface DMAssistantInput {
  type: "planning" | "running" | "review";
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
  };
}

export class DMAssistantAgent extends BaseAgent {
  constructor(context: AgentContext) {
    super(context);
  }

  async process(input: DMAssistantInput): Promise<AgentResponse> {
    try {
      this.validateInput(input);
      await this.logAction("dm_assistant_query", input);

      // Get campaign context
      const campaignContext = await this.getCampaignContext();

      // Generate response based on mode
      const response = await this.generateResponse(input, campaignContext);

      // Log the interaction
      await this.logAction("dm_assistant_response", {
        input,
        response,
        campaignContext,
      });

      return {
        success: true,
        message: response,
        data: {
          type: input.type,
          context: campaignContext,
        },
      };
    } catch (error) {
      return this.handleError(error as Error);
    }
  }

  private async getCampaignContext() {
    // Fetch relevant campaign data from Supabase
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", this.context.campaignId)
      .single();

    // Fetch recent entities
    const { data: recentEntities } = await supabase
      .from("campaign_entities")
      .select("*")
      .eq("campaign_id", this.context.campaignId)
      .order("last_referenced", { ascending: false })
      .limit(5);

    return {
      campaign,
      recentEntities,
    };
  }

  private async generateResponse(
    input: DMAssistantInput,
    context: any
  ): Promise<string> {
    const systemPrompt = this.createSystemPrompt(input.type, context);

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
