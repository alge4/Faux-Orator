import {
  ApproveRevisionRequest,
  EntityLockRequest,
  EntityType,
  FieldLockRequest,
  LockValidationResult,
  LockableEntity,
  RevisionRequest,
} from "../types/locking";
import { supabase } from "../supabase/client";

class LockingService {
  /**
   * Check if an entity can be modified by agents
   */
  public async canModifyEntity(
    entityId: string,
    entityType: EntityType,
    field?: string
  ): Promise<LockValidationResult> {
    try {
      // Get the entity
      const { data: entity, error } = await supabase
        .from(this.getTableName(entityType))
        .select("writeable_by_agents, frozen_by_dm, locked_fields, unlock_at")
        .eq("id", entityId)
        .single();

      if (error) {
        throw error;
      }

      if (!entity) {
        return { canWrite: false, reason: "Entity not found" };
      }

      // Convert to LockableEntity
      const lockData = entity as LockableEntity;

      // Check if entity is frozen
      if (lockData.frozen_by_dm) {
        return { canWrite: false, reason: "Entity is frozen by DM" };
      }

      // Check if entity is writeable by agents
      if (!lockData.writeable_by_agents) {
        return { canWrite: false, reason: "Entity is not writeable by agents" };
      }

      // Check for time-based locks
      if (lockData.unlock_at && new Date(lockData.unlock_at) > new Date()) {
        return {
          canWrite: false,
          reason: `Entity is locked until ${new Date(
            lockData.unlock_at
          ).toLocaleString()}`,
        };
      }

      // Check for field-specific locks
      if (
        field &&
        lockData.locked_fields &&
        lockData.locked_fields.includes(field)
      ) {
        return {
          canWrite: false,
          reason: `Field "${field}" is locked`,
          fieldsLocked: lockData.locked_fields,
        };
      }

      return { canWrite: true };
    } catch (error) {
      console.error("Error checking entity modification permissions:", error);
      return { canWrite: false, reason: `Error: ${error}` };
    }
  }

  /**
   * Lock an entire entity
   */
  public async lockEntity(request: EntityLockRequest): Promise<boolean> {
    try {
      const updateData: Partial<LockableEntity> = {};

      if (request.writeable_by_agents !== undefined) {
        updateData.writeable_by_agents = request.writeable_by_agents;
      }

      if (request.frozen_by_dm !== undefined) {
        updateData.frozen_by_dm = request.frozen_by_dm;
      }

      if (request.locked_fields !== undefined) {
        updateData.locked_fields = request.locked_fields;
      }

      if (request.unlock_at !== undefined) {
        updateData.unlock_at = request.unlock_at
          ? request.unlock_at.toISOString()
          : null;
      }

      const { error } = await supabase
        .from(this.getTableName(request.entity_type))
        .update(updateData)
        .eq("id", request.entity_id);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error locking entity:", error);
      throw error;
    }
  }

  /**
   * Lock a specific field
   */
  public async lockField(request: FieldLockRequest): Promise<boolean> {
    try {
      // First get current locked fields
      const { data: entity, error } = await supabase
        .from(this.getTableName(request.entity_type))
        .select("locked_fields")
        .eq("id", request.entity_id)
        .single();

      if (error) {
        throw error;
      }

      if (!entity) {
        throw new Error("Entity not found");
      }

      let lockedFields = entity.locked_fields || [];

      if (request.locked) {
        // Add field if not already locked
        if (!lockedFields.includes(request.field)) {
          lockedFields.push(request.field);
        }
      } else {
        // Remove field from locked fields
        lockedFields = lockedFields.filter((f) => f !== request.field);
      }

      // Update entity
      const updateData: Partial<LockableEntity> = {
        locked_fields: lockedFields,
      };

      if (request.unlock_at !== undefined) {
        updateData.unlock_at = request.unlock_at
          ? request.unlock_at.toISOString()
          : null;
      }

      const { error: updateError } = await supabase
        .from(this.getTableName(request.entity_type))
        .update(updateData)
        .eq("id", request.entity_id);

      if (updateError) {
        throw updateError;
      }

      return true;
    } catch (error) {
      console.error("Error locking field:", error);
      throw error;
    }
  }

  /**
   * Get a list of lockable fields for an entity type
   */
  public async getLockableFields(entityType: EntityType): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from("lockable_fields")
        .select("field_name")
        .eq("entity_type", entityType);

      if (error) {
        throw error;
      }

      return data?.map((field) => field.field_name) || [];
    } catch (error) {
      console.error("Error getting lockable fields:", error);
      throw error;
    }
  }

  /**
   * Queue a revision request when a field is locked
   */
  public async queueRevision(request: RevisionRequest): Promise<string> {
    try {
      const { data, error } = await supabase
        .from("revision_queue")
        .insert([
          {
            entity_id: request.entity_id,
            entity_type: request.entity_type,
            field: request.field,
            current_value: request.current_value,
            proposed_value: request.proposed_value,
            agent_id: request.agent_id,
            notes: request.notes,
          },
        ])
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      return data?.id;
    } catch (error) {
      console.error("Error queuing revision:", error);
      throw error;
    }
  }

  /**
   * Approve or reject a revision request
   */
  public async approveRevision(
    request: ApproveRevisionRequest
  ): Promise<boolean> {
    try {
      // Update the revision
      const { error: updateError } = await supabase
        .from("revision_queue")
        .update({
          approved: request.approved,
          approved_at: new Date().toISOString(),
          approved_by: request.approved_by,
          notes: request.notes,
        })
        .eq("id", request.revision_id);

      if (updateError) {
        throw updateError;
      }

      // If approved, we need to apply the change to the entity
      if (request.approved) {
        // Get the revision details
        const { data: revision, error: revisionError } = await supabase
          .from("revision_queue")
          .select("entity_id, entity_type, field, proposed_value")
          .eq("id", request.revision_id)
          .single();

        if (revisionError) {
          throw revisionError;
        }

        if (!revision) {
          throw new Error("Revision not found");
        }

        // Apply the change to the entity
        const updateData: Record<string, any> = {};
        updateData[revision.field] = revision.proposed_value;

        const { error: entityError } = await supabase
          .from(this.getTableName(revision.entity_type as EntityType))
          .update(updateData)
          .eq("id", revision.entity_id);

        if (entityError) {
          throw entityError;
        }
      }

      return true;
    } catch (error) {
      console.error("Error approving revision:", error);
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

export const lockingService = new LockingService();
