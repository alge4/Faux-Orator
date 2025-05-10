import { supabase } from "./supabase";
import {
  ConflictResolution,
  ConflictManager,
  ResolutionStrategy,
} from "../types/conflicts";
import { v4 as uuidv4 } from "uuid";

export class SupabaseConflictManager implements ConflictManager {
  async createConflict(
    conflict: Omit<ConflictResolution, "id" | "created_at" | "resolved_at">
  ): Promise<string> {
    const id = uuidv4();
    const { error } = await supabase.from("conflict_resolutions").insert({
      ...conflict,
      id,
      created_at: new Date().toISOString(),
    });

    if (error) throw new Error(`Failed to create conflict: ${error.message}`);
    return id;
  }

  async resolveConflict(
    conflictId: string,
    resolution: {
      value: any;
      strategy: ResolutionStrategy;
      notes?: string;
    }
  ): Promise<void> {
    const { error } = await supabase
      .from("conflict_resolutions")
      .update({
        resolved_at: new Date().toISOString(),
        resolution_strategy: resolution.strategy,
        resolution_notes: resolution.notes,
        final_value: resolution.value,
      })
      .eq("id", conflictId);

    if (error) throw new Error(`Failed to resolve conflict: ${error.message}`);

    // Update the entity with the resolved value
    const { data: conflict } = await supabase
      .from("conflict_resolutions")
      .select("entity_id, field")
      .eq("id", conflictId)
      .single();

    if (conflict) {
      const { error: updateError } = await supabase
        .from("entities")
        .update({ [conflict.field]: resolution.value })
        .eq("id", conflict.entity_id);

      if (updateError)
        throw new Error(`Failed to update entity: ${updateError.message}`);
    }
  }

  async getUnresolvedConflicts(
    campaignId: string
  ): Promise<ConflictResolution[]> {
    const { data, error } = await supabase
      .from("conflict_resolutions")
      .select("*")
      .eq("campaign_id", campaignId)
      .is("resolved_at", null)
      .order("created_at", { ascending: false });

    if (error)
      throw new Error(`Failed to get unresolved conflicts: ${error.message}`);
    return data || [];
  }

  async getConflictHistory(
    entityId: string,
    field?: string
  ): Promise<ConflictResolution[]> {
    let query = supabase
      .from("conflict_resolutions")
      .select("*")
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false });

    if (field) {
      query = query.eq("field", field);
    }

    const { data, error } = await query;

    if (error)
      throw new Error(`Failed to get conflict history: ${error.message}`);
    return data || [];
  }
}
