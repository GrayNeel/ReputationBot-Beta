import { Bot, Context, InlineKeyboard } from "grammy";
import dotenv from 'dotenv';
import cron from 'node-cron';
import * as user_dao from "./daos/user_dao";
import * as group_api from "./modules/group";
import * as uig_dao from "./daos/user_in_group_dao";
import * as user_api from "./modules/user";
import { upsertGroup, getGroup, removeGroup } from "./daos/group_dao";
import * as menu_api from "./modules/private_menu";
import { User } from "@prisma/client";
dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (token === undefined) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is UNDEFINED and it must be provided!');
}

// Create a bot object
const bot = new Bot(token); // <-- place your bot token in this string

bot.use(menu_api.start_menu);

bot.chatType("private").command("start", async (ctx) => {
    // Send the menu.
    menu_api.print_main_menu(ctx);
});

function isReplyNoBots(ctx: Context) {
    if (ctx.message === undefined || ctx.message.reply_to_message === undefined || ctx.message.reply_to_message.from === undefined || ctx.message.reply_to_message.text === undefined) {
        //console.log("ignore because: msg is not a reply");
        return false;
    }
    if (ctx.message.reply_to_message.from.is_bot || ctx.message.from.is_bot) {
        //console.log("ignore because: msg is sent to or from a bot");
        return false;
    }

    return true;
}

function notFromBots(ctx: Context) {
    if (ctx.message === undefined || ctx.message.from === undefined || ctx.message.from.is_bot) {
        return false;
    }
    return true;
}

//this function could also have a third optional "other" parameter that can be used in the ctx.reply function 
function replyTopicAware(ctx: Context, msg: string, other?: any) {

    if (ctx === undefined) throw new Error('ctx is UNDEFINED and it must be provided!');
    if (ctx.message === undefined) throw new Error('ctx.message is UNDEFINED!');
    if (ctx.message?.is_topic_message) {

        let modifiers = { message_thread_id: ctx.message?.message_thread_id };
        if (other !== undefined) modifiers = { ...modifiers, ...other };
        ctx.reply(msg, modifiers);

    } else {

        if (other !== undefined) ctx.reply(msg, other);
        else ctx.reply(msg);

    }
}

//a function to transform a Date in milliseconds into a string in the format "YYYY-MM-DD HH:MM:SS"
//intended to be used for logging
function dateToStr(dateInMs: number): string {
    const date = new Date(dateInMs);
    return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
}

// Register listeners to handle messages
bot.on("message:text").filter(isReplyNoBots).hears(/^[+-].*/, async (ctx) => {

    //console.log("-----------Message At: " + dateToStr(Date.now()) + "------------------------");
    //console.log(ctx.message);
    const sender = user_api.parseSender(ctx);
    const receiver = user_api.parseReceiver(ctx);

    if (sender.userid === receiver.userid) {
        //ctx.reply("🤨 You can't give reputation to yourself!");
        replyTopicAware(ctx, "🤨 You can't give reputation to yourself!")
        return;
    }

    //const group = group_api.parseGroup(ctx);
    const group = await getGroup(BigInt(ctx.chat.id));

    if (group === undefined || group === null) {
        replyTopicAware(
            ctx,
            "Error: this chat is unknown to the bot!\nMake sure that:" +
            "\n- you are in a group" +
            "\n- the bot is an administrator of the group" +
            "\n\nIf the error persists, remove the bot from the group and try adding it again."
        );
        return;
    }

    await user_dao.upsertUser(sender);
    await user_dao.upsertUser(receiver);

    const decrease_available = -1;
    let change_rep_value = 1;
    let new_available = -1;
    let new_rep = 0;
    const is_up = ctx.message.text.startsWith("+");

    if (is_up) {
        // handle messages starting with "+" (plus) that are replies to other messages

        new_available = await uig_dao.upsertUserUpAvailable(sender.userid, group.chatid, decrease_available, false);
        if (new_available == -1) {
            print_not_enough_up_available(ctx, receiver, sender);
            return;
        }

    } else {
        // handle messages starting with "+" (plus) that are replies to other messages

        new_available = await uig_dao.upsertUserDownAvailable(sender.userid, group.chatid, decrease_available, false)
        if (new_available == -1) {
            replyTopicAware(ctx, "Not enough down available");
            return;
        }
        change_rep_value *= -1;
    }

    try { new_rep = await uig_dao.upsertUserReputation(receiver.userid, group.chatid, change_rep_value, false) }
    catch (e) {
        //replyTopicAware(ctx, "Error while updating receiver reputation: \n" + e);
        console.log( "Error while updating receiver reputation: \n" + e );
    }

    if (!group.is_silent) print_rep_update(ctx, new_rep, new_available, receiver, sender, is_up);
});

