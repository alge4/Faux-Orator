import { Model, DataTypes } from "sequelize";
import sequelize from "../config/database";

export class UserCampaignPreference extends Model {
  public userId!: string;
  public campaignId!: string;
  public isFavorite!: boolean;
  public lastAccessed?: Date;

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UserCampaignPreference.init(
  {
    userId: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
    },
    campaignId: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
    },
    isFavorite: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    lastAccessed: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "UserCampaignPreferences",
  }
);
