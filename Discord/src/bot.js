import { config } from "dotenv";
import { Client, GatewayIntentBits, Guild, Routes } from "discord.js";
import { SlashCommandBuilder } from "discord.js";
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

client.on("interactionCreate", (interaction) => {
  if (interaction.isChatInputCommand()) {
    //console.log(interaction.options.get('food').value);
    interaction.reply({
      content: `You ordered a ${interaction.options.get("food").value} and ${
        interaction.options.get("drink").value
      }.`,
    });
  }
});

async function main() {
    const orderCommand = new SlashCommandBuilder()
        .setName('order')
        .setDescription('the type of food')
        .addStringOption((option) => 
            option
                .setName('Meal')
                .setDescription('Select your meal.')
                .setRequired(true)
                .setChoices({
                        name: "Cake",
                        value: "cake",
                    },
                    {
                        name: "Hamburger",
                        value: "Hamburger",
                    },
                    {
                        name: "Pizza",
                        value: "Pizza",
                    }
                )
            )
        .addStringOption((option) => 
            option
                .setName('Drink')
                .setDescription('Select your beverage')
                .setRequired(false)
                .setChoices(
                {
                    name: "Water",
                    value: "H20",
                  },
                  {
                    name: "Sprite",
                    value: "Sprite",
                  },
                  {
                    name: "Cola",
                    value: "Is pesi okay?",
                  }
            )
        );


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
