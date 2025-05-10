const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");

dotenv.config();

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || "faux-orator";

if (!uri) {
  console.error("MongoDB URI must be provided in environment variables");
  process.exit(1);
}

// Create a new MongoClient
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Connection singleton
let db = null;

/**
 * Connects to MongoDB and returns the database instance
 * @returns {Promise<Db>} MongoDB database instance
 */
async function connectToDatabase() {
  if (db) return db;

  try {
    await client.connect();
    console.log("Connected successfully to MongoDB Atlas");

    db = client.db(dbName);
    return db;
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    process.exit(1);
  }
}

/**
 * Test database connection
 * @returns {Promise<boolean>} Connection success status
 */
async function testConnection() {
  try {
    const database = await connectToDatabase();
    // Ping the database
    await database.command({ ping: 1 });
    console.log("Successfully connected to MongoDB Atlas");
    return true;
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    return false;
  }
}

/**
 * Closes the database connection
 */
async function closeConnection() {
  if (client) {
    await client.close();
    db = null;
    console.log("MongoDB connection closed");
  }
}

// Handle application termination
process.on("SIGINT", async () => {
  await closeConnection();
  process.exit(0);
});

module.exports = {
  connectToDatabase,
  testConnection,
  closeConnection,
  getCollection: (collectionName) => {
    if (!db) {
      throw new Error("Database not connected. Call connectToDatabase first.");
    }
    return db.collection(collectionName);
  },
};
