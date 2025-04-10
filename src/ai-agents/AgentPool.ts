import { BaseAgent, AgentContext, AgentResponse } from "./BaseAgent";
import { DMAssistantAgent } from "./DMAssistantAgent";
import { DialogueAgent } from "./DialogueAgent";
import { NPCAgent } from "./NPCAgent";
import { SessionPlanningAgent } from "./SessionPlanningAgent";

export interface AgentPoolConfig {
  maxConcurrentAgents?: number;
  enabledAgents?: string[];
  rulesVersion?: string;
}

export class AgentPool {
  private agents: Map<string, BaseAgent>;
  private context: AgentContext;
  private config: AgentPoolConfig;

  constructor(context: AgentContext, config: AgentPoolConfig = {}) {
    this.agents = new Map();
    this.context = context;
    this.config = {
      maxConcurrentAgents: 3,
      enabledAgents: ["dm", "dialogue", "npc", "session"],
      rulesVersion: "5.5E",
      ...config,
    };

    this.initializeAgents();
  }

  private initializeAgents() {
    if (this.config.enabledAgents?.includes("dm")) {
      this.agents.set("dm", new DMAssistantAgent(this.context));
    }
    if (this.config.enabledAgents?.includes("dialogue")) {
      this.agents.set("dialogue", new DialogueAgent(this.context));
    }
    if (this.config.enabledAgents?.includes("npc")) {
      this.agents.set("npc", new NPCAgent(this.context));
    }
    if (this.config.enabledAgents?.includes("session")) {
      this.agents.set("session", new SessionPlanningAgent(this.context));
    }
  }

  async processWithAgent(
    agentType: string,
    input: any
  ): Promise<AgentResponse> {
    const agent = this.agents.get(agentType);
    if (!agent) {
      throw new Error(`Agent type ${agentType} not found or not enabled`);
    }
    return agent.process(input);
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
}
