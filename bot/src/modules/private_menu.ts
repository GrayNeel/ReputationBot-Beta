import { Menu, MenuRange } from "@grammyjs/menu";
import { Context } from "grammy";
import * as uig_dao from "../daos/user_in_group_dao";
import * as group_dao from "../daos/group_dao";
import { user_in_group } from "@prisma/client";


let global_uigs : user_in_group[] = [];

export const start_menu = new Menu('my-main-menu')
start_menu.dynamic( async (ctx) => {
    const range = new MenuRange();
    const user = ctx.from;
    if (user === undefined) throw new Error("ctx.from is undefined");
    
    global_uigs = await uig_dao.getByUserId(BigInt(user.id));
    let message = "Hi! We are both in the following groups: \n\n";
    let i=1;
    for (const uig of global_uigs) {
        let group = await group_dao.getGroup(uig.chatid);
        if (group === null){
            console.log("group is null");
            continue;
        }
        message += i + ". <i>" + group.title + "</i> (" + uig.reputation + ")\n";
        i++;
    }

    message += "\n\nSelect one of the above groups by pressing the buton with the corresponding number.";
    console.log("test if loops from dynamic main");

    range.submenu("List my groups", "group-list-menu", ctx =>ctx.editMessageText(message, { parse_mode : "HTML" }));
    return range;

});

const group_list_menu = new Menu("group-list-menu");
group_list_menu.dynamic( async (ctx) => {
    const range = new MenuRange();
    let i=1;
    for (const uig of global_uigs) {
        const group = await group_dao.getGroup(uig.chatid);
        if (group === null){
            console.log("group is null");
            continue;
        }
        const message = select_group(ctx, ctx.chat?.type, group.title, uig)
        range.submenu(""+i, "selected-group-menu", ctx =>ctx.editMessageText(message, { parse_mode : "HTML" }));
        i++;
    }

    return range;
})
.row()
.text("Back to main menu", (ctx) => ctx.menu.nav("my-main-menu", { immediate: true,  }))
.register(start_menu);

const selected_group_menu = new Menu("selected-group-menu");
selected_group_menu.text("Back to groups list", (ctx) => ctx.menu.nav("group-list-menu")).register(group_list_menu);

export  async function print_menu( ctx : Context ) {
    await ctx.reply("Check out this menu:", { reply_markup: start_menu });
}



async function print_my_groups(ctx: Context) {

    if (ctx.chat?.type !== "private"){
        ctx.reply("This command is only available in private chats");
        console.log("print_my_groups command used in chat:" + ctx.chat?.type + " id:" + ctx.chat?.id);
        return;
    }

    const user = ctx.from;
    if (user === undefined) throw new Error("ctx.from is undefined");
    
    let uigs = await uig_dao.getByUserId(BigInt(user.id));
        
    let message = "Hi! We are both in the following groups: \n\n";
    const range = new MenuRange();   
    let i=1;
    for (const uig of uigs) {
        let group = await group_dao.getGroup(uig.chatid);
        if (group === null){
            console.log("group is null");
            continue;
        }
        message += i + ". <i>" + group.title + "</i> (" + uig.reputation + ")\n";
        range.text(i.toString(), (ctx) => select_group(ctx, ctx.chat?.type, group.title, uig));
        i++;
    }

    message += "\n\nSelect one of the above groups by pressing the buton with the corresponding number.";

    console.log("test if loops")

    //i want to log the old message to see if it is different from the new one
    if (ctx.update.callback_query?.message !== undefined) {
        console.log("old message is: "+ctx.update.callback_query?.message.text)
        console.log("new message is: "+message)
    }

    //if (ctx.update.callback_query?.message !== undefined && ctx.update.callback_query?.message.text !== message) ctx.api.editMessageText(ctx.chat?.id, ctx.update.callback_query.message.message_id, message, { parse_mode : "HTML", reply_markup: group_list_menu });
    return range;

}

function select_group(ctx: Context, type: string | undefined, title: string, uig: user_in_group) {
    if (type !== "private") {
        console.log("select_group command used in chat:" + type + " id:" + ctx.chat?.id);
        throw new Error("select_group function used in non-private chat");
    }
    
    if (uig === null) throw new Error("group is null");

    const message = "Selected group: <i>" + title + "</i>"
    + "\n\n🎩 Reputation: " + uig.reputation + "\n"
    + "📖 Total messages sent: " + uig.messages + "\n"
    + "💬 Total messages sent today: " + uig.messages_today + "\n"
    + "➕ Up available: " + uig.up_available + "\n"
    + "➖ Down available: " + uig.down_available + "\n";

    //ctx.reply(message, { parse_mode : "HTML" });
    return message;

}