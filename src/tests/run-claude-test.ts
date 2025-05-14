import { AgentPool } from "../ai-agents/AgentPool";
import { ClaudeAgent } from "../ai-agents/ClaudeAgent";

async function runClaudeTest() {
  console.log("Starting Claude integration test...");

  // Create a test context
  const context = {
    sessionId: "test-session",
    campaignId: "test-campaign",
    userId: "test-user",
    timestamp: new Date().toISOString(),
  };

  console.log("1. Testing direct Claude agent...");
  const claudeAgent = new ClaudeAgent(context);

  try {
    // Test simple request
    const simpleResponse = await claudeAgent.process(
      "Generate a quick description of a fantasy character."
    );

    console.log("Claude Agent Response:");
    console.log(simpleResponse.data?.content);
    console.log("\n---\n");

    // Test a more complex request
    const complexResponse = await claudeAgent.process({
      type: "creative",
      creativeType: "plot",
      prompt: "Create a short adventure hook involving a mysterious artifact.",
    });

    console.log("Claude Creative Response:");
    console.log(complexResponse.data?.content);
    console.log("\n---\n");
  } catch (error) {
    console.error("Error in direct Claude agent test:", error);
  }

  console.log("2. Testing Claude via Agent Pool...");

  try {
    // Create agent pool with Claude preferred
    const pool = new AgentPool(context, {
      preferredProvider: "claude",
      enabledAgents: ["claude"],
    });

    // Verify Claude is registered
    console.log("Enabled agents:", pool.getEnabledAgents());

    // Get the best agent (should be Claude)
    const bestAgent = pool.getBestAgent("any");
    console.log("Best agent type:", bestAgent.constructor.name);

    // Test via the pool
    const poolResponse = await pool.processWithAgent(
      "claude",
      "What's a good puzzle to include in a dungeon?"
    );

    console.log("Agent Pool Response:");
    console.log(poolResponse.data?.content);
  } catch (error) {
    console.error("Error in agent pool test:", error);
  }

  console.log("\nClaude integration test completed!");
}

// Run the test
runClaudeTest().catch((error) => {
  console.error("Test failed with error:", error);
});
