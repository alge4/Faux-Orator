import { EntityType } from "../types/locking";
import {
  ActivityLogCreateRequest,
  CampaignMode,
  ConflictCreateRequest,
  ConflictQueueItem,
  ConflictResolveRequest,
  EntityShareRequest,
  PriorityLevel,
  VersionCreateRequest,
  VersionRollbackRequest,
} from "../types/versioning";
import { supabase } from "../supabase/client";
import { Json } from "../types/supabase";

class ConflictService {
  /**
   * Record an activity log
   */
  public async logActivity(
    activityLog: ActivityLogCreateRequest
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from("agent_activity_logs")
        .insert([
          {
            agent_name: activityLog.agent_name,
            entity_id: activityLog.entity_id,
            entity_type: activityLog.entity_type,
            field_modified: activityLog.field_modified,
            old_value: activityLog.old_value,
            new_value: activityLog.new_value,
            mode: activityLog.mode,
            campaign_id: activityLog.campaign_id,
            can_rollback: activityLog.can_rollback ?? true,
          },
        ])
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      return data?.id;
    } catch (error) {
      console.error("Error logging activity:", error);
      throw error;
    }
  }

  /**
   * Create a conflict entry when multiple agents propose different values
   */
  public async createConflict(
    conflict: ConflictCreateRequest
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from("conflict_resolution_queue")
        .insert([
          {
            entity_id: conflict.entity_id,
            entity_type: conflict.entity_type,
            field: conflict.field,
            proposed_values: conflict.proposed_values,
            source_agents: conflict.source_agents,
            priority: conflict.priority,
            auto_resolvable: conflict.auto_resolvable ?? false,
            requires_dm: conflict.requires_dm ?? true,
            campaign_id: conflict.campaign_id,
          },
        ])
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      return data?.id;
    } catch (error) {
      console.error("Error creating conflict:", error);
      throw error;
    }
  }

  /**
   * Resolve a conflict by selecting one of the proposed values
   */
  public async resolveConflict(
    request: ConflictResolveRequest
  ): Promise<boolean> {
    try {
      // First get the conflict details
      const { data: conflict, error: conflictError } = await supabase
        .from("conflict_resolution_queue")
        .select("*")
        .eq("id", request.conflict_id)
        .single();

      if (conflictError) {
        throw conflictError;
      }

      if (!conflict) {
        throw new Error("Conflict not found");
      }

      // Mark conflict as resolved
      const { error: updateError } = await supabase
        .from("conflict_resolution_queue")
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: request.resolved_by,
          resolution_strategy: request.resolution_strategy,
          resolution_notes: request.resolution_notes,
        })
        .eq("id", request.conflict_id);

      if (updateError) {
        throw updateError;
      }

      // Apply the selected value to the entity if provided
      if (request.selected_value_index !== undefined) {
        // Ensure index is valid
        if (
          request.selected_value_index < 0 ||
          request.selected_value_index >=
            (conflict.proposed_values as Json[]).length
        ) {
          throw new Error("Invalid selected value index");
        }

        const selectedValue = (conflict.proposed_values as Json[])[
          request.selected_value_index
        ];

        // Apply the change to the entity
        const updateData: Record<string, any> = {};
        updateData[conflict.field] = selectedValue;

        const { error: entityError } = await supabase
          .from(this.getTableName(conflict.entity_type as EntityType))
          .update(updateData)
          .eq("id", conflict.entity_id);

        if (entityError) {
          throw entityError;
        }

        // Log the activity
        await this.logActivity({
          agent_name: "ConflictResolver",
          entity_id: conflict.entity_id,
          entity_type: conflict.entity_type as EntityType,
          field_modified: conflict.field,
          old_value: null, // We don't know the old value here
          new_value: selectedValue,
          mode: "Planning" as CampaignMode, // Default to Planning
          campaign_id: conflict.campaign_id,
        });
      }

      return true;
    } catch (error) {
      console.error("Error resolving conflict:", error);
      throw error;
    }
  }

  /**
   * Create a version of an entity for rollback purposes
   */
  public async createVersion(version: VersionCreateRequest): Promise<number> {
    try {
      // Get current version number
      const { data: versions, error: versionsError } = await supabase
        .from("entity_versions")
        .select("version_number")
        .eq("entity_id", version.entity_id)
        .eq("entity_type", version.entity_type)
        .order("version_number", { ascending: false })
        .limit(1);

      if (versionsError) {
        throw versionsError;
      }

      let versionNumber = 1;
      if (versions && versions.length > 0) {
        versionNumber = versions[0].version_number + 1;
      }

      // Insert new version
      const { error } = await supabase.from("entity_versions").insert([
        {
          entity_id: version.entity_id,
          entity_type: version.entity_type,
          version_number: versionNumber,
          data: version.data,
          created_by: version.created_by,
          change_summary: version.change_summary,
          campaign_id: version.campaign_id,
        },
      ]);

      if (error) {
        throw error;
      }

      return versionNumber;
    } catch (error) {
      console.error("Error creating version:", error);
      throw error;
    }
  }

  /**
   * Roll back an entity to a previous version
   */
  public async rollbackVersion(
    request: VersionRollbackRequest
  ): Promise<boolean> {
    try {
      // Get the requested version
      const { data: version, error: versionError } = await supabase
        .from("entity_versions")
        .select("data")
        .eq("entity_id", request.entity_id)
        .eq("entity_type", request.entity_type)
        .eq("version_number", request.version_number)
        .eq("campaign_id", request.campaign_id)
        .single();

      if (versionError) {
        throw versionError;
      }

      if (!version) {
        throw new Error("Version not found");
      }

      // Apply the rollback by updating the entity
      const { error: updateError } = await supabase
        .from(this.getTableName(request.entity_type))
        .update(version.data)
        .eq("id", request.entity_id);

      if (updateError) {
        throw updateError;
      }

      // Log the rollback
      await this.logActivity({
        agent_name: request.rollback_agent,
        entity_id: request.entity_id,
        entity_type: request.entity_type,
        field_modified: "ROLLBACK",
        old_value: null,
        new_value: {
          version: request.version_number,
          notes: request.notes || "Rollback to previous version",
        },
        mode: "Planning", // Default to Planning
        campaign_id: request.campaign_id,
      });

      return true;
    } catch (error) {
      console.error("Error rolling back version:", error);
      throw error;
    }
  }

  /**
   * Share an entity between campaigns
   */
  public async shareEntity(request: EntityShareRequest): Promise<string> {
    try {
      const { data, error } = await supabase
        .from("shared_entities")
        .insert([
          {
            entity_id: request.entity_id,
            entity_type: request.entity_type,
            source_campaign_id: request.source_campaign_id,
            is_global: request.is_global ?? false,
            shared_with_campaigns: request.shared_with_campaigns,
            sharing_settings: request.sharing_settings
              ? {
                  allow_modifications:
                    request.sharing_settings.allow_modifications ?? false,
                  sync_changes: request.sharing_settings.sync_changes ?? true,
                  attribute_source:
                    request.sharing_settings.attribute_source ?? true,
                }
              : undefined,
          },
        ])
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      return data?.id;
    } catch (error) {
      console.error("Error sharing entity:", error);
      throw error;
    }
  }

  /**
   * Check if a conflict is auto-resolvable based on field and priority
   */
  public isAutoResolvable(
    entityType: EntityType,
    field: string,
    priority: PriorityLevel
  ): boolean {
    // Implement rules for auto-resolution
    // Example: Low priority conflicts on certain fields might be auto-resolvable
    const autoResolvableFields: Record<EntityType, string[]> = {
      npc: ["name", "description"],
      location: ["description"],
      item: ["description"],
      faction: ["description"],
      story_arc: [],
    };

    // Low priority changes to certain fields can be auto-resolved
    if (
      priority === "low" &&
      autoResolvableFields[entityType].includes(field)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Get all pending conflicts for a campaign
   */
  public async getPendingConflicts(
    campaignId: string
  ): Promise<ConflictQueueItem[]> {
    try {
      const { data, error } = await supabase
        .from("conflict_resolution_queue")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("resolved", false)
        .order("timestamp", { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error getting pending conflicts:", error);
      throw error;
    }
  }

  /**
   * Get the table name for an entity type
   */
  private getTableName(entityType: EntityType): string {
    const tableMap: Record<EntityType, string> = {
      npc: "npcs",
      location: "locations",
      item: "items",
      faction: "factions",
      story_arc: "story_arcs",
    };

    return tableMap[entityType] || entityType;
  }
}

export const conflictService = new ConflictService();
