import { Bot, Context, InlineKeyboard } from "grammy";
import dotenv from 'dotenv';
import cron from 'node-cron';
import * as user_dao from "./daos/user_dao";
import * as group_api from "./modules/group";
import * as uig_dao from "./daos/user_in_group_dao";
import * as user_api from "./modules/user";
import { upsertGroup } from "./daos/group_dao";
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
    menu_api.print_menu(ctx);
});


function isReplyNoBots(ctx: Context) {
    if (ctx.message === undefined || ctx.message.reply_to_message === undefined || ctx.message.reply_to_message.from === undefined || ctx.message.reply_to_message.text === undefined) {
        //console.log("ignore because: msg is not a reply");
        return false;
    }
    if( ctx.message.reply_to_message.from.is_bot || ctx.message.from.is_bot ){
        //console.log("ignore because: msg is sent to or from a bot");
        return false;
    }
    
    return true;
}

function replyTopicAware(ctx: Context, msg: string) {

    if (ctx === undefined) throw new Error('ctx is UNDEFINED and it must be provided!');
    if (ctx.message === undefined) throw new Error('ctx.message is UNDEFINED!');
    if( ctx.message?.is_topic_message ){
        ctx.reply(msg, { message_thread_id: ctx.message?.message_thread_id });
    } else {
        ctx.reply(msg);
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

    if(sender.userid === receiver.userid){
        //ctx.reply("🤨 You can't give reputation to yourself!");
        replyTopicAware(ctx,"🤨 You can't give reputation to yourself!")
        return;
    }

    const group = group_api.parseGroup(ctx);

    user_dao.upsertUser(sender);
    user_dao.upsertUser(receiver);

    const decrease_available = -1;
    let change_rep_value = 1;
    let new_available = -1;
    let new_rep = 0;
    const is_up = ctx.message.text.startsWith("+");

    // handle messages starting with "+" (plus) that are replies to other messages
    if (is_up) {

        try { new_available = await uig_dao.upsertUserUpAvailable(sender.userid, group.chatid, decrease_available, false) }
        catch (e) {
            console.log(e);
            print_not_enough_up_available(ctx, receiver, sender);
            return;
        }

    } else {

        try { new_available = await uig_dao.upsertUserDownAvailable(sender.userid, group.chatid, decrease_available, false) }
        catch (e) {
            console.log(e);
            replyTopicAware(ctx,"Not enough down available");
            return;
        }
        change_rep_value *= -1;
    }

    try { new_rep = await uig_dao.upsertUserReputation(receiver.userid, group.chatid, change_rep_value, false) }
    catch (e) {
        replyTopicAware(ctx,"Error while updating receiver reputation: \n" + e);
    }

    print_rep_update(ctx, new_rep, new_available, receiver, sender, is_up);
});

function print_rep_update(ctx: Context, new_rep: number, new_available: number, receiver: User, sender: User, is_up: boolean) {
    let success_msg = "";
    success_msg += (receiver.username !== "" ? "@" + receiver.username : receiver.firstname) + " reputation";
    success_msg += (is_up ? " incremented!" : " decremented!") + " (" + new_rep + ")\n";
    success_msg += (sender.username !== "" ? "@" + sender.username : sender.firstname) + " has " + new_available;
    success_msg += is_up ? " up left!" : " down left!";
    replyTopicAware(ctx, success_msg);
}

function generateSacrificeButton(senderId: bigint, receiverId: bigint ) : InlineKeyboard {
    let data = "sacrifice-click " + senderId + " " + receiverId;
    console.log(data);
    return new InlineKeyboard().text("🔥Sacrifice🔥", data );
}

function print_not_enough_up_available(ctx: Context, receiver: User, sender: User) {
    let msg = "";
    msg += (sender.username !== "" ? "@" + sender.username : sender.firstname) + " you have no more up available for today!";
    msg += "\nYou can sacrifice one of your own reputation point to " + (receiver.username !== "" ? "@" + receiver.username : receiver.firstname) +" instead!"
    ctx.reply(msg, { reply_markup: generateSacrificeButton(sender.userid, receiver.userid), reply_to_message_id: ctx.message?.message_id });
}

