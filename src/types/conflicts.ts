export type ConflictPriority = "low" | "medium" | "high";
export type ResolutionStrategy = "auto" | "dm_manual" | "rule_applied";

export interface ConflictResolution {
  id: string;
  entity_id: string;
  field: string;
  proposed_values: {
    value: any;
    source_agent: string;
    confidence: number;
  }[];
  priority: ConflictPriority;
  auto_resolvable: boolean;
  resolution_strategy?: ResolutionStrategy;
  resolved_at?: string;
  resolution_notes?: string;
  campaign_id: string;
  created_at: string;
}

export interface ConflictManager {
  createConflict(
    conflict: Omit<ConflictResolution, "id" | "created_at" | "resolved_at">
  ): Promise<string>;

  resolveConflict(
    conflictId: string,
    resolution: {
      value: any;
      strategy: ResolutionStrategy;
      notes?: string;
    }
  ): Promise<void>;

  getUnresolvedConflicts(campaignId: string): Promise<ConflictResolution[]>;

  getConflictHistory(
    entityId: string,
    field?: string
  ): Promise<ConflictResolution[]>;
}
