import { Bot, Context} from "grammy";
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


function isReply(ctx: Context){
    if (ctx.message === undefined || ctx.message.reply_to_message === undefined || ctx.message.reply_to_message.from === undefined){
        console.log("ignore because: msg is not a reply");
        return false;
    }
    return true;
}

// Register listeners to handle messages
bot.on("message:text").filter(isReply).hears(/[+-].*/, async (ctx) => {

    const sender = user_api.parseSender(ctx);
    const receiver = user_api.parseReceiver(ctx);
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
            ctx.reply("not enough up available");
            return;
        }
        
    } else {

        try { new_available = await uig_dao.upsertUserDownAvailable(sender.userid, group.chatid, decrease_available, false) } 
        catch (e) {
            console.log(e);
            ctx.reply("Not enough down available");
            return;
        }
        change_rep_value *= -1;
    }
    
    try { new_rep = await uig_dao.upsertUserReputation(receiver.userid, group.chatid, change_rep_value, false) }
    catch (e) {
        ctx.reply("Error while updating receiver reputation: \n" + e);
    }
    
    print_rep_update(ctx, new_rep, new_available, receiver, sender, is_up);
});

function print_rep_update(ctx: Context, new_rep: number, new_available: number, receiver: User, sender: User, is_up: boolean){
    let success_msg = "";
    success_msg += (receiver.username !== undefined ? "@" + receiver.username : receiver.firstname)+ " reputation";
    success_msg += (is_up ? " incremented!" : " decremented!") + " ("+ new_rep +")\n";
    success_msg += (sender.username !== undefined ? "@" + sender.username : sender.firstname) + " has " + new_available;
    success_msg += is_up ? " up left!" : " down left!";
    ctx.reply(success_msg);
}


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

    if( status == "member" ){
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
cron.schedule('0 0 0 * * *', () => {
    console.log('running a task every day at midnight');
    uig_dao.resetAllUpAndDownAvailable();
});


// Start the bot (using long polling)
bot.start();

