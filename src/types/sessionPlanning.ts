export interface SessionPlan {
  id: string;
  title: string;
  summary: string;
  objectives: string[];
  involvedEntities: {
    npcs: Array<{
      id: string;
      name: string;
      role: string;
    }>;
    locations: Array<{
      id: string;
      name: string;
      significance: string;
    }>;
    items: Array<{
      id: string;
      name: string;
      purpose: string;
    }>;
    factions: Array<{
      id: string;
      name: string;
      involvement: string;
    }>;
  };
  storyBeats: Array<{
    id: string;
    description: string;
    type: "scene" | "combat" | "roleplay" | "exploration";
    expectedDuration: number; // in minutes
    branches?: Array<{
      condition: string;
      outcome: string;
    }>;
  }>;
  tags: string[];
  difficulty: "easy" | "medium" | "hard";
  estimatedDuration: number; // in minutes
  campaignId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionPlanningContext {
  referencedEntities: {
    npcs: Map<string, NPCReference>;
    locations: Map<string, LocationReference>;
    items: Map<string, ItemReference>;
    factions: Map<string, FactionReference>;
  };
  pinnedEntities: Set<string>;
  activeFilters: Set<string>;
}

export interface EntityReference {
  id: string;
  name: string;
  type: "npc" | "location" | "item" | "faction";
  lastUpdate: string;
  tags: string[];
}

export interface NPCReference extends EntityReference {
  type: "npc";
  personality: string;
  currentLocation: string;
}

export interface LocationReference extends EntityReference {
  type: "location";
  description: string;
  parentLocation?: string;
}

export interface ItemReference extends EntityReference {
  type: "item";
  description: string;
  currentHolder?: string;
}

export interface FactionReference extends EntityReference {
  type: "faction";
  description: string;
  currentStatus: string;
}

export interface ChatSuggestion {
  type: "encounter" | "npc_interaction" | "plot_twist" | "location_description";
  content: string;
  relatedEntities: string[];
}

export type SessionPlanningAction =
  | { type: "PIN_ENTITY"; entityId: string }
  | { type: "UNPIN_ENTITY"; entityId: string }
  | { type: "ADD_FILTER"; filter: string }
  | { type: "REMOVE_FILTER"; filter: string }
  | { type: "UPDATE_STORY_BEAT"; beat: SessionPlan["storyBeats"][0] }
  | { type: "ADD_STORY_BEAT"; beat: Omit<SessionPlan["storyBeats"][0], "id"> }
  | { type: "REMOVE_STORY_BEAT"; beatId: string }
  | { type: "UPDATE_OBJECTIVE"; index: number; objective: string }
  | { type: "ADD_OBJECTIVE"; objective: string }
  | { type: "REMOVE_OBJECTIVE"; index: number };
