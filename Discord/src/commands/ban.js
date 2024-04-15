import { SlashCommandBuilder } from "discord.js";
//registers banCommand with our bot on discord
const banCommand = new SlashCommandBuilder()
  .setName("ban")
  .setDescription("Bans a user from the guild.")
  .addSubcommand((addSubcommand) =>
    addSubcommand
      .setName("temp")
      .setDescription("Temporary bans a user")
      .addUserOption((option) =>
        option.setName("user").setDescription("User to be banned.")
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("perma")
      .setDescription("perma ban")
      .addUserOption((option) =>
        option.setName("user")
              .setDescription("User to be banned")
      )
  );
export default banCommand.toJSON();
