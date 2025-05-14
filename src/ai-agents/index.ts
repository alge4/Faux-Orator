// Export all agent types
export * from "./BaseAgent";
export * from "./AgentPool";
export * from "./DMAssistantAgent";
export * from "./DialogueAgent";
export * from "./NPCAgent";
export * from "./SessionPlanningAgent";
export * from "./ClaudeAgent";
export * from "./NPCAgentFactory";
export * from "./IndividualNPCAgent";

// Register the NPCAgentFactory with the AgentPool
import { AgentPool } from "./AgentPool";
import { NPCAgentFactory } from "./NPCAgentFactory";

// Extend the AgentPool with NPC Agent Factory functionality
declare module "./AgentPool" {
  interface AgentPool {
    getNPCAgentFactory(): NPCAgentFactory;
  }
}

// Add getNPCAgentFactory method to AgentPool prototype
AgentPool.prototype.getNPCAgentFactory = function (): NPCAgentFactory {
  // Create NPCAgentFactory with the same context used by the AgentPool
  return new NPCAgentFactory(this.context);
};
