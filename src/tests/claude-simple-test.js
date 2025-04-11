// Simple vanilla JS test to check Claude API key and connectivity
import { Anthropic } from "@anthropic-ai/sdk";

const claudeApiKey = process.env.VITE_CLAUDE_API_KEY;

if (!claudeApiKey) {
  console.error(
    "No Claude API key found. Please set VITE_CLAUDE_API_KEY environment variable."
  );
  process.exit(1);
}

const client = new Anthropic({
  apiKey: claudeApiKey,
});

async function runTest() {
  console.log("Testing Claude API connection...");

  try {
    const message = await client.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content:
            "Hello Claude! Can you generate a name for a fantasy tavern?",
        },
      ],
    });

    console.log("Success! Claude responded with:");
    console.log(message.content[0].text);
  } catch (error) {
    console.error("Error connecting to Claude API:", error);
  }
}

runTest();
