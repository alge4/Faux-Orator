import { BaseAgent, AgentContext, AgentResponse } from "./BaseAgent";
import { supabase } from "../services/supabase";
import { getChatCompletion } from "../services/openai";
import { Database } from "../types/database.types";
import { v4 as uuidv4 } from "uuid";

// Define types
type SessionPlan = Database["public"]["Tables"]["session_plans"]["Row"];
type NPC = Database["public"]["Tables"]["npcs"]["Row"];
type Location = Database["public"]["Tables"]["locations"]["Row"];
type Faction = Database["public"]["Tables"]["factions"]["Row"];
type Item = Database["public"]["Tables"]["items"]["Row"];
type SessionDifficulty = Database["public"]["Enums"]["session_difficulty"];

// Interface for entities that can be involved in a session
export interface EntityReference {
  id: string;
  name: string;
  type: string;
  entityType: "npc" | "location" | "faction" | "item";
}

// Interface for a story beat in a session plan
export interface StoryBeat {
  title: string;
  description: string;
  entities: EntityReference[];
  notes?: string;
}

// Interface for session planning input
export interface SessionPlanningInput {
  title?: string;
  description?: string;
  focusEntities?: EntityReference[];
  excludeEntities?: EntityReference[];
  difficulty?: SessionDifficulty;
  estimatedDuration?: number;
  additionalNotes?: string;
  previousPlanId?: string; // If continuing from a previous session
}

export class SessionPlanningAgent extends BaseAgent {
  private campaignEntities: {
    npcs: NPC[];
    locations: Location[];
    factions: Faction[];
    items: Item[];
  } = {
    npcs: [],
    locations: [],
    factions: [],
    items: [],
  };

  constructor(context: AgentContext) {
    super(context);
  }

  // Process the input to generate a session plan
  async process(input: SessionPlanningInput): Promise<AgentResponse> {
    try {
      // Validate that we have a campaign ID
      if (!this.context.campaignId) {
        throw new Error("Campaign ID is required for session planning");
      }

      // Load campaign entities
      await this.loadCampaignEntities();

      // Generate session plan
      const sessionPlan = await this.generateSessionPlan(input);

      // Save the session plan to the database
      const savedPlan = await this.saveSessionPlan(sessionPlan);

      // Log the action
      await this.logAction("generate_session_plan", {
        sessionPlanId: savedPlan.id,
        title: savedPlan.title,
        duration: savedPlan.estimated_duration,
      });

      // Return successful response
      return {
        success: true,
        message: `Session plan "${savedPlan.title}" generated successfully.`,
        data: savedPlan,
      };
    } catch (error) {
      return this.handleError("Error in Session Planning Agent", error);
    }
  }

