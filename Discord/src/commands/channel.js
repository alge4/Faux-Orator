import { SlashCommandBuilder } from "discord.js";
//registers banCommand with our bot on discord
const channelCommand = new SlashCommandBuilder()
  .setName("channels")
  .setDescription("channels cmd")
  .addChannelOption((option) => option
    .setName("channels")
    .setDescription("channels")
    .setRequired(true)
    )
  .addBooleanOption((option) => option
    .setName('deletemsgs')
    .setDescription('Delete the message')
    .setRequired(true))
  .addIntegerOption((option)=> option
    .setName('age').setDescription('Enter your age')
);

export default channelCommand.toJSON();
