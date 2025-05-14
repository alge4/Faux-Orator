// Simple CommonJS test for Claude API
const { Anthropic } = require("@anthropic-ai/sdk");
require("dotenv").config(); // Load environment variables from .env file

// Get the Claude API key
const claudeApiKey = process.env.VITE_CLAUDE_API_KEY;

if (!claudeApiKey) {
  console.error(
    "No Claude API key found. Please make sure your .env file has VITE_CLAUDE_API_KEY set."
  );
  process.exit(1);
}

console.log("Claude API key found. Testing connection...");

const client = new Anthropic({
  apiKey: claudeApiKey,
});

async function runTest() {
  try {
    console.log("Sending request to Claude API...");

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
    console.error(error.stack);
  }
}

runTest();
