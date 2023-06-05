import { Group } from "@prisma/client";
import { Context } from "grammy"

//function to parse Group object from ctx.chat
export function Group(chatid: bigint, title: string, type: string, is_silent: boolean ) : Group {

    if (type != "group" && type != "supergroup") {
        throw new Error('type is not a group or a supergroup! is a ' + type + ' instead!');
    }

    const group_obj : Group = { chatid: BigInt(chatid), title: title, type: type, is_silent: false };
    
    return group_obj;
}

//function to parse Group object from ctx.chat
export function parseGroup(ctx: Context ) : Group {

    if (ctx === undefined) throw new Error('ctx is UNDEFINED and it must be provided!');
    if (ctx.chat === undefined) throw new Error('ctx.chat is UNDEFINED!');

    const chatid = BigInt(ctx.chat.id);
    const type = ctx.chat.type;

    if (type != "group" && type != "supergroup") throw new Error('type is not a group or a supergroup! is a ' + type + ' instead!');
    //the check above it's needed to let typescript infer that title exist in ctx.chat since private chats have no title.
    const title = ctx.chat.title;

    const group_obj : Group = { chatid: chatid, title: title, type: type, is_silent: false };
    
    return group_obj;
}