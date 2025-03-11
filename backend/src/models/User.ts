import { Model, DataTypes, Sequelize } from "sequelize";
import bcryptjs from "bcryptjs";

export class User extends Model {
  public id!: string; // Note: ! tells TypeScript this will be initialized
  public azureAdUserId!: string;
  public username!: string;
  public email!: string;
  public firstName!: string | null; // Optional fields
  public lastName!: string | null;
  public password!: string; // Add password field
  public role!: "DM" | "Player" | "Observer"; // Use a string enum
  public readonly createdAt!: Date; // Readonly, managed by Sequelize
  public readonly updatedAt!: Date;
}

export function initUserModel(sequelize: Sequelize) {
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      azureAdUserId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM("DM", "Player", "Observer"),
        allowNull: false,
        defaultValue: "Player", // Set a default role
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
      tableName: "users", // Good practice: explicitly set table name
    }
  );
}
