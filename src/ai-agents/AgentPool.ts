import { BaseAgent, AgentContext, AgentResponse } from "./BaseAgent";
import { DMAssistantAgent } from "./DMAssistantAgent";
import { DialogueAgent } from "./DialogueAgent";
import { NPCAgent } from "./NPCAgent";
import { SessionPlanningAgent } from "./SessionPlanningAgent";
import { ClaudeAgent } from "./ClaudeAgent";
import { ResourceQueue } from "../services/resourceQueue";
import env from "../config/env";

export interface AgentPoolConfig {
  maxConcurrentAgents?: number;
  enabledAgents?: string[];
  rulesVersion?: string;
  preferredProvider?: "openai" | "claude" | "auto";
}

export class AgentPool {
  private agents: Map<string, BaseAgent>;
  private context: AgentContext;
  private config: AgentPoolConfig;
  private resourceQueue: ResourceQueue;

  constructor(context: AgentContext, config: AgentPoolConfig = {}) {
    this.agents = new Map();
    this.context = context;
    this.config = {
      maxConcurrentAgents: 3,
      enabledAgents: ["dm", "dialogue", "npc", "session", "claude"],
      rulesVersion: "5.5E",
      preferredProvider: "auto",
      ...config,
    };
    this.resourceQueue = new ResourceQueue(this.config.maxConcurrentAgents);

    this.initializeAgents();
  }

  private initializeAgents(): void {
    if (this.config.enabledAgents.includes("dm")) {
      this.agents.set("dm", new DMAssistantAgent(this.context));
    }
    if (this.config.enabledAgents.includes("dialogue")) {
      this.agents.set("dialogue", new DialogueAgent(this.context));
    }
    if (this.config.enabledAgents.includes("npc")) {
      this.agents.set("npc", new NPCAgent(this.context));
    }
    if (this.config.enabledAgents.includes("session")) {
      this.agents.set("session", new SessionPlanningAgent(this.context));
    }
    if (this.config.enabledAgents.includes("claude")) {
      this.agents.set(
        "claude",
        new ClaudeAgent(this.context, {
          model: env.claude.defaultModel,
        })
      );
    }
  }

  async processWithAgent(
    agentType: string,
    input: any,
    priority: number = 1
  ): Promise<AgentResponse> {
    const agent = this.agents.get(agentType);
    if (!agent) {
      throw new Error(`Agent type ${agentType} not found in pool`);
    }

    return this.resourceQueue.enqueue(
      `${agentType}-${Date.now()}`,
      priority,
      () => agent.process(input)
    );
  }

  getAgent(agentType: string): BaseAgent | undefined {
    return this.agents.get(agentType);
  }

  getActiveAgentCount(): number {
    return this.resourceQueue.getActiveRequestCount();
  }

  getQueuedRequestCount(): number {
    return this.resourceQueue.getQueueLength();
  }

  clearQueue(): void {
    this.resourceQueue.clearQueue();
  }

  // Get the best available agent based on preferences and available API keys
  getBestAgent(type: string): BaseAgent {
    // If the specific agent type exists, return that
    if (this.agents.has(type)) {
      return this.agents.get(type)!;
    }

    // Otherwise use preferred provider config
    if (
      this.config.preferredProvider === "claude" &&
      this.agents.has("claude")
    ) {
      return this.agents.get("claude")!;
    } else if (
      this.config.preferredProvider === "openai" &&
      (this.agents.has("dm") || this.agents.has("dialogue"))
    ) {
      return this.agents.get("dm") || this.agents.get("dialogue")!;
    }

    // Auto selection or fallback
    if (this.agents.has("claude") && env.claude.apiKey) {
      return this.agents.get("claude")!;
    } else if (this.agents.has("dm") || this.agents.has("dialogue")) {
      return this.agents.get("dm") || this.agents.get("dialogue")!;
    }

    // Last resort fallback
    throw new Error("No suitable agent found for processing the request");
  }

  async brainstorm(topic: string, agents: string[]): Promise<AgentResponse[]> {
    const selectedAgents = agents.filter((agent) => this.agents.has(agent));
    if (selectedAgents.length === 0) {
      throw new Error("No valid agents selected for brainstorming");
    }

    // Process in parallel up to maxConcurrentAgents
    const results: AgentResponse[] = [];
    for (
      let i = 0;
      i < selectedAgents.length;
      i += this.config.maxConcurrentAgents
    ) {
      const batch = selectedAgents.slice(
        i,
        i + this.config.maxConcurrentAgents
      );
      const batchResults = await Promise.all(
        batch.map((agentType) =>
          this.processWithAgent(agentType, {
            type: "brainstorm",
            topic,
            rulesVersion: this.config.rulesVersion,
          })
        )
      );
      results.push(...batchResults);
    }
    return results;
  }

  getRulesVersion(): string {
    return this.config.rulesVersion || "5.5E";
  }

  setRulesVersion(version: string) {
    this.config.rulesVersion = version;
  }

  getEnabledAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  isAgentEnabled(agentType: string): boolean {
    return this.agents.has(agentType);
  }

  setPreferredProvider(provider: "openai" | "claude" | "auto") {
    this.config.preferredProvider = provider;
  }

  getPreferredProvider(): string {
    return this.config.preferredProvider || "auto";
  }
}