  // Load all entities for the campaign
  private async loadCampaignEntities(): Promise<void> {
    try {
      // Load NPCs
      const { data: npcs, error: npcsError } = await supabase
        .from("npcs")
        .select("*")
        .eq("campaign_id", this.context.campaignId);

      if (npcsError)
        throw new Error(`Failed to load NPCs: ${npcsError.message}`);
      this.campaignEntities.npcs = npcs || [];

      // Load Locations
      const { data: locations, error: locationsError } = await supabase
        .from("locations")
        .select("*")
        .eq("campaign_id", this.context.campaignId);

      if (locationsError)
        throw new Error(`Failed to load locations: ${locationsError.message}`);
      this.campaignEntities.locations = locations || [];

      // Load Factions
      const { data: factions, error: factionsError } = await supabase
        .from("factions")
        .select("*")
        .eq("campaign_id", this.context.campaignId);

      if (factionsError)
        throw new Error(`Failed to load factions: ${factionsError.message}`);
      this.campaignEntities.factions = factions || [];

      // Load Items
      const { data: items, error: itemsError } = await supabase
        .from("items")
        .select("*")
        .eq("campaign_id", this.context.campaignId);

      if (itemsError)
        throw new Error(`Failed to load items: ${itemsError.message}`);
      this.campaignEntities.items = items || [];
    } catch (error) {
      throw new Error(
        `Error loading campaign entities: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // Generate a session plan based on the input
  private async generateSessionPlan(
    input: SessionPlanningInput
  ): Promise<SessionPlan> {
    // Create a system prompt for OpenAI
    const systemPrompt = this.createSessionPlanningPrompt(input);

    // Prepare previous plan data if specified
    let previousPlanData = null;
    if (input.previousPlanId) {
      const { data, error } = await supabase
        .from("session_plans")
        .select("*")
        .eq("id", input.previousPlanId)
        .single();

      if (error) {
        throw new Error(
          `Failed to load previous session plan: ${error.message}`
        );
      }

      previousPlanData = data;
    }

    // Format the messages for OpenAI
    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Generate a D&D session plan for a campaign${
          input.title ? ` titled "${input.title}"` : ""
        }${
          input.description
            ? ` with the following focus: ${input.description}`
            : ""
        }. ${
          previousPlanData
            ? "This session should continue from the previous session plan."
            : ""
        }`,
      },
    ];

    // Add previous plan context if available
    if (previousPlanData) {
      messages.push({
        role: "user",
        content: `Previous session summary: ${
          previousPlanData.summary || "Not available"
        }. 
        Key story beats from previous session: ${JSON.stringify(
          previousPlanData.story_beats
        )}`,
      });
    }

    // Get completion from OpenAI
    const completion = await getChatCompletion({
      messages,
      temperature: 0.7,
      maxTokens: 2000,
      campaignId: this.context.campaignId,
    });

    const responseContent = completion.choices[0].message.content;

    // Parse the response into a session plan
    return this.parseSessionPlanResponse(responseContent, input);
  }

  // Create a system prompt for session planning
  private createSessionPlanningPrompt(input: SessionPlanningInput): string {
    // Get campaign entities for the prompt
    const focusEntitiesInfo = this.formatEntitiesForPrompt(
      input.focusEntities || []
    );
    const excludeEntitiesInfo =
      input.excludeEntities?.map((e) => e.name).join(", ") || "None specified";

    const npcsList = this.campaignEntities.npcs
      .filter((npc) => !input.excludeEntities?.some((e) => e.id === npc.id))
      .map(
        (npc) =>
          `- ${npc.name}: ${npc.type || "NPC"}. ${npc.description || ""} ${
            npc.status ? `Status: ${npc.status}` : ""
          }`
      )
      .join("\n");

    const locationsList = this.campaignEntities.locations
      .filter((loc) => !input.excludeEntities?.some((e) => e.id === loc.id))
      .map(
        (loc) =>
          `- ${loc.name}: ${loc.type || "Location"}. ${loc.description || ""}`
      )
      .join("\n");

    const factionsList = this.campaignEntities.factions
      .filter(
        (faction) => !input.excludeEntities?.some((e) => e.id === faction.id)
      )
      .map(
        (faction) =>
          `- ${faction.name}: ${faction.type || "Faction"}. ${
            faction.description || ""
          } ${
            faction.current_status ? `Status: ${faction.current_status}` : ""
          }`
      )
      .join("\n");

    const itemsList = this.campaignEntities.items
      .filter((item) => !input.excludeEntities?.some((e) => e.id === item.id))
      .map(
        (item) =>
          `- ${item.name}: ${item.type || "Item"}. ${item.description || ""}`
      )
      .join("\n");

    return `You are an expert Dungeon Master's assistant that helps create detailed and engaging D&D session plans. 
    
Campaign Entities:
NPCs:
${npcsList || "No NPCs available"}

Locations:
${locationsList || "No locations available"}

Factions:
${factionsList || "No factions available"}

Items:
${itemsList || "No items available"}

Session Planning Parameters:
- Difficulty: ${input.difficulty || "medium"}
- Estimated Duration: ${input.estimatedDuration || "3-4"} hours
- Focus Entities: ${focusEntitiesInfo || "None specified"}
- Entities to Exclude: ${excludeEntitiesInfo}
- Additional Notes: ${input.additionalNotes || "None provided"}

Your task is to create a complete session plan with the following components:
1. A compelling title for the session
2. A brief summary of the session (2-3 sentences)
3. Clear objectives for the players (3-5 objectives)
4. 4-6 engaging story beats that form a narrative arc
5. Relevant NPCs, locations, factions, and items involved in each story beat
6. Potential hooks for future sessions

Each story beat should include a title, description, and entities involved.
Format your response as JSON in the following structure:
{
  "title": "Session Title",
  "summary": "Brief summary of the session",
  "objectives": ["Objective 1", "Objective 2", "Objective 3"],
  "storyBeats": [
    {
      "title": "Beat Title",
      "description": "Description of what happens",
      "entities": [
        {"id": "entity-id", "name": "Entity Name", "type": "NPC/Location/etc", "entityType": "npc/location/faction/item"}
      ],
      "notes": "Additional notes for the DM"
    }
  ],
  "involvedEntities": [
    {"id": "entity-id", "name": "Entity Name", "type": "NPC/Location/etc", "entityType": "npc/location/faction/item"}
  ],
  "hooks": ["Future hook 1", "Future hook 2"]
}`;
  }

