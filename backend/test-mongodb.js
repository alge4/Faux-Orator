// Simple script to test MongoDB connection
const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// MongoDB Connection URL from .env
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Error: MONGODB_URI not found in environment variables");
  process.exit(1);
}

// Database name
const dbName = process.env.MONGODB_DB_NAME || "faux-orator";

async function testConnection() {
  const client = new MongoClient(uri);

  try {
    // Connect to the MongoDB server
    await client.connect();
    console.log("Successfully connected to MongoDB Atlas!");

    // Get the database instance
    const db = client.db(dbName);

    // Ping the database to confirm connection
    await db.command({ ping: 1 });
    console.log(`Pinged database: ${dbName}. Connection confirmed!`);

    // List collections to verify database access
    const collections = await db.listCollections().toArray();
    console.log(`Collections in database ${dbName}:`);
    if (collections.length === 0) {
      console.log("No collections found. This is normal for a new database.");
    } else {
      collections.forEach((collection) => {
        console.log(` - ${collection.name}`);
      });
    }

    // Try to create a test collection
    console.log("\nCreating a test collection...");
    await db.createCollection("test_connection");
    console.log("Test collection created successfully.");

    // Insert a test document
    console.log("\nInserting a test document...");
    const result = await db.collection("test_connection").insertOne({
      test: true,
      timestamp: new Date(),
      message: "MongoDB connection test successful!",
    });
    console.log(`Test document inserted with ID: ${result.insertedId}`);

    // Clean up - drop the test collection
    console.log("\nCleaning up test collection...");
    await db.collection("test_connection").drop();
    console.log("Test collection dropped successfully.");

    console.log(
      "\n✅ All MongoDB connection tests passed! Your configuration is working correctly."
    );
  } catch (error) {
    console.error("❌ MongoDB connection test failed:", error);
  } finally {
    // Close the connection
    await client.close();
    console.log("MongoDB connection closed.");
  }
}

// Run the test
testConnection().catch(console.error);
