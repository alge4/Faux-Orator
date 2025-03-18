import { Model, DataTypes, Sequelize, Optional, Association } from "sequelize";
import User from "./User";
import sequelize from "../config/database";

// Campaign attributes interface
interface CampaignAttributes {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  dmId: string;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Campaign creation attributes interface (optional fields for creation)
interface CampaignCreationAttributes
  extends Optional<
    CampaignAttributes,
    "id" | "imageUrl" | "archived" | "createdAt" | "updatedAt"
  > {}

// Campaign model class
class Campaign
  extends Model<CampaignAttributes, CampaignCreationAttributes>
  implements CampaignAttributes
{
  public id!: string;
  public name!: string;
  public description!: string;
  public imageUrl?: string;
  public dmId!: string;
  public archived!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Add associations
  public static associations: {
    dm: Association<Campaign, User>;
  };

  // Static method to initialize the model
  public static initialize(sequelize: Sequelize): void {
    Campaign.init(
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        dmId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        imageUrl: {
          type: DataTypes.STRING,
          allowNull: true,
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
        tableName: "Campaigns",
        timestamps: true,
      }
    );
  }

  // Add the belongsTo method to the Campaign class
  public static belongsTo(
    target: typeof User,
    options?: any
  ): Association<Campaign, User> {
    return Model.belongsTo.call(this, target, options);
  }
}

export default Campaign;
