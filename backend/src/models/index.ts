import sequelize from '../config/database';
import { User, initUserModel } from './User';
import { Campaign, initCampaignModel } from './Campaign';

// Initialize models
const initializeDatabase = async (app?: any) => {
  try {
    // Initialize models
    initUserModel(sequelize);
    initCampaignModel(sequelize);
    
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Sync all models with database
    await sequelize.sync({ alter: true });
    console.log('All models were synchronized successfully.');
    
    // Define associations *after* initializing all models
    User.hasMany(Campaign, { foreignKey: 'dmId', as: 'campaigns' }); // A user can be the DM of many campaigns
    Campaign.belongsTo(User, { foreignKey: 'dmId', as: 'dm' }); // A campaign belongs to one DM
    
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

export { User, Campaign, initializeDatabase, sequelize }; 