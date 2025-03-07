import { Model, DataTypes, Sequelize } from "sequelize";
import { User } from "./User"; // Import the User model

export class Campaign extends Model {
  public id!: string;
  public name!: string;
  public description!: string;
  public imageUrl?: string; // Optional
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public dmId!: string; // Foreign key
  public archived!: boolean;
}

export function initCampaignModel(sequelize: Sequelize) {
  Campaign.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      imageUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      // In the dmId field definition, change:
      dmId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users", // Changed from 'Users' to 'users'
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      archived: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Campaign",
      tableName: "campaigns",
    }
  );
}
