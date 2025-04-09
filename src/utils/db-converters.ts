import { Database } from "../supabase/types";
import {
  EntityReference,
  NPCReference,
  LocationReference,
  ItemReference,
  FactionReference,
  SessionPlan,
} from "../types/sessionPlanning";

// Type aliases for database rows
type NPCRow = Database["public"]["Tables"]["npcs"]["Row"];
type LocationRow = Database["public"]["Tables"]["locations"]["Row"];
type FactionRow = Database["public"]["Tables"]["factions"]["Row"];
type ItemRow = Database["public"]["Tables"]["items"]["Row"];
type SessionPlanRow = Database["public"]["Tables"]["session_plans"]["Row"];

/**
 * Converts an NPC database row to an NPCReference
 */
export const convertNPCToReference = (
  npc: NPCRow,
  locationName?: string
): NPCReference => {
  return {
    id: npc.id,
    name: npc.name,
    type: "npc",
    personality: npc.personality || "",
    currentLocation: locationName || npc.current_location_id || "",
    lastUpdate: npc.updated_at,
    tags: npc.tags || [],
  };
};

/**
 * Converts a Location database row to a LocationReference
 */
export const convertLocationToReference = (
  location: LocationRow,
  parentName?: string
): LocationReference => {
  return {
    id: location.id,
    name: location.name,
    type: "location",
    description: location.description || "",
    parentLocation: parentName || location.parent_location_id || undefined,
    lastUpdate: location.updated_at,
    tags: location.tags || [],
  };
};

/**
 * Converts a Faction database row to a FactionReference
 */
export const convertFactionToReference = (
  faction: FactionRow
): FactionReference => {
  return {
    id: faction.id,
    name: faction.name,
    type: "faction",
    description: faction.description || "",
    currentStatus: faction.current_status || "",
    lastUpdate: faction.updated_at,
    tags: faction.tags || [],
  };
};

/**
 * Converts an Item database row to an ItemReference
 */
export const convertItemToReference = (
  item: ItemRow,
  holderName?: string,
  locationName?: string
): ItemReference => {
  return {
    id: item.id,
    name: item.name,
    type: "item",
    description: item.description || "",
    currentHolder: holderName || item.current_holder_id || undefined,
    lastUpdate: item.updated_at,
    tags: item.tags || [],
  };
};

/**
 * Converts a SessionPlanRow to a SessionPlan
 */
export const convertSessionPlanRowToSessionPlan = (
  planRow: SessionPlanRow
): SessionPlan => {
  // Parse JSON fields
  const objectives = planRow.objectives ? (planRow.objectives as string[]) : [];
  const entities = planRow.involved_entities
    ? (planRow.involved_entities as any)
    : {
        npcs: [],
        locations: [],
        items: [],
        factions: [],
      };
  const storyBeats = planRow.story_beats ? (planRow.story_beats as any[]) : [];

  return {
    id: planRow.id,
    title: planRow.title,
    summary: planRow.summary || "",
    objectives: objectives,
    involvedEntities: {
      npcs: entities.npcs || [],
      locations: entities.locations || [],
      items: entities.items || [],
      factions: entities.factions || [],
    },
    storyBeats: storyBeats.map((beat) => ({
      ...beat,
      id: beat.id || crypto.randomUUID(),
    })),
    tags: planRow.tags || [],
    difficulty: (planRow.difficulty as any) || "medium",
    estimatedDuration: planRow.estimated_duration || 0,
    campaignId: planRow.campaign_id,
    createdAt: planRow.created_at,
    updatedAt: planRow.updated_at,
  };
};

/**
 * Converts a SessionPlan to a database-ready object
 */
export const convertSessionPlanToDbObject = (
  plan: SessionPlan
): Partial<SessionPlanRow> => {
  return {
    id: plan.id,
    campaign_id: plan.campaignId,
    title: plan.title,
    summary: plan.summary,
    objectives: plan.objectives as any,
    involved_entities: plan.involvedEntities as any,
    story_beats: plan.storyBeats as any,
    tags: plan.tags,
    difficulty: plan.difficulty,
    estimated_duration: plan.estimatedDuration,
  };
};
