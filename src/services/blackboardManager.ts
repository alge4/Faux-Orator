import { supabase } from "./supabase";
import {
  BlackboardTask,
  BlackboardManager,
  TaskStatus,
  TaskType,
} from "../types/blackboard";
import { v4 as uuidv4 } from "uuid";

export class SupabaseBlackboardManager implements BlackboardManager {
  async createTask(
    task: Omit<BlackboardTask, "id" | "created_at" | "updated_at" | "status">
  ): Promise<string> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const { error } = await supabase.from("blackboard_tasks").insert({
      ...task,
      id,
      status: "incomplete",
      created_at: now,
      updated_at: now,
    });

    if (error) throw new Error(`Failed to create task: ${error.message}`);
    return id;
  }

  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    notes?: string
  ): Promise<void> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "resolved") {
      updates.resolved_at = new Date().toISOString();
    }

    if (notes) {
      const { data: currentTask } = await supabase
        .from("blackboard_tasks")
        .select("notes")
        .eq("id", taskId)
        .single();

      updates.notes = currentTask?.notes
        ? [
            ...currentTask.notes,
            { timestamp: new Date().toISOString(), content: notes },
          ]
        : [{ timestamp: new Date().toISOString(), content: notes }];
    }

    const { error } = await supabase
      .from("blackboard_tasks")
      .update(updates)
      .eq("id", taskId);

    if (error)
      throw new Error(`Failed to update task status: ${error.message}`);
  }

  async getTasksByAgent(agentId: string): Promise<BlackboardTask[]> {
    const { data, error } = await supabase
      .from("blackboard_tasks")
      .select("*")
      .contains("agents", [agentId])
      .order("created_at", { ascending: false });

    if (error)
      throw new Error(`Failed to get tasks by agent: ${error.message}`);
    return data || [];
  }

  async getTasksByType(
    campaignId: string,
    type: TaskType
  ): Promise<BlackboardTask[]> {
    const { data, error } = await supabase
      .from("blackboard_tasks")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("type", type)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to get tasks by type: ${error.message}`);
    return data || [];
  }

  async getBlockedTasks(campaignId: string): Promise<BlackboardTask[]> {
    const { data, error } = await supabase
      .from("blackboard_tasks")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("status", "blocked")
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to get blocked tasks: ${error.message}`);
    return data || [];
  }

  async addAgentToTask(taskId: string, agentId: string): Promise<void> {
    const { data: task, error: fetchError } = await supabase
      .from("blackboard_tasks")
      .select("agents")
      .eq("id", taskId)
      .single();

    if (fetchError)
      throw new Error(`Failed to fetch task: ${fetchError.message}`);

    const updatedAgents = [...(task?.agents || []), agentId];
    const { error } = await supabase
      .from("blackboard_tasks")
      .update({
        agents: updatedAgents,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    if (error) throw new Error(`Failed to add agent to task: ${error.message}`);
  }

  async removeAgentFromTask(taskId: string, agentId: string): Promise<void> {
    const { data: task, error: fetchError } = await supabase
      .from("blackboard_tasks")
      .select("agents")
      .eq("id", taskId)
      .single();

    if (fetchError)
      throw new Error(`Failed to fetch task: ${fetchError.message}`);

    const updatedAgents = (task?.agents || []).filter((id) => id !== agentId);
    const { error } = await supabase
      .from("blackboard_tasks")
      .update({
        agents: updatedAgents,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    if (error)
      throw new Error(`Failed to remove agent from task: ${error.message}`);
  }

  async linkTasks(parentTaskId: string, childTaskId: string): Promise<void> {
    const { error } = await supabase
      .from("blackboard_tasks")
      .update({
        parent_task_id: parentTaskId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", childTaskId);

    if (error) throw new Error(`Failed to link tasks: ${error.message}`);
  }
}
