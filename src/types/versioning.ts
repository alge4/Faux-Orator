import { Database } from "./database.types";
import { Json } from "./supabase";
import { EntityType } from "./locking";

export type EntityVersion =
  Database["public"]["Tables"]["entity_versions"]["Row"];
export type SharedEntity =
  Database["public"]["Tables"]["shared_entities"]["Row"];
export type ActivityLog =
  Database["public"]["Tables"]["agent_activity_logs"]["Row"];
export type ConflictQueueItem =
  Database["public"]["Tables"]["conflict_resolution_queue"]["Row"];

export type CampaignMode = "Planning" | "Running" | "Review";
export type ResolutionStrategy = "auto" | "dm_manual" | "rule_applied";
export type PriorityLevel = "low" | "medium" | "high";

export interface VersionCreateRequest {
  entity_id: string;
  entity_type: EntityType;
  data: Json;
  change_summary?: string;
  created_by: string;
  campaign_id: string;
}

export interface VersionRollbackRequest {
  entity_id: string;
  entity_type: EntityType;
  version_number: number;
  campaign_id: string;
  rollback_agent: string;
  notes?: string;
}

export interface ActivityLogCreateRequest {
  agent_name: string;
  entity_id: string;
  entity_type: EntityType;
  field_modified: string;
  old_value: Json;
  new_value: Json;
  mode: CampaignMode;
  campaign_id: string;
  can_rollback?: boolean;
}

export interface ConflictCreateRequest {
  entity_id: string;
  entity_type: EntityType;
  field: string;
  proposed_values: Json[];
  source_agents: string[];
  priority: PriorityLevel;
  auto_resolvable?: boolean;
  requires_dm?: boolean;
  campaign_id: string;
}

export interface ConflictResolveRequest {
  conflict_id: string;
  resolved_by: string;
  resolution_strategy: ResolutionStrategy;
  resolution_notes?: string;
  selected_value_index?: number;
}

export interface EntityShareRequest {
  entity_id: string;
  entity_type: EntityType;
  source_campaign_id: string;
  is_global?: boolean;
  shared_with_campaigns?: string[];
  sharing_settings?: {
    allow_modifications?: boolean;
    sync_changes?: boolean;
    attribute_source?: boolean;
  };
}
