import { createClient } from "@supabase/supabase-js";
import { Database } from "../supabase/types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log Supabase configuration (mask the key for security)
console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key present:", !!supabaseKey);

// Validate that the environment variables are set
if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing Supabase environment variables. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file."
  );
}

export const supabase = createClient<Database>(
  supabaseUrl || "",
  supabaseKey || "",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

// Type-safe query helpers
export const fetchCampaignById = async (campaignId: string) => {
  return supabase.from("campaigns").select().eq("id", campaignId).single();
};

export const fetchNPCsByCampaignId = async (campaignId: string) => {
  return supabase
    .from("npcs")
    .select(
      `
      id, 
      name, 
      description, 
      personality, 
      current_location_id, 
      status, 
      faction_id, 
      tags, 
      created_at, 
      updated_at,
      factions (id, name),
      locations (id, name)
    `
    )
    .eq("campaign_id", campaignId);
};

export const fetchLocationsByCampaignId = async (campaignId: string) => {
  return supabase
    .from("locations")
    .select(
      `
      id, 
      name, 
      description, 
      parent_location_id, 
      tags, 
      created_at, 
      updated_at,
      parent:locations (id, name)
    `
    )
    .eq("campaign_id", campaignId);
};

export const fetchFactionsByCampaignId = async (campaignId: string) => {
  return supabase
    .from("factions")
    .select(
      `
      id, 
      name, 
      description, 
      current_status, 
      tags, 
      created_at, 
      updated_at
    `
    )
    .eq("campaign_id", campaignId);
};

export const fetchItemsByCampaignId = async (campaignId: string) => {
  return supabase
    .from("items")
    .select(
      `
      id, 
      name, 
      description, 
      is_magical, 
      current_holder_id, 
      location_id, 
      tags, 
      created_at, 
      updated_at,
      holder:npcs (id, name),
      location:locations (id, name)
    `
    )
    .eq("campaign_id", campaignId);
};

export const fetchSessionPlansByCampaignId = async (campaignId: string) => {
  return supabase
    .from("session_plans")
    .select()
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });
};

export const fetchStoryArcsByCampaignId = async (campaignId: string) => {
  return supabase
    .from("story_arcs")
    .select()
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });
};

export const logAgentAction = async (
  campaignId: string,
  sessionId: string | null,
  agentType: string,
  action: string,
  input: any,
  output: any
) => {
  return supabase.from("agent_logs").insert({
    campaign_id: campaignId,
    session_id: sessionId,
    agent_type: agentType,
    action: action,
    input: input,
    output: output,
  });
};

export const createSessionPlan = async (
  campaignId: string,
  sessionPlan: any
) => {
  const {
    title,
    summary,
    objectives,
    involvedEntities,
    storyBeats,
    tags,
    difficulty,
    estimatedDuration,
  } = sessionPlan;

  return supabase
    .from("session_plans")
    .insert({
      campaign_id: campaignId,
      title,
      summary,
      objectives,
      involved_entities: involvedEntities,
      story_beats: storyBeats,
      tags,
      difficulty,
      estimated_duration: estimatedDuration,
    })
    .select()
    .single();
};
