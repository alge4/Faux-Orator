import { SlashCommandBuilder } from "discord.js";
//registers banCommand with our bot on discord
const rolesCommand = new SlashCommandBuilder()
  .setName("addrole")
  .setDescription("Add a role")
  .addRoleOption((option) =>
    option
      .setName("newrole")
      .setDescription("Adds the New Role")
      .setRequired(true)
  );
//console.log(rolesCommand.toJSON());
export default rolesCommand.toJSON();
