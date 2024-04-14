import { config } from "dotenv";
import { Client } from "discord.js";

config();

const token = process.env.TOKEN; //Access token from .env

const client = new Client({ intents: [`Guilds`, `GuildMessages`] });

if (token) {
//  console.log("Token: ", token);
  client.login(token);
} else {
  console.error("Token is undefined. Check your .env file.");
}

