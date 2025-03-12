import { sequelize } from "../config/database";
import User from "./User";
import Campaign from "./Campaign";

// Initialize models
User.initialize(sequelize);
Campaign.initialize(sequelize);

// Define associations
// A user can have many campaigns
// A campaign belongs to a user
const setupAssociations = () => {
  // User-Campaign associations
  (User as any).hasMany(Campaign, {
    foreignKey: "dmId",
    as: "campaigns",
  });

  (Campaign as any).belongsTo(User, {
    foreignKey: "dmId",
    as: "dm",
  });
};

// Initialize database function
export const initializeDatabase = async () => {
  try {
    // Setup associations
    setupAssociations();

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
};

// Export models
export { User, Campaign };
