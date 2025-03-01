import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Hardcoded database connection info for development
const dbName = 'faux_orator';
const dbUser = 'postgres';
const dbPassword = 'postgres';
const dbHost = 'db';
const dbPort = '5432';

console.log('Database connection info:', {
  dbName,
  dbUser,
  dbPassword: '***', // Don't log the actual password
  dbHost,
  dbPort
});

// Create Sequelize instance
const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: parseInt(dbPort, 10),
  dialect: 'postgres',
  logging: console.log, // Enable logging to see the SQL queries
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

export default sequelize;
