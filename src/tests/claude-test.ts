import { ClaudeAgent } from "../ai-agents/ClaudeAgent";
import { claudeService } from "../services/claude";

// Simple test to verify Claude integration

async function testClaude() {
  console.log("Starting Claude API test...");

  try {
    // Simple direct API call to test connectivity
    const testMessage = {
      role: "user",
      content:
        "Hello Claude! Can you provide a brief introduction to yourself in just one short paragraph?",
    };

    const response = await claudeService.getChatCompletion([testMessage], {
      content: "You are a helpful assistant. Keep your responses concise.",
    });

    console.log("Direct Claude API Response:");
    console.log(response.content);
    console.log("\n---\n");

    // Test the ClaudeAgent implementation
    const agent = new ClaudeAgent({
      sessionId: "test-session",
      campaignId: "test-campaign",
      userId: "test-user",
      timestamp: new Date().toISOString(),
    });

    // Test simple text input
    const textResult = await agent.process(
      "Generate a name for a fantasy tavern."
    );
    console.log("ClaudeAgent Text Response:");
    console.log(textResult.data?.content);
    console.log("\n---\n");

    // Test creative input
    const creativeResult = await agent.process({
      type: "creative",
      creativeType: "location",
      prompt: "Create a description for a secret underground library.",
    });

    console.log("ClaudeAgent Creative Response:");
    console.log(creativeResult.data?.content);
    console.log("\n---\n");

    console.log("Claude API test completed successfully!");
  } catch (error) {
    console.error("Error testing Claude integration:", error);
  }
}

// Run the test when this file is executed directly
if (require.main === module) {
  testClaude();
}

export { testClaude };
