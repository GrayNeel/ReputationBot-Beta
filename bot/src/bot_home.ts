import { Bot } from "grammy";
import dotenv from 'dotenv';
import { saveUser } from "./user_dao";
dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (token === undefined) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is UNDEFINED and it must be provided!');
}

// Create a bot object
const bot = new Bot(token); // <-- place your bot token in this string

// Register listeners to handle messages
bot.on("message:text", (ctx) => {

    ctx.reply("Echo: " + ctx.message.text);
    const userId = ctx.from.id;
    saveUser(userId, ctx.from.username)

});



// Start the bot (using long polling)
bot.start();

