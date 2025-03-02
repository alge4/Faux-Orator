import { Model, DataTypes, Sequelize } from "sequelize";
import { Campaign } from "./Campaign"; // Import the Campaign model

export class CampaignSection extends Model {
  public id!: string;
  public campaignId!: string; // Foreign key
  public name!: string;
  public type!: "Characters" | "Locations" | "Plot" | "Items" | "Events" | "Notes";
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initCampaignSectionModel(sequelize: Sequelize) {
  CampaignSection.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      campaignId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "campaigns",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM("Characters", "Locations", "Plot", "Items", "Events", "Notes"),
        allowNull: false,
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
      modelName: "CampaignSection",
      tableName: "campaign_sections",
    }
  );
} 