import { user_in_group } from "@prisma/client";
import { Context } from "grammy"

/**TODO:function to parse User object from ctx.from
 * 
*/
//export function parseUserInGroup(ctx: Context) : user_in_group {
//    
//    if (ctx === undefined) throw new Error('ctx is UNDEFINED and it must be provided!');
//
//    const from = ctx.from;
//    if (from === undefined) throw new Error('ctx.from is UNDEFINED!');
//
//    const chat = ctx.chat;
//    if (chat === undefined) throw new Error('ctx.chat is UNDEFINED!');
//
//    const chatid = BigInt(from.id);
//    const userid = BigInt(chat.id);
//    
//}