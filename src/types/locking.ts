import { Database } from "./database.types";
import { Json } from "./supabase";

export type LockableField =
  Database["public"]["Tables"]["lockable_fields"]["Row"];
export type RevisionQueueItem =
  Database["public"]["Tables"]["revision_queue"]["Row"];

export interface LockableEntity {
  writeable_by_agents: boolean;
  frozen_by_dm: boolean;
  locked_fields: string[];
  unlock_at?: string | null;
}

export interface EntityLockRequest {
  entity_id: string;
  entity_type: EntityType;
  writeable_by_agents?: boolean;
  frozen_by_dm?: boolean;
  locked_fields?: string[];
  unlock_at?: Date | null;
}

export interface FieldLockRequest {
  entity_id: string;
  entity_type: EntityType;
  field: string;
  locked: boolean;
  unlock_at?: Date | null;
}

export type EntityType = "npc" | "location" | "item" | "faction" | "story_arc";

export interface RevisionRequest {
  entity_id: string;
  entity_type: EntityType;
  field: string;
  current_value: Json;
  proposed_value: Json;
  agent_id: string;
  notes?: string;
}

export interface ApproveRevisionRequest {
  revision_id: string;
  approved: boolean;
  approved_by: string;
  notes?: string;
}

export type LockValidationResult = {
  canWrite: boolean;
  reason?: string;
  fieldsLocked?: string[];
};
