import { config } from "dotenv";
import {
  Client,
  GatewayIntentBits,
  Guild,
  Routes,
} from "discord.js";
import { REST } from "@discordjs/rest";

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

async function main() {
  const commands = [
    {
      name: "tutorailhelp",
      description: "Help Tutorial Command",
    },
    {
        name: "tutorailhelp2",
        description: "Help Tutorial Command",
      },
  ];

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
