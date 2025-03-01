import { Sequelize, DataTypes } from 'sequelize';
import { User, initUserModel } from './User';
import { Campaign, initCampaignModel } from './Campaign';

const sequelize = new Sequelize(process.env.DATABASE_URL!, {
    dialect: 'postgres',
    logging: false, // Set to true for debugging SQL queries
});

initUserModel(sequelize);
initCampaignModel(sequelize);

// Define associations *after* initializing all models
User.hasMany(Campaign, { foreignKey: 'dmId', as: 'campaigns' }); // A user can be the DM of many campaigns
Campaign.belongsTo(User, { foreignKey: 'dmId', as: 'dm' }); // A campaign belongs to one DM

export { sequelize, User, Campaign }; 