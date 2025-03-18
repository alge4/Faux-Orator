import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import logger from "../utils/logger";

// Load environment variables
dotenv.config();

// Database configuration
const dbName = process.env.DB_NAME || "faux_orator";
const dbUser = process.env.DB_USER || "postgres";
const dbPassword = process.env.DB_PASSWORD || "postgres";
const dbHost = process.env.DB_HOST || "localhost";
const dbPort = parseInt(process.env.DB_PORT || "5432");

// Log database connection info (hide password)
console.log("Database connection info: ", {
  dbName,
  dbUser,
  dbPassword: "***",
  dbHost,
  dbPort,
});

// Try to load pg module
try {
  require("pg");
  console.log("pg module loaded successfully");
} catch (error) {
  console.error("Failed to load pg module:", error);
}

// Create Sequelize instance
export const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: "postgres",
  logging: (msg) => logger.debug(msg),
});

// Test the connection
sequelize
  .authenticate()
  .then(() => {
    logger.info("Database connection established successfully");
  })
  .catch((err) => {
    logger.error("Unable to connect to the database:", err);
  });

export default sequelize;
