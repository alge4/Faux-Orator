// Read and parse the .env file directly
function readEnvFile() {
  // First try current directory
  let envPath = path.resolve(process.cwd(), ".env");
  console.log("Looking for .env file at:", envPath);

  // If not found, check parent directory (project root)
  if (!fs.existsSync(envPath)) {
    console.log(
      ".env not found in current directory, checking parent directory..."
    );
    envPath = path.resolve(process.cwd(), "..", "..", ".env");
    console.log("Looking for .env file at:", envPath);
  }

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

// Test the API
async function testClaude() {
  console.log("Testing Claude API connection...");

  try {
    const message = await client.messages.create({
      model: "claude-3-7-sonnet-20250219", // Current model based on docs
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
    console.error(
      "\nError with the specified model. Trying with more models..."
    );
    console.error("Error details:", error.message);

    try {
      // Try with claude-3-sonnet (no date version)
      console.log("\nTrying with claude-3-sonnet (no date version)...");
      const message = await client.messages.create({
        model: "claude-3-sonnet",
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
      console.log("\nAPI test successful with claude-3-sonnet!");
    } catch (retryError) {
      console.error(
        "\nError with second model attempt. Trying claude-3-haiku..."
      );
      console.error("Error details:", retryError.message);

      try {
        // Try with claude-3-haiku
        console.log("\nTrying with claude-3-haiku...");
        const message = await client.messages.create({
          model: "claude-3-haiku",
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
        console.log("\nAPI test successful with claude-3-haiku!");
      } catch (finalError) {
        console.error(
          "\nError connecting to Claude API with all model attempts:",
          finalError.message
        );

        // Show all available models
        try {
          console.log("\nAttempting to list available models...");
          const models = await client.models.list();
          console.log("Available models:", JSON.stringify(models, null, 2));
        } catch (modelsError) {
          console.error("Could not list models:", modelsError.message);
        }
      }
    }
  }
}
