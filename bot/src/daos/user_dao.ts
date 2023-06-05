import { PrismaClient, User } from '@prisma/client'
import { inflate } from 'zlib';
const prisma = new PrismaClient();

//save a user to the database if it doesn't exist or update all fields except for cbdata
export async function upsertUser(user: User) {

    await prisma.user.upsert({
        where: { userid: user.userid },
        update: { username: user.username, firstname: user.firstname, lastname: user.lastname, language: user.language },
        create: {
            userid: user.userid,
            username: user.username,
            firstname: user.firstname,
            lastname: user.lastname,
            language: user.language,
            //if the user is created, i also add the cbdata field
            cbdata: user.cbdata
        }
    });
}

/**
 * Function to update the reputation of a user in a group, 
 * it also adds a new entry in the user_in_group table if the user is not already associated with the group
 * @param userid the id of the user
 * @param groupid the id of the group where we have to update the user reputation
 * @param amount the amount of reputation to add or subtract
 * @param is_admin if the user is an admin or not of that group (needed in case the user is not alread associated with the group)
 */
export async function upsertUserReputation(userid: bigint, groupid: number, amount: number, is_admin: boolean) {

    //get the user_in_group entry for the user in the group
    const user_in_group = await prisma.user_in_group.findFirst({
        where: { userid: userid, chatid: groupid }
    });

    //if the user is not in the group, add it
    if (user_in_group === null) {
        await prisma.user_in_group.create({
            data: {
                userid: userid,
                chatid: groupid,
                reputation: amount,
                reputation_today: amount,
                is_admin: is_admin
            }
        });
    }
    else {
        await prisma.user_in_group.update({
            where: { id: user_in_group.id },
            data: {
                reputation: user_in_group.reputation + amount,
                reputation_today: user_in_group.reputation_today + amount
            }
        });
    }
}


/**
 * Function to update the reputation of a user in a group, 
 * it also adds a new entry in the user_in_group table if the user is not already associated with the group
 * @param userid the id of the user
 * @param groupid the id of the group where we have to update the user reputation
 * @param amount the amount of up availables to add or subtract (usually set to -1)
 * @param is_admin if the user is an admin or not of that group (needed in case the user is not alread associated with the group)
 */
export async function upsertUserUpAvailable(userid: bigint, groupid: number, amount: number, is_admin: boolean) {

    //get the user_in_group entry for the user in the group
    let user_in_group = await prisma.user_in_group.findFirst({
        where: { userid: userid, chatid: groupid }
    });

    //if the user is not in the group, add it
    if (user_in_group === null) {
        user_in_group = await prisma.user_in_group.create({
            data: {
                userid: userid,
                chatid: groupid,
                is_admin: is_admin
            }
        });

        if (user_in_group === null) throw new Error("user_in_group is null after create!");

        console.log("user_in_group created: ");
        console.log(user_in_group);
    }

    //if the user doesn't have enough up_available, throw an error
    if (user_in_group.up_available + amount < 0) {
        //TODO: add a message to the user to tell him that he doesn't have enough up_available
        // maybe at the upper level of the code, in the module that calls this function
        throw new Error("INSUFFICIENT_UP_AVAILABLE");
    }

    await prisma.user_in_group.update({
        where: { id: user_in_group.id },
        data: {
            up_available: user_in_group.up_available + amount,
        }
    });

}

/**
 * function to get the reputation of a user in a group
 * 
 * @param userid 
 * @param groupid
 */
export async function getUserReputation(userid: bigint, groupid: number) {

    const user_in_group = await prisma.user_in_group.findFirst({
        where: { userid: userid, chatid: groupid }
    });

    if (user_in_group === null) {
        return 0;
    }

    return user_in_group.reputation;
}

/**
 * function to get the up_available of a user in a group
 * 
 * @param userid
 * @param groupid
 * 
 */
export async function getUserUpAvailable(userid: bigint, groupid: number) {

    const user_in_group = await prisma.user_in_group.findFirst({
        where: { userid: userid, chatid: groupid }
    });

    if (user_in_group === null) {
        return 0;
    }

    return user_in_group.up_available;
}