  // Format a list of entities for the prompt
  private formatEntitiesForPrompt(entities: EntityReference[]): string {
    if (!entities.length) return "";

    return entities
      .map((entity) => {
        let entityDetails;
        switch (entity.entityType) {
          case "npc":
            entityDetails = this.campaignEntities.npcs.find(
              (e) => e.id === entity.id
            );
            break;
          case "location":
            entityDetails = this.campaignEntities.locations.find(
              (e) => e.id === entity.id
            );
            break;
          case "faction":
            entityDetails = this.campaignEntities.factions.find(
              (e) => e.id === entity.id
            );
            break;
          case "item":
            entityDetails = this.campaignEntities.items.find(
              (e) => e.id === entity.id
            );
            break;
        }

        return `${entity.name} (${entity.entityType}): ${
          entityDetails?.description || "No description"
        }`;
      })
      .join("\n");
  }

  // Parse the OpenAI response into a session plan
  private parseSessionPlanResponse(
    response: string,
    input: SessionPlanningInput
  ): SessionPlan {
    try {
      // Try to parse JSON from the response
      let planData;
      try {
        // Find JSON in the response (it might be surrounded by text)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          planData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (error) {
        // If JSON parsing fails, create a minimal structure from the text
        console.error("Error parsing JSON from response:", error);
        planData = {
          title: input.title || "Untitled Session",
          summary: response.slice(0, 200) + "...",
          objectives: ["Session objectives could not be parsed"],
          storyBeats: [
            {
              title: "Session Content",
              description: response,
              entities: [],
            },
          ],
          involvedEntities: [],
          hooks: [],
        };
      }

      // Create the session plan object
      return {
        id: uuidv4(),
        title: planData.title || input.title || "Untitled Session",
        summary: planData.summary || "",
        objectives: planData.objectives || [],
        story_beats: planData.storyBeats || [],
        involved_entities: planData.involvedEntities || [],
        campaign_id: this.context.campaignId!,
        difficulty: input.difficulty || "medium",
        estimated_duration: input.estimatedDuration || 3,
        tags: ["ai-generated", ...(planData.hooks ? ["has-hooks"] : [])],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(
        `Failed to parse session plan: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // Save the session plan to the database
  private async saveSessionPlan(plan: SessionPlan): Promise<SessionPlan> {
    const { data, error } = await supabase
      .from("session_plans")
      .insert({
        id: plan.id,
        title: plan.title,
        summary: plan.summary,
        objectives: plan.objectives,
        story_beats: plan.story_beats,
        involved_entities: plan.involved_entities,
        campaign_id: plan.campaign_id,
        difficulty: plan.difficulty,
        estimated_duration: plan.estimated_duration,
        tags: plan.tags,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save session plan: ${error.message}`);
    }

    return data;
  }
}
