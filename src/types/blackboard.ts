export type TaskType = "plot_point" | "event" | "location" | "note";
export type TaskStatus = "incomplete" | "in_progress" | "resolved" | "blocked";
export type TaskPriority = "low" | "normal" | "high";

export interface BlackboardTask {
  id: string;
  campaign_id: string;
  type: TaskType;
  status: TaskStatus;
  agents: string[];
  priority: TaskPriority;
  title: string;
  description?: string;
  context_refs?: string[];
  parent_task_id?: string;
  blocked_by?: string[];
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  created_by: string;
}

export interface BlackboardManager {
  createTask(
    task: Omit<BlackboardTask, "id" | "created_at" | "updated_at" | "status">
  ): Promise<string>;

  updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    notes?: string
  ): Promise<void>;

  getTasksByAgent(agentId: string): Promise<BlackboardTask[]>;

  getTasksByType(campaignId: string, type: TaskType): Promise<BlackboardTask[]>;

  getBlockedTasks(campaignId: string): Promise<BlackboardTask[]>;

  addAgentToTask(taskId: string, agentId: string): Promise<void>;

  removeAgentFromTask(taskId: string, agentId: string): Promise<void>;

  linkTasks(parentTaskId: string, childTaskId: string): Promise<void>;
}
