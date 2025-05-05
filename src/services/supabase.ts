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

// Create Supabase client with improved error handling
export const supabase = createClient<Database>(
  supabaseUrl || "",
  supabaseKey || "",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        "X-Client-Info": "faux-orator-app", 
      },
      fetch: (...args) => {
        const fetchPromise = fetch(...args);
        
        // Add a timeout to the fetch request
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Request timed out'));
          }, 10000); // 10 second timeout
        });
        
        return Promise.race([fetchPromise, timeoutPromise])
          .catch(error => {
            console.error(`Supabase fetch error: ${error.message}`);
            throw error;
          });
      }
    }
  }
);

// Ping function to check Supabase connectivity
export const pingSupabase = async () => {
  try {
    const startTime = Date.now();
    const { data, error } = await supabase.from('campaigns').select('count').limit(1);
    const endTime = Date.now();
    
    if (error) {
      console.error('Supabase ping error:', error);
      return { success: false, latency: 0, error: error.message };
    }
    
    return { success: true, latency: endTime - startTime, error: null };
  } catch (error) {
    console.error('Supabase ping exception:', error);
    return { success: false, latency: 0, error: error instanceof Error ? error.message : String(error) };
  }
};

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries
 * @param delay Initial delay in ms
 * @returns Promise with the result of the function
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries = 5,
  delay = 300
): Promise<T> => {
  let retries = 0;
  
  const execute = async (): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      if (retries >= maxRetries) {
        console.error(`Failed after ${maxRetries} retries:`, error);
        throw error;
      }
      
      retries++;
      const waitTime = delay * Math.pow(2, retries - 1);
      console.log(`Retry ${retries}/${maxRetries} after ${waitTime}ms...`);
      
      return new Promise((resolve) => {
        setTimeout(() => resolve(execute()), waitTime);
      });
    }
  };
  
  return execute();
};

// Type-safe query helpers with retry mechanism
export const fetchCampaignById = async (campaignId: string) => {
  return withRetry(() => 
    supabase.from("campaigns").select().eq("id", campaignId).single()
  );
};

export const fetchNPCsByCampaignId = async (campaignId: string) => {
  return withRetry(() => 
    supabase
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
      .eq("campaign_id", campaignId)
  );
};

export const fetchLocationsByCampaignId = async (campaignId: string) => {
  return withRetry(() => 
    supabase
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
      .eq("campaign_id", campaignId)
  );
};

export const fetchFactionsByCampaignId = async (campaignId: string) => {
  return withRetry(() => 
    supabase
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
      .eq("campaign_id", campaignId)
  );
};

export const fetchItemsByCampaignId = async (campaignId: string) => {
  return withRetry(() => 
    supabase
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
      .eq("campaign_id", campaignId)
  );
};

export const fetchSessionPlansByCampaignId = async (campaignId: string) => {
  return withRetry(() => 
    supabase
      .from("session_plans")
      .select()
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })
  );
};

export const fetchStoryArcsByCampaignId = async (campaignId: string) => {
  return withRetry(() => 
    supabase
      .from("story_arcs")
      .select()
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })
  );
};

export const logAgentAction = async (
  campaignId: string,
  sessionId: string | null,
  agentType: string,
  action: string,
  input: any,
  output: any
) => {
  return withRetry(() => 
    supabase.from("agent_logs").insert({
      campaign_id: campaignId,
      session_id: sessionId,
      agent_type: agentType,
      action: action,
      input: input,
      output: output,
    })
  );
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

  return withRetry(() => 
    supabase
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
      .single()
  );
};
