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

        //i want to see if the user is an admin
        const admins = await ctx.api.getChatAdministrators(`${uig.chatid}`).catch((err) => {
            console.log(err);
            return [];
        });
        if (admins.length === 0) {
            console.log("group with chatid: " + uig.chatid + " has no admins, bot might have been removed from it");
            continue;
        }
        const isAdmin = admins.some((admin) => BigInt(admin.user.id) === uig.userid);

        const message = select_group_message(ctx, ctx.chat?.type, group.title, uig, isAdmin)
        range.submenu({ text: `${i}`, payload: `${uig.chatid}` }, "selected-group-menu", ctx => ctx.editMessageText(message, { parse_mode: "HTML" }));
        i++;
    }

    return range;
})
    .row()
    .text("Back to main menu", async (ctx) => {
        await ctx.editMessageText(generate_main_menu_message(), { parse_mode: "HTML" });
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
selected_group_menu
    .dynamic(async (ctx) => {

        const range = new MenuRange();
        const user = ctx.from;
        if (user === undefined) throw new Error("ctx.from is undefined");
        const chatid = ctx.match;
        if (chatid === undefined) throw new Error("ctx.match is undefined");
        if (typeof chatid !== "string") throw new Error("ctx.match is not a string");

        //i want to see if the user is an admin
        const admins = await ctx.api.getChatAdministrators(chatid).catch((err) => {
            console.log(err);
            return [];
        });
        if (admins.length === 0) {
            console.log("group with chatid: " + chatid + " has no admins, bot might have been removed from it");
            return range;
        }
        const isAdmin = admins.some((admin) => admin.user.id === user.id);


        if (isAdmin) {
            range.text({
                text: async (ctx) => {

                    const user = ctx.from;
                    if (user === undefined) throw new Error("ctx.from is undefined");

                    console.log("\n\nctx.match: " + ctx.match);
                    const chatid = ctx.match;
                    if (chatid === undefined) throw new Error("ctx.match is undefined");
                    if (typeof chatid !== "string") throw new Error("ctx.match is not a string");
                    const group = await group_dao.getGroup(BigInt(chatid));

                    return group?.is_silent ? "ADMIN: Deactivate Silence Mode" : "ADMIN:Activate Silence Mode";

                },
                payload: (ctx) => {
                    if (ctx.match === undefined) throw new Error("payload: ctx.match is undefined");
                    if (typeof ctx.match !== "string") throw new Error("payload: ctx.match is not a string");
                    return ctx.match
                }
            },
                async ctx => {
                    if (ctx.match === undefined) throw new Error("handler: ctx.match is undefined");
                    if (typeof ctx.match !== "string") throw new Error("handler: ctx.match is not a string");
                    await group_dao.invertIsSilent(BigInt(ctx.match));
                    await ctx.menu.update()
                }).row()
        }
        return range

    })
    .text({
        text: "Back to groups list",
        payload: (ctx) => {
            if (ctx.match === undefined) throw new Error("payload: ctx.match is undefined");
            if (typeof ctx.match !== "string") throw new Error("payload: ctx.match is not a string");
            return ctx.match
        }
    }, async (ctx) => {
        await ctx.editMessageText(await generate_group_list_menu_message(ctx), { parse_mode: "HTML" });
        await ctx.menu.nav("group-list-menu", { immediate: true })
    })
    .register(group_list_menu);

function select_group_message(ctx: Context, type: string | undefined, title: string, uig: user_in_group, isAdmin: boolean) {
    if (type !== "private") {
        console.log("select_group command used in chat:" + type + " id:" + ctx.chat?.id);
        throw new Error("select_group function used in non-private chat");
    }
    if (uig === null) throw new Error("group is null");

    let message = "👥 <b>" + title + "</b> 👥"
        + "\n\n🎩 Your Reputation: " + uig.reputation + "\n"
        + "📖 Total messages sent: " + uig.messages + "\n"
        + "💬 Total messages sent today: " + uig.messages_today + "\n"
        + "➕ Up available: " + uig.up_available + "\n"
        + "➖ Down available: " + uig.down_available + "\n";

    if (isAdmin) {
        message += "\nYou are an Admin of this group, so you can activate or deactivate silence mode,"
            + "silence mode will deactivate the bot notifications in the chat when users give a + or a -.";
    }

    return message;

}
