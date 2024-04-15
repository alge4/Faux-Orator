import { config } from "dotenv";
import { Client, GatewayIntentBits, Guild, Routes } from "discord.js";
import { REST } from "@discordjs/rest";
import OrderCommand from "./commands/order.js";
import RolesCommand from "./commands/roles.js";
import UserCommand from "./commands/user.js";
import ChannelCommand from "./commands/channel.js";
import BanCommand from "./commands/ban.js";
import { ActionRowBuilder } from "discord.js";
import { SelectMenuBuilder } from "@discordjs/builders";

config();

const TOKEN = process.env.DISCORD_TOKEN; //Access token from .env
const Client_ID = process.env.CLIENT_ID;
const Guild_ID = process.env.GUILD_ID;

const client = new Client({
  intents: [`Guilds`, `GuildMessages`, `MessageContent`],
});

const rest = new REST({ version: "10" }).setToken(TOKEN);

if (TOKEN) {
  //  console.log("TOKEN: ", token);
  client.login(TOKEN);
} else {
  console.error("Token is undefined. Check your .env file.");
}

client.on(`ready`, () => {
  console.log(`${client.user.tag} has logged in`);
});

client.on("interactionCreate", (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'order') {
      console.log("OrderCommand");
      console.log(interaction);
      const actionRowComponent = new ActionRowBuilder().setComponents(
        new SelectMenuBuilder().setCustomId('food_options').setOptions([{label:'cake',value:'cake'},{label:'pizza',value:'pizza'},{label:'Sushi',value:'sushi'},])
      );
      interaction.reply({
        components: [actionRowComponent.toJSON()]
      });
    }
  }
});

async function main() {
  const commands = [
    OrderCommand,
    RolesCommand,
    UserCommand,
    ChannelCommand,
    BanCommand,
  ];
  //console.log(`${commands}`);
  try {
    //client login.
    console.log(`Starting refreshing application (/) commands.`);
    await rest.put(Routes.applicationGuildCommands(Client_ID, Guild_ID), {
      body: commands,
    });
  } catch (err) {
    console.log(`An exception have been caught: ${err}`);
  }
}

main();
