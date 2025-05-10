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

  // Validate the input structure
  private validateInput(input: any): boolean {
    if (!input) return false;

    if (typeof input !== "object") return false;

    if (
      !input.type ||
      !["session", "arc", "consequence"].includes(input.type)
    ) {
      return false;
    }

    if (!input.details || typeof input.details !== "object") return false;

    if (
      !input.details.prompt ||
      typeof input.details.prompt !== "string" ||
      input.details.prompt.trim() === ""
    ) {
      return false;
    }

    if (
      !input.details.campaignId ||
      typeof input.details.campaignId !== "string" ||
      input.details.campaignId.trim() === ""
    ) {
      return false;
    }

    return true;
  }

  async process(input: PlanningInput): Promise<AgentResponse> {
    try {
      if (!this.validateInput(input)) {
        throw new Error("Invalid input for planning agent");
      }

      await this.logAction("planning_started", input);

      // Initialize planning context if not already initialized
      if (!this.planningSessionId) {
        try {
          this.planningSessionId =
            await sessionPlanningService.initPlanningContext(
              input.details.campaignId
            );
        } catch (initError) {
          console.error("Failed to initialize planning context:", initError);
          throw new Error(
            "Failed to initialize planning session. Please check your campaign ID and try again."
          );
        }
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
      let sessionPlan;
      try {
        sessionPlan = await sessionPlanningService.generateSessionPlan(
          this.planningSessionId,
          details.campaignId,
          details.prompt
        );
      } catch (planError) {
        console.error("Error generating session plan:", planError);
        return {
          success: false,
          message:
            "I'm having trouble creating a session plan right now. Can you try a different prompt or try again later?",
          error:
            planError instanceof Error ? planError.message : "Unknown error",
        };
      }

      // Store the session plan in the database via the BaseAgent
      try {
        await this.updateStateInDatabase({
          tableId: "session_plans",
          data: sessionPlan,
        });
      } catch (dbError) {
        console.error("Error saving session plan to database:", dbError);
        // Continue even if we couldn't save to DB - at least return the plan to the user
      }

      return {
        success: true,
        message: `Generated session plan: ${sessionPlan.title}`,
        data: sessionPlan,
      };
    } catch (error) {
      console.error("Error in planSession:", error);
      return {
        success: false,
        message:
          "There was an error creating your session plan. Please try again with a different prompt.",
        error: error instanceof Error ? error.message : "Unknown error",
      };
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
      let suggestions;
      try {
        suggestions = await sessionPlanningService.getSuggestions(
          this.planningSessionId,
          `Generate a story arc for: ${details.prompt}`
        );
      } catch (suggestionsError) {
        console.error("Error getting story arc suggestions:", suggestionsError);
        return {
          success: false,
          message:
            "I couldn't generate story arc suggestions right now. Please try again with a different prompt.",
          error:
            suggestionsError instanceof Error
              ? suggestionsError.message
              : "Unknown error",
        };
      }

      // Create a story arc structure
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
      try {
        await this.updateStateInDatabase({
          tableId: "story_arcs",
          data: storyArc,
        });
      } catch (dbError) {
        console.error("Error saving story arc to database:", dbError);
        // Continue even if we couldn't save to DB
      }

      return {
        success: true,
        message: `Generated story arc: ${storyArc.title}`,
        data: storyArc,
      };
    } catch (error) {
      console.error("Error in planStoryArc:", error);
      return {
        success: false,
        message:
          "There was an error creating your story arc. Please try again.",
        error: error instanceof Error ? error.message : "Unknown error",
      };
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
      let consequences;
      try {
        consequences = await sessionPlanningService.getSuggestions(
          this.planningSessionId,
          `Generate consequences for this player action: ${details.prompt}`
        );
      } catch (suggestionsError) {
        console.error(
          "Error getting consequence suggestions:",
          suggestionsError
        );
        return {
          success: false,
          message:
            "I couldn't generate action consequences right now. Please try again with a different prompt.",
          error:
            suggestionsError instanceof Error
              ? suggestionsError.message
              : "Unknown error",
        };
      }

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
      try {
        await this.updateStateInDatabase({
          tableId: "action_consequences",
          data: consequenceObject,
        });
      } catch (dbError) {
        console.error("Error saving consequences to database:", dbError);
        // Continue even if we couldn't save to DB
      }

      return {
        success: true,
        message: "Generated consequences for player action",
        data: consequenceObject,
      };
    } catch (error) {
      console.error("Error in planConsequence:", error);
      return {
        success: false,
        message:
          "There was an error generating consequences. Please try again.",
        error: error instanceof Error ? error.message : "Unknown error",
      };
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
