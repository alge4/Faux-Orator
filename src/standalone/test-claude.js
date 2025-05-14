/**
 * Standalone test for Claude AI API
 * Run with: node src/standalone/test-claude.js
 */

import { Anthropic } from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to load environment variables from a file
function loadEnvFile(filePath) {
  try {
    const envContent = fs.readFileSync(filePath, "utf8");
    const envVars = {};

    // Parse each line into key-value pairs
    envContent.split("\n").forEach((line) => {
      // Skip empty lines and comments
      if (!line || line.startsWith("#")) return;

      // Extract key and value
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();

        // Remove quotes if present
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.substring(1, value.length - 1);
        }

        envVars[key] = value;
      }
    });

    return envVars;
  } catch (error) {
    console.error(`Error loading .env file: ${error.message}`);
    return {};
  }
}

// Load environment variables from .env
const envVars = loadEnvFile(path.join(__dirname, "../../.env"));
const claudeApiKey = envVars.VITE_CLAUDE_API_KEY;

if (!claudeApiKey) {
  console.error(
    "No Claude API key found in .env file. Please make sure your .env file has VITE_CLAUDE_API_KEY set."
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

    console.log("\nSuccess! Claude responded with:\n");
    console.log(message.content[0].text);
    console.log("\nAPI test successful!");
  } catch (error) {
    console.error("\nError connecting to Claude API:", error.message);
    if (error.status) {
      console.error(`Status code: ${error.status}`);
    }
    if (error.response) {
      console.error("Response:", error.response);
    }
  }
}

runTest();
