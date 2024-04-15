import { SlashCommandBuilder } from "discord.js";
//registers banCommand with our bot on discord
const orderCommand = new SlashCommandBuilder()
  .setName("order")
  .setDescription("the type of food")
  .addStringOption((option) =>
    option
      .setName("food")
      .setDescription("Select your favorite food.")
      .setRequired(true)
      .setChoices(
        {
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
      .setName("drink")
      .setDescription("Select your beverage")
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

export default orderCommand.toJSON();
