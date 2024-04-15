import { SlashCommandBuilder } from "discord.js";
//registers banCommand with our bot on discord
const usersCommand = new SlashCommandBuilder()
  .setName("users")
  .setDescription("User cmd")
  .addUserOption((option) => option.setName("user").setDescription("user"));

export default usersCommand.toJSON();
