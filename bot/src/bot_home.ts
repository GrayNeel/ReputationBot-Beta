import { Bot } from "grammy";
import dotenv from 'dotenv';
dotenv.config();

console.log(process.env.TELEGRAM_BOT_TOKEN);
console.log(process.env.TELEGRAM_BOT_TOKEN?.length);

const token = process.env.TELEGRAM_BOT_TOKEN;
if (token === undefined) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is UNDEFINED and it must be provided!');
}

// Create a bot object
const bot = new Bot(token); // <-- place your bot token in this string

// Register listeners to handle messages
bot.on("message:text", (ctx) => ctx.reply("Echo: " + ctx.message.text));

// Start the bot (using long polling)
bot.start();