bot.on("message:text").filter(notFromBots).hears(/^[^/+-].*/, async (ctx) => {

    const sender = user_api.parseSender(ctx);
    const group = group_api.parseGroup(ctx);

    await user_dao.upsertUser(sender);
    uig_dao.upsertUserMessages(sender.userid, group.chatid, false);


});

function print_rep_update(ctx: Context, new_rep: number, new_available: number, receiver: User, sender: User, is_up: boolean) {
    let success_msg = "";
    success_msg += "[" + receiver.firstname + " " + receiver.lastname + "](https://t.me/" + receiver.username + ")" + " reputation";
    success_msg += (is_up ? " incremented!" : " decremented!") + " (" + new_rep + ")\n";
    switch (new_rep) {
        case -150: success_msg += "🤨 are you a drunk driver or somethin?\n"; break;
        case -100: success_msg += "wow people really hates you! 💔\n"; break;
        case -69: success_msg += "eheheh 😏\n"; break;
        case -10: success_msg += "wow people hates you\n"; break;
        case -2: success_msg += "damn 💀\n"; break;
        case -1: success_msg += "better than -2!\n"; break;
        case 1: success_msg += "better than zero!\n"; break;
        case 10: success_msg += "it looks like people loves you!\n"; break;
        case 42: success_msg += "the answer to life, the universe, and everything!\n"; break;
        case 69: success_msg += "eheheh 😏\n"; break;
        case 100: success_msg += "wow people really loves you! 🤩\n"; break;
    }
    success_msg += "[" + sender.firstname + " " + sender.lastname + "](https://t.me/" + sender.username + ")" + " has " + new_available;
    success_msg += is_up ? " up left!" : " down left!";
    replyTopicAware(ctx, success_msg, { parse_mode: "Markdown", link_preview_options: { is_disabled: true } });
}

function generateSacrificeButton(senderId: bigint, receiverId: bigint): InlineKeyboard {
    let data = "sacrifice-click " + senderId + " " + receiverId;
    console.log(data);
    return new InlineKeyboard().text("🔥Sacrifice🔥", data);
}

function print_not_enough_up_available(ctx: Context, receiver: User, sender: User) {
    let msg = "";
    msg += (sender.username !== "" ? "@" + sender.username : sender.firstname) + " you have no more up available for today!";
    msg += "\nYou can sacrifice one of your own reputation point to " + (receiver.username !== "" ? "@" + receiver.username : receiver.firstname) + " instead!"
    ctx.reply(msg, { reply_markup: generateSacrificeButton(sender.userid, receiver.userid), reply_to_message_id: ctx.message?.message_id });
}

function is_not_group(ctx: Context): boolean {
    return ctx.chat?.type !== "group" && ctx.chat?.type !== "supergroup"
}

// Wait for click events with specific callback data.
bot.callbackQuery(/sacrifice-click \d* \d*/, async (ctx) => {

    await ctx.answerCallbackQuery();

    let data = ctx.update.callback_query.data.split(" ");
    let senderId = BigInt(data[1].trim());
    let receiverId = BigInt(data[2]);

    //check if senderId is the same as the user that clicked the button
    if (senderId !== BigInt(ctx.update.callback_query.from.id)) {
        return;
    }

    const group = group_api.parseGroup(ctx);
    let rec_rep = 0;
    let send_rep = 0;

    try {
        //add 1 to the receiver reputation
        rec_rep = await uig_dao.upsertUserReputation(receiverId, group.chatid, 1, false)
        //remove 1 from the sender reputation
        send_rep = await uig_dao.upsertUserReputation(senderId, group.chatid, -1, false)
    }
    catch (e) {
        ctx.reply("Error while updating reputation: \n" + e);
    }

    let msg = ctx.update.callback_query.message;
    if (msg === undefined) throw new Error("msg is undefined");
    ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard });
    ctx.editMessageText("Successful Sacrifice!\n📈 their new reputation: " + rec_rep + "\n📉 your new reputation: " + send_rep);


});


