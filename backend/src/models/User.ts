import { Model, DataTypes, Sequelize, Optional, Association } from "sequelize";
import bcryptjs from "bcryptjs";
import Campaign from "./Campaign";
import { sequelize } from "../config/database";

// Update the enum definition
export type UserRole = "DM" | "Player" | "Observer";

// User attributes interface
interface UserAttributes {
  id: string;
  azureAdUserId?: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// User creation attributes interface (optional fields for creation)
interface UserCreationAttributes
  extends Optional<UserAttributes, "id" | "createdAt" | "updatedAt"> {}

// User model class
export class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  public id!: string;
  public azureAdUserId?: string;
  public username!: string;
  public email!: string;
  public firstName!: string;
  public lastName!: string;
  public role!: UserRole;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Add associations
  public static associations: {
    campaigns: Association<User, Campaign>;
  };

  // Static method to initialize the model
  public static initialize(sequelize: Sequelize): void {
    User.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        azureAdUserId: {
          type: DataTypes.STRING,
          unique: true,
          allowNull: false,
        },
        email: {
          type: DataTypes.STRING,
          unique: true,
          allowNull: false,
        },
        username: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        role: {
          type: DataTypes.ENUM("DM", "Player", "Observer"),
          defaultValue: "Player",
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
        modelName: "User",
        timestamps: true,
      }
    );
  }

  // Add the hasMany method to the User class
  public static hasMany(
    target: typeof Campaign,
    options?: any
  ): Association<User, Campaign> {
    return Model.hasMany.call(this, target, options);
  }
}

export default User;
