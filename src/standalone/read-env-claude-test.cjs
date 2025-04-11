/**
 * Claude API test that reads the .env file directly
 */

const { Anthropic } = require("@anthropic-ai/sdk");
const fs = require("fs");
const path = require("path");

// Read and parse the .env file directly
function readEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env");
  console.log("Looking for .env file at:", envPath);

  try {
    if (!fs.existsSync(envPath)) {
      console.error(".env file not found at:", envPath);
      return null;
    }

    const envContent = fs.readFileSync(envPath, "utf8");
    const envVars = {};

    // Extract VITE_CLAUDE_API_KEY
    const regex = /VITE_CLAUDE_API_KEY=([^\n]+)/;
    const match = envContent.match(regex);

    if (match && match[1]) {
      return match[1].trim();
    }

    return null;
  } catch (error) {
    console.error("Error reading .env file:", error);
    return null;
  }
}

// Get Claude API key
const apiKey = readEnvFile();

if (!apiKey) {
  console.error("Could not find VITE_CLAUDE_API_KEY in .env file");
  process.exit(1);
}

console.log("Found Claude API key in .env file");
console.log("Key starts with:", apiKey.substring(0, 10) + "...");

// Initialize Claude client
const client = new Anthropic({
  apiKey: apiKey,
});

// Test the API with multiple model variants
async function testClaude() {
  console.log("Testing Claude API connection...");

  // Different model names to try based on the documentation
  const modelVariants = [
    // Direct Anthropic API model names
    "claude-3-opus-20240229",
    "claude-3-sonnet-20240229",
    "claude-3-haiku-20240307",
    "claude-3-5-sonnet-20241022",
    "claude-3-7-sonnet-20250219",
    // Simple model names without dates (may work in some cases)
    "claude-3-opus",
    "claude-3-sonnet",
    "claude-3-haiku",
    "claude-3-5-sonnet",
    "claude-3-7-sonnet",
    // Most recent likely options
    "claude-3",
    "claude-instant",
  ];

  // Try each model name sequentially
  for (const model of modelVariants) {
    try {
      console.log(`\nTrying model: ${model}...`);

      const message = await client.messages.create({
        model: model,
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content:
              "Hello Claude! Can you generate a name for a fantasy tavern?",
          },
        ],
      });

      console.log(`\nSuccess with model ${model}! Claude responded with:\n`);
      console.log(message.content[0].text);
      console.log(`\nAPI test successful with model: ${model}`);

      // If successful, break out of the loop
      break;
    } catch (error) {
      console.error(`Error with model ${model}: ${error.message}`);
    }
  }

  // Try to list models at the end
  try {
    console.log("\nAttempting to list available models...");
    const models = await client.models.list();
    console.log("Available models:", JSON.stringify(models, null, 2));
  } catch (modelsError) {
    console.error("Could not list models:", modelsError.message);
  }
}

// Run the test
testClaude();
