import { Menu } from "@grammyjs/menu";
import { Context } from "grammy";
import * as uig_dao from "../daos/user_in_group_dao";
import * as group_dao from "../daos/group_dao";

export const start_menu = new Menu("my-menu-identifier")
.text("Get my groups", (ctx) => print_my_groups(ctx)).row()
.text("B", (ctx) => ctx.reply("You pressed B!"));

export  async function print_menu( ctx : Context ) {
    await ctx.reply("Check out this menu:", { reply_markup: start_menu });
}

async function print_my_groups(ctx: Context) {
    if (ctx.chat?.type !== "private")
        throw new Error("This command is only available in private chats");

    ctx.reply("You are in the following groups: ");
    const user = ctx.from;
    if (user === undefined) throw new Error("ctx.from is undefined");

    let uigs = await uig_dao.getByUserId(BigInt(user.id));

    if (uigs.length <= 0) {
        ctx.reply("You share no groups with this bot or you have never sent a message in them from the moment the bot was added.");
        return;
    }

    for (const uig of uigs) {
        let group = await group_dao.getGroup(uig.chatid);
        if (group === null) throw new Error("group is null");

        ctx.reply("NAME: " + group.title + "\nREPUTATION: " + uig.reputation);
    }
    

}