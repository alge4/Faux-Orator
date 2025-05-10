export type MemoryType = "short_term" | "long_term" | "shared";

export interface AgentMemory {
  id: string;
  agent_id: string;
  campaign_id: string;
  memory_type: MemoryType;
  context: {
    session_id?: string;
    related_entities: string[];
    importance_score: number;
    data: Record<string, any>;
  };
  created_at: string;
  expires_at?: string;
  archived: boolean;
}

export interface MemoryManager {
  store(memory: Omit<AgentMemory, "id" | "created_at">): Promise<string>;
  retrieve(agentId: string, type: MemoryType): Promise<AgentMemory[]>;
  archive(memoryId: string): Promise<void>;
  prune(campaignId: string, olderThan: Date): Promise<void>;
}