/// detect when happens something to the "chat member" status of this bot, it triggers
/// - in groups when the bot is added or removed
/// - in private chats when the bot is started or stopped
bot.on("my_chat_member", async (ctx) => {

    const chatMember = ctx.update.my_chat_member;

    console.log('my_chat_member update:', chatMember.new_chat_member);

    // Check if the bot was added to a group
    if (chatMember.new_chat_member.status === 'member') {
        console.log('Bot added to a group:', chatMember.new_chat_member);
        ctx.reply('✋ Hello! Thanks for adding me to this group! remember that <b>i need to be an Admin</b> to be able to work!', { parse_mode: 'HTML' });
    }

    // Check if the bot was promoted to an admin
    if (chatMember.new_chat_member.status === 'administrator') {
        console.log('Bot promoted to admin in group:', chatMember.chat.id);
        upsertGroup(group_api.parseGroup(ctx));
        const message = '🎉Yay! thanks for making me and admin!🎉' +
            '\n\nNow you can reply to users with a message starting with \'<b>+</b>\' or \'<b>-</b>\' to give them or subtract them a reputation point!' +
            '\n\nRemember that every day:' +
            '\n😇 you can give only 10 reputation points (+)' +
            '\n😈 you can subtract only 2 reputation points (-)' +
            '\n\nWell actually if you really want to give more than 10 + there might be a way to do that 😏...\nHave fun!';
        ctx.reply(message, { parse_mode: 'HTML' });
    }

    //check if the bot was removed from a group
    if (chatMember.new_chat_member.status === 'left' || chatMember.new_chat_member.status === 'kicked') {
        console.log('Bot removed from a group:', chatMember.new_chat_member);
        //delete all uigs for this group
        await uig_dao.deleteByChatId(BigInt(chatMember.chat.id));
        //delete the group
        removeGroup(BigInt(chatMember.chat.id));
    }

});


// cronjob to reset the up and down available for all users in all groups at midnight
cron.schedule('0 0 * * *', async () => {
    console.log('running the reset task every day at midnight');
    const resetted_uigs = await uig_dao.midnightReset();
    console.log("midnight reset of  " + resetted_uigs + " users in groups instance ");
},
    {
        scheduled: true,
        timezone: "Europe/Rome"
    }
);



//handle commands in public chats
bot.command("start", async (ctx) => {
    menu_api.print_main_menu(ctx);
})

bot.api.setMyCommands([
    {
        command: "myrep",
        description: "Your reputation in this group",
    },
    {
        command: "toprep",
        description: "/toprep N, where N < 25",
    },
    {
        command: "topreptoday",
        description: "/topreptoday N, where N < 25",
    },
    {
        command: "topmess",
        description: "/topmess N, where N < 25",
    },
    {
        command: "topmesstoday",
        description: "/topmesstoday N, where N < 25",
    },
]);

bot.command("myrep", async (ctx) => {

    if (is_not_group(ctx)) {
        ctx.reply("This command is only available in groups. Use it in the group you want to check your reputation in.");
        return;
    }

    const group = group_api.parseGroup(ctx);
    const user = user_api.parseSender(ctx);

    const rep = await uig_dao.getUserReputation(user.userid, group.chatid);
    replyTopicAware(ctx, "The reputation of " + (user.username !== "" ? "@" + user.username : user.firstname) + " in this group is " + rep);
})

bot.command("toprep", async (ctx) => {
    // make sure this is NOT a private chat
    if (is_not_group(ctx)) {
        ctx.reply("This command is only available in groups. Use it in the group you want to check the top users in.");
        return;
    }

    // read the number of users to retrieve
    let n_users = 10;
    if (ctx.match !== undefined) {
        n_users = parseInt(ctx.match[0]);
        if (isNaN(n_users)) n_users = 10;
        if (n_users < 1) n_users = 1;
        if (n_users > 25) n_users = 25;
    }

    let msg = "The best " + n_users + " users in this group are:\n";
    const group = group_api.parseGroup(ctx);
    const uig_users = await uig_dao.getTopNUsersByReputation(group.chatid, n_users);
    let i = 1;
    for (const u of uig_users) {
        let user = await user_dao.getUserById(u.userid) as User;
        switch (i){
            case 1:
                msg += "🥇 ";
                break;
            case 2:
                msg += "🥈 ";
                break;
            case 3:
                msg += "🥉 ";
                break;
            default:
                msg += i + ". ";
        }
        msg += "[" + user.firstname + " " + user.lastname + "](https://t.me/" + user.username + ") (" + u.reputation + ")\n";
        i++;
    }

    replyTopicAware(ctx, msg, { parse_mode: "Markdown", link_preview_options: { is_disabled: true } });

})

bot.command("topreptoday", async (ctx) => {
    // make sure this is NOT a private chat
    if (is_not_group(ctx)) {
        ctx.reply("This command is only available in groups. Use it in the group you want to check the top users today.");
        return;
    }

    // read the number of users to retrieve
    let n_users = 10;
    if (ctx.match !== undefined) {
        n_users = parseInt(ctx.match[0]);
        if (isNaN(n_users)) n_users = 10;
        if (n_users < 1) n_users = 1;
        if (n_users > 25) n_users = 25;
    }

    let msg = "The best " + n_users + " users today (since midnight in Rome) are:\n";
    const group = group_api.parseGroup(ctx);
    const uig_users = await uig_dao.getTopNUsersByReputationToday(group.chatid, n_users);
    let i = 1;
    for (const u of uig_users) {
        let user = await user_dao.getUserById(u.userid) as User;
        switch (i){
            case 1:
                msg += "🥇 ";
                break;
            case 2:
                msg += "🥈 ";
                break;
            case 3:
                msg += "🥉 ";
                break;
            default:
                msg += i + ". ";
        }
        msg += "[" + user.firstname + " " + user.lastname + "](https://t.me/" + user.username + ") (" + u.reputation + ")\n";
        i++;
    }

    replyTopicAware(ctx, msg, { parse_mode: "Markdown", link_preview_options: { is_disabled: true } });

})

bot.command("topmess", async (ctx) => {
    // make sure this is NOT a private chat
    if (is_not_group(ctx)) {
        ctx.reply("This command is only available in groups. Use it in the group you want to check the most active users in.");
        return;
    }

    // read the number of users to retrieve
    let n_users = 10;
    if (ctx.match !== undefined) {
        n_users = parseInt(ctx.match[0]);
        if (isNaN(n_users)) n_users = 10;
        if (n_users < 1) n_users = 1;
        if (n_users > 25) n_users = 25;
    }

    let msg = "The " + n_users + " most active users by number of messages ever sent in this group are:\n";
    const group = group_api.parseGroup(ctx);
    const uig_users = await uig_dao.getTopNUsersByMessages(group.chatid, n_users);
    let i = 1;
    for (const u of uig_users) {
        let user = await user_dao.getUserById(u.userid) as User;
        msg += i + ". [" + user.firstname + " " + user.lastname + "](https://t.me/" + user.username + ") (" + u.messages + ")\n";
        i++;
    }

    replyTopicAware(ctx, msg, { parse_mode: "Markdown", link_preview_options: { is_disabled: true } });

})


bot.command("topmesstoday", async (ctx) => {
    // make sure this is NOT a private chat
    if (is_not_group(ctx)) {
        ctx.reply("This command is only available in groups. Use it in the group you want to check the most active users today in.");
        return;
    }

    // read the number of users to retrieve
    let n_users = 10;
    if (ctx.match !== undefined) {
        n_users = parseInt(ctx.match[0]);
        if (isNaN(n_users)) n_users = 10;
        if (n_users < 1) n_users = 1;
        if (n_users > 25) n_users = 25;
    }

    let msg = "The " + n_users + " most active users by number of messages (since midnight in Rome) are:\n";
    const group = group_api.parseGroup(ctx);
    const uig_users = await uig_dao.getTopNUsersByMessagesToday(group.chatid, n_users);
    let i = 1;
    for (const u of uig_users) {
        let user = await user_dao.getUserById(u.userid) as User;
        msg += i + ". [" + user.firstname + " " + user.lastname + "](https://t.me/" + user.username + ") (" + u.messages + ")\n";
        i++;
    }

    replyTopicAware(ctx, msg, { parse_mode: "Markdown", link_preview_options: { is_disabled: true } });

})

// Start the bot (using long polling)
bot.start();

