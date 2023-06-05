import { Context } from 'grammy';
import { User } from "@prisma/client";

//function to parse User object from ctx.from
export function parseSender(ctx: Context) : User {
    if (ctx === undefined) {
        throw new Error('ctx is UNDEFINED and it must be provided!');
    }

    const from = ctx.from;
    if (from === undefined) {
        throw new Error('ctx.from is UNDEFINED!');
    }

    //check the values that can be undefined and set them to empty strings if they are
    const id = BigInt(from.id);
    const firstname = from.first_name;
    const lastname = from.last_name == undefined ? "" : from.last_name;
    const username = from.username == undefined ? "" : from.username;
    const language = from.language_code == undefined ? "" : from.language_code;

    const sender : User = { userid: id, firstname: firstname, lastname: lastname, username: username, language: language, cbdata: ""  };
    return sender;
}