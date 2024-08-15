import { Menu, MenuRange } from "@grammyjs/menu";
import { Context } from "grammy";
import * as uig_dao from "../daos/user_in_group_dao";
import * as group_dao from "../daos/group_dao";
import { user_in_group } from "@prisma/client";

// ---- MAIN MENU FUNCTIONS ---- //
//define and export the main menu
export const start_menu = new Menu('my-main-menu')
start_menu.submenu("List my groups", "group-list-menu", async (ctx) => {
    ctx.editMessageText(await generate_group_list_menu_message(ctx), { parse_mode: "HTML" })
});

export async function print_main_menu(ctx: Context) {
    await ctx.reply(generate_main_menu_message(), { parse_mode: "HTML", reply_markup: start_menu });
}

function generate_main_menu_message() {
    return "🤖 <b>Welcome to the private menu, human.</b>";
}

// ---- GROUP LIST MENU FUNCTIONS ---- //
// define the group list menu
const group_list_menu = new Menu("group-list-menu");
group_list_menu.dynamic(async (ctx) => {

    // get the list of groups the user is in
    const user = ctx.from;
    if (user === undefined) throw new Error("ctx.from is undefined");
    const uigs = await uig_dao.getByUserId(BigInt(user.id));

    // define a button for each group
    const range = new MenuRange();
    let i = 1;
    for (const uig of uigs) {
        const group = await group_dao.getGroup(uig.chatid);
        if (group === null) {
            console.log("group with chatid: " + uig.chatid + " is null");
            continue;
        }
        const message = select_group_message(ctx, ctx.chat?.type, group.title, uig)
        range.submenu(`${i}`, "selected-group-menu", ctx => ctx.editMessageText(message, { parse_mode: "HTML" }));
        i++;
    }

    return range;
})
    .row()
    .text("Back to main menu", async (ctx) => {
        await ctx.editMessageText(generate_main_menu_message());
        ctx.menu.nav("my-main-menu", { immediate: true })
    })
    .register(start_menu);

async function generate_group_list_menu_message(ctx: Context) {

    const user = ctx.from;
    if (user === undefined) throw new Error("ctx.from is undefined");

    const uigs = await uig_dao.getByUserId(BigInt(user.id));
    let message = "We are both in the following groups: \n\n";
    let i = 1;
    for (const uig of uigs) {
        let group = await group_dao.getGroup(uig.chatid);
        if (group === null) continue;
        message += i + ". <i>" + group.title + "</i> (" + uig.reputation + ")\n";
        i++;
    }

    message += "\n\nSelect one of the above groups by pressing the buton with the corresponding number.";
    return message;
}

// ---- SELECTED GROUP MENU FUNCTIONS ---- //
// define the menu for a selected group
const selected_group_menu = new Menu("selected-group-menu");
selected_group_menu.text("Back to groups list", async (ctx) => {
    ctx.editMessageText(await generate_group_list_menu_message(ctx), { parse_mode: "HTML" });
    ctx.menu.nav("group-list-menu")
})
    .register(group_list_menu);

function select_group_message(ctx: Context, type: string | undefined, title: string, uig: user_in_group) {
    if (type !== "private") {
        console.log("select_group command used in chat:" + type + " id:" + ctx.chat?.id);
        throw new Error("select_group function used in non-private chat");
    }
    if (uig === null) throw new Error("group is null");

    const message = "👥 <b>" + title + "</b> 👥"
        + "\n\n🎩 Your Reputation: " + uig.reputation + "\n"
        + "📖 Total messages sent: " + uig.messages + "\n"
        + "💬 Total messages sent today: " + uig.messages_today + "\n"
        + "➕ Up available: " + uig.up_available + "\n"
        + "➖ Down available: " + uig.down_available + "\n";

    return message;

}