// Wait for click events with specific callback data.
bot.callbackQuery(/sacrifice-click \d* \d*/, async (ctx) => {
    
    await ctx.answerCallbackQuery();
    
    let data = ctx.update.callback_query.data.split(" ");
    let senderId = BigInt(data[1].trim());
    let receiverId = BigInt(data[2]);
    
    //check if senderId is the same as the user that clicked the button
    if( senderId !== BigInt(ctx.update.callback_query.from.id) ){
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
    if( msg === undefined ) throw new Error("msg is undefined");
    ctx.editMessageReplyMarkup( { reply_markup: new InlineKeyboard } );
    ctx.editMessageText("Successful Sacrifice!\n📈 their new reputation: " + rec_rep + "\n📉 your new reputation: " + send_rep);
    

  });


/// detect when happens something to the "chat member" status of this bot, it triggers
/// - in groups when the bot is added or removed
/// - in private chats when the bot is started or stopped
bot.on("my_chat_member", async (ctx) => {


    if (ctx === undefined) throw new Error('ctx is UNDEFINED and it must be provided!');
    if (ctx.chat === undefined) throw new Error('ctx.chat is UNDEFINED!');

    const type = ctx.chat.type;

    if (type == "private") {
        console.log("chat type: private");
        return;
    }

    if (type == "channel") {
        console.log("chat type: channel");
        return;
    }

    if (type != "group" && type != "supergroup") throw new Error('type is neither channel, private, group or supergroup! it is "' + type + '" instead!');

    //type can only be group or supergroup at this point
    const group = group_api.parseGroup(ctx);
    const status = ctx.myChatMember.new_chat_member.status;

    if (status == "member") {
        //it means the bot has been added to this group
        upsertGroup(group);
    }
    /**
     * TODO: decide if we want to implement data removal when the bot is removed from a group
     */
    //else if( status == "left" || status == "kicked" ){
    //    //it means the bot has been removed from this group
    //    //so i remove all the entries in user_in_group having this group as a foreign key
    //    // TODO
    //    //and then i remove the group
    //    removeGroup(group);
    //}

});


// cronjob to reset the up and down available for all users in all groups at midnight
cron.schedule('0 0 0 * * *', async () => {
    console.log('running the reset task every day at midnight');
    await uig_dao.resetAllUpAndDownAvailable();
});


//handle commands in public chats
bot.command("start", async (ctx) => {

    // Send the menu.
    menu_api.print_menu(ctx);
})

bot.api.setMyCommands([
    {
        command: "myrep",
        description: "Your reputation in this group",
    },
    {
        command: "toprep",
        description: "users with top reputation in this group",
    },
]);

bot.command("myrep", async (ctx) => {
    // make sure this is NOT a private chat
    if (ctx.chat?.type !== "group" && ctx.chat?.type !== "supergroup") {
        ctx.reply("This command is only available in groups. Use it in the group you want to check your reputation in.");
        return;
    }
    
    // get the reputation of the user in the group
    const group = group_api.parseGroup(ctx);
    const user = user_api.parseSender(ctx);

    const rep = await uig_dao.getUserReputation(user.userid, group.chatid);
    replyTopicAware(ctx,"The reputation of " + (user.username !== "" ? "@" + user.username : user.firstname) + " in this group is " + rep);
})

bot.command("toprep", async (ctx) => {
    // make sure this is NOT a private chat
    if (ctx.chat?.type !== "group" && ctx.chat?.type !== "supergroup") {
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

    console.log("n_users: " + n_users);

    let msg = "The top" + n_users + " users in this group are:\n";
    // get the reputation of the user in the group
    const group = group_api.parseGroup(ctx);
    // TODO: complete this function
    const uig_users = await uig_dao.getTopNUsers(group.chatid, n_users);
    //let users : User[] = [];
    for (const u of uig_users) {
        let user = await user_dao.getUserById(u.userid) as User;
        msg += (user.username !== "" ? "@" + user.username : user.firstname) + " with " + u.reputation + " reputation\n";
        //users.push(user);
    }

    replyTopicAware(ctx, msg);
    
})

// Start the bot (using long polling)
bot.start();

