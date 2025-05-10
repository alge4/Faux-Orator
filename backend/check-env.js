// Script to check environment variables
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// Log the current directory
console.log("Current directory:", process.cwd());

// Check if .env file exists
const envPath = path.resolve(process.cwd(), ".env");
console.log("Looking for .env file at:", envPath);
console.log(".env file exists:", fs.existsSync(envPath));

// Try to load environment variables
dotenv.config();

// Check environment variables
console.log("\nEnvironment Variables:");
console.log("---------------------");
console.log(
  "MONGODB_URI:",
  process.env.MONGODB_URI ? "FOUND (value hidden for security)" : "NOT FOUND"
);
console.log("MONGODB_DB_NAME:", process.env.MONGODB_DB_NAME || "NOT FOUND");
console.log(
  "SUPABASE_URL:",
  process.env.SUPABASE_URL ? "FOUND (value hidden for security)" : "NOT FOUND"
);
console.log(
  "SUPABASE_KEY:",
  process.env.SUPABASE_KEY ? "FOUND (value hidden for security)" : "NOT FOUND"
);

// List all env files in the directory
console.log("\nListing files in current directory:");
try {
  const files = fs.readdirSync(process.cwd());
  const envFiles = files.filter(
    (file) => file.includes(".env") || file === "env.example"
  );
  console.log("Found these env-related files:", envFiles);
} catch (error) {
  console.error("Error listing files:", error);
}

// If .env file exists, check its format (without showing sensitive data)
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, "utf8");
    const envLines = envContent.split("\n").map((line) => {
      // Only show variable names, not values
      const parts = line.split("=");
      if (parts.length > 1 && !line.startsWith("#")) {
        return `${parts[0]}=<value hidden>`;
      }
      return line;
    });

    console.log("\nEnvironment file structure:");
    console.log(envLines.join("\n"));
  } catch (error) {
    console.error("Error reading .env file:", error);
  }
}
