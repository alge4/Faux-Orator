import { aiService, ChatMessage } from "../services/aiService";

async function testAIService() {
  console.log("Starting Unified AI Service Test");
  console.log("================================");

  try {
    // Check current preferred provider
    const initialProvider = aiService.getPreferredProvider();
    console.log(`Initial preferred provider: ${initialProvider}`);

    // Test with the default provider
    console.log("\n1. Testing with default provider...");
    const defaultResponse = await aiService.getChatCompletion([
      {
        role: "system",
        content:
          "You are a helpful assistant for a tabletop RPG game. Keep your response brief.",
      },
      {
        role: "user",
        content: "Generate a name for a fantasy tavern.",
      },
    ]);

    console.log("Default Provider Response:");
    console.log(defaultResponse.content);
    console.log("\n---\n");

    // Test with Claude explicitly
    console.log("2. Testing with Claude explicitly...");
    const claudeResponse = await aiService.getChatCompletion(
      [
        {
          role: "system",
          content:
            "You are a helpful assistant for a tabletop RPG game. Keep your response brief.",
        },
        {
          role: "user",
          content:
            "Generate a name for a fantasy tavern, with a short description.",
        },
      ],
      { provider: "claude" }
    );

    console.log("Claude Response:");
    console.log(claudeResponse.content);
    console.log("\n---\n");

    // Test with session context
    console.log("3. Testing with session context...");

    // First message
    const sessionId = "test-session-" + Date.now();
    await aiService.getChatCompletion(
      [
        {
          role: "system",
          content: "You are a dungeon master for a D&D campaign. Be concise.",
        },
        {
          role: "user",
          content:
            "I'm a half-elf ranger, what would be a good name for my character?",
        },
      ],
      { sessionId }
    );

    // Follow-up message using same session
    const followupResponse = await aiService.getChatCompletion(
      [
        {
          role: "user",
          content: "Now give me a backstory for this character.",
        },
      ],
      { sessionId }
    );

    console.log("Follow-up Response with Context:");
    console.log(followupResponse.content);
    console.log("\n---\n");

    // Test setting preferred provider
    console.log("4. Testing with changed preferred provider...");

    // Switch preferred provider
    const alternateProvider =
      initialProvider === "claude" ? "openai" : "claude";
    console.log(`Switching preferred provider to: ${alternateProvider}`);
    aiService.setPreferredProvider(alternateProvider);

    const newDefaultResponse = await aiService.getChatCompletion([
      {
        role: "system",
        content:
          "You are a helpful assistant for a tabletop RPG game. Keep your response brief.",
      },
      {
        role: "user",
        content: "Create a basic puzzle for a dungeon.",
      },
    ]);

    console.log("New Default Provider Response:");
    console.log(newDefaultResponse.content);

    // Reset provider preference
    aiService.setPreferredProvider(initialProvider);
    console.log(`Reset preferred provider to: ${initialProvider}`);

    console.log("\nAI Service Test Completed Successfully!");
  } catch (error) {
    console.error("Error in AI Service test:", error);
  }
}

// Run the test
if (require.main === module) {
  testAIService();
}

export { testAIService };
