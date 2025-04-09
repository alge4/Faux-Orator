import { BaseAgent, AgentContext, AgentResponse } from "./BaseAgent";
import { sessionPlanningService } from "../services/SessionPlanningService";
import { SessionPlan } from "../types/sessionPlanning";
import { v4 as uuidv4 } from "uuid";

interface PlanningInput {
  type: "session" | "arc" | "consequence";
  details: {
    prompt: string;
    campaignId: string;
    [key: string]: any;
  };
}

export class PlanningAgent extends BaseAgent {
  private planningSessionId: string | null = null;

  constructor(context: AgentContext) {
    super(context);
  }

  async process(input: PlanningInput): Promise<AgentResponse> {
    try {
      if (!this.validateInput(input)) {
        throw new Error("Invalid input for planning agent");
      }

      await this.logAction("planning_started", input);

      // Initialize planning context if not already initialized
      if (!this.planningSessionId) {
        this.planningSessionId =
          await sessionPlanningService.initPlanningContext(
            input.details.campaignId
          );
      }

      switch (input.type) {
        case "session":
          return await this.planSession(input.details);
        case "arc":
          return await this.planStoryArc(input.details);
        case "consequence":
          return await this.planConsequence(input.details);
        default:
          throw new Error("Unknown planning type");
      }
    } catch (error) {
      return this.handleError(error as Error);
    }
  }

  private async planSession(
    details: PlanningInput["details"]
  ): Promise<AgentResponse> {
    try {
      if (!this.planningSessionId) {
        throw new Error("Planning session not initialized");
      }

      // Generate session plan using the SessionPlanningService
      const sessionPlan = await sessionPlanningService.generateSessionPlan(
        this.planningSessionId,
        details.campaignId,
        details.prompt
      );

      // Store the session plan in the database via the BaseAgent
      await this.updateStateInDatabase({
        tableId: "session_plans",
        data: sessionPlan,
      });

      return {
        success: true,
        message: `Generated session plan: ${sessionPlan.title}`,
        data: sessionPlan,
      };
    } catch (error) {
      console.error("Error in planSession:", error);
      throw error;
    }
  }

  private async planStoryArc(
    details: PlanningInput["details"]
  ): Promise<AgentResponse> {
    try {
      if (!this.planningSessionId) {
        throw new Error("Planning session not initialized");
      }

      // Get suggestions for the story arc
      const suggestions = await sessionPlanningService.getSuggestions(
        this.planningSessionId,
        `Generate a story arc for: ${details.prompt}`
      );

      // Create a mock story arc structure
      const storyArc = {
        id: uuidv4(),
        title: details.prompt,
        campaignId: details.campaignId,
        nodes: suggestions.map((suggestion) => ({
          id: uuidv4(),
          title: suggestion.type,
          description: suggestion.content,
          type: suggestion.type,
          relatedEntities: suggestion.relatedEntities,
        })),
        connections: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Store the story arc in the database
      await this.updateStateInDatabase({
        tableId: "story_arcs",
        data: storyArc,
      });

      return {
        success: true,
        message: `Generated story arc: ${storyArc.title}`,
        data: storyArc,
      };
    } catch (error) {
      console.error("Error in planStoryArc:", error);
      throw error;
    }
  }

  private async planConsequence(
    details: PlanningInput["details"]
  ): Promise<AgentResponse> {
    try {
      if (!this.planningSessionId) {
        throw new Error("Planning session not initialized");
      }

      // Get suggestions for consequences
      const consequences = await sessionPlanningService.getSuggestions(
        this.planningSessionId,
        `Generate consequences for this player action: ${details.prompt}`
      );

      // Create a structured consequence object
      const consequenceObject = {
        id: uuidv4(),
        action: details.prompt,
        campaignId: details.campaignId,
        consequences: consequences.map((suggestion) => ({
          id: uuidv4(),
          description: suggestion.content,
          severity: Math.floor(Math.random() * 3) + 1, // Mock severity 1-3
          affectedEntities: suggestion.relatedEntities,
          immediate: Math.random() > 0.5, // Random boolean
        })),
        createdAt: new Date().toISOString(),
      };

      // Store the consequences in the database
      await this.updateStateInDatabase({
        tableId: "action_consequences",
        data: consequenceObject,
      });

      return {
        success: true,
        message: "Generated consequences for player action",
        data: consequenceObject,
      };
    } catch (error) {
      console.error("Error in planConsequence:", error);
      throw error;
    }
  }

  // Helper method to pin an entity to the planning context
  async pinEntity(entityId: string): Promise<boolean> {
    try {
      if (!this.planningSessionId) {
        return false;
      }

      sessionPlanningService.pinEntity(this.planningSessionId, entityId);
      return true;
    } catch (error) {
      console.error("Error pinning entity:", error);
      return false;
    }
  }

  // Helper method to add a filter to the planning context
  async addFilter(filter: string): Promise<boolean> {
    try {
      if (!this.planningSessionId) {
        return false;
      }

      sessionPlanningService.addFilter(this.planningSessionId, filter);
      return true;
    } catch (error) {
      console.error("Error adding filter:", error);
      return false;
    }
  }
}
