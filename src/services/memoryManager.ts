import { supabase } from "./supabase";
import { AgentMemory, MemoryManager, MemoryType } from "../types/memory";
import { v4 as uuidv4 } from "uuid";

export class SupabaseMemoryManager implements MemoryManager {
  async store(memory: Omit<AgentMemory, "id" | "created_at">): Promise<string> {
    const id = uuidv4();
    const { error } = await supabase.from("agent_memories").insert({
      ...memory,
      id,
      created_at: new Date().toISOString(),
    });

    if (error) throw new Error(`Failed to store memory: ${error.message}`);
    return id;
  }

  async retrieve(agentId: string, type: MemoryType): Promise<AgentMemory[]> {
    const { data, error } = await supabase
      .from("agent_memories")
      .select("*")
      .eq("agent_id", agentId)
      .eq("memory_type", type)
      .eq("archived", false)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to retrieve memories: ${error.message}`);
    return data || [];
  }

  async archive(memoryId: string): Promise<void> {
    const { error } = await supabase
      .from("agent_memories")
      .update({ archived: true })
      .eq("id", memoryId);

    if (error) throw new Error(`Failed to archive memory: ${error.message}`);
  }

  async prune(campaignId: string, olderThan: Date): Promise<void> {
    const { error } = await supabase
      .from("agent_memories")
      .update({ archived: true })
      .eq("campaign_id", campaignId)
      .lt("created_at", olderThan.toISOString())
      .eq("memory_type", "short_term");

    if (error) throw new Error(`Failed to prune memories: ${error.message}`);
  }
}
