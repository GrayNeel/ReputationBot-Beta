import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient();

const MAX_UP_AVAILABLE = 10;
const MAX_DOWN_AVAILABLE = 2;

// set up_available = 10 and down_available = 2 for every user in every group

export async function resetAllUpAndDownAvailable() {

    const update_count = await prisma.user_in_group.updateMany({
        //where: {
        //    up_available: { not: MAX_UP_AVAILABLE },
        //    down_available: { not: MAX_DOWN_AVAILABLE }
        //},
        data: {
            up_available: MAX_UP_AVAILABLE,
            down_available: MAX_DOWN_AVAILABLE
        }
    });
    
    return update_count;
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

/**
 * Function to update the reputation of a user in a group, 
 * it also adds a new entry in the user_in_group table if the user is not already associated with the group
 * @param userid the id of the user
 * @param groupid the id of the group where we have to update the user reputation
 * @param amount the amount of reputation to add or subtract
 * @param is_admin if the user is an admin or not of that group (needed in case the user is not already associated with the group)
 */
export async function upsertUserReputation(userid: bigint, groupid: bigint, amount: number, is_admin: boolean) {

    //get the user_in_group entry for the user in the group
    let uig = await upsertUserInGroup(userid, groupid, is_admin);

    uig = await prisma.user_in_group.update({
        where: {
            userid_chatid: {
                userid: userid,
                chatid: groupid
            }
        },
        data: {
            reputation: uig.reputation + amount,
            reputation_today: uig.reputation_today + amount
        }
    });

    return uig.reputation;

}


/**
 * Function to update the remaining ups of a user in a group, 
 * it also adds a new entry in the user_in_group table if the user is not already associated with the group
 * @param userid the id of the user
 * @param groupid the id of the group where we have to update the user "up" availability
 * @param amount the amount of up availables to add or subtract (usually set to -1)
 * @param is_admin if the user is an admin or not of that group (needed in case the user is not already associated with the group)
 */
export async function upsertUserUpAvailable(userid: bigint, groupid: bigint, amount: number, is_admin: boolean) {

    //get the user_in_group entry for the user in the group
    let uig = await upsertUserInGroup(userid, groupid, is_admin);

    //if the user doesn't have enough up_available, throw an error
    if (uig.up_available + amount < 0) {
        //TODO: add a message to the user to tell him that he doesn't have enough up_available
        // maybe at the upper level of the code, in the module that calls this function
        throw new Error("INSUFFICIENT_UP_AVAILABLE");
    }

    uig = await prisma.user_in_group.update({
        where: {
            userid_chatid: {
                userid: userid,
                chatid: groupid
            }
        },
        data: {
            up_available: uig.up_available + amount,
        }
    });

    return uig.up_available;

}

/**
 * Function to update the remaining downs of a user in a group, 
 * it also adds a new entry in the user_in_group table if the user is not already associated with the group
 * @param userid the id of the user
 * @param groupid the id of the group where we have to update the user "down" availability
 * @param amount the amount of down availables to add or subtract (usually set to -1)
 * @param is_admin if the user is an admin or not of that group (needed in case the user is not alread associated with the group)
 */
export async function upsertUserDownAvailable(userid: bigint, groupid: bigint, amount: number, is_admin: boolean) {

    //get the user_in_group entry for the user in the group
    let uig = await upsertUserInGroup(userid, groupid, is_admin);

    //if the user doesn't have enough down_available, throw an error
    if (uig.down_available + amount < 0) {
        //TODO: add a message to the user to tell him that he doesn't have enough down_available
        // maybe at the upper level of the code, in the module that calls this function
        throw new Error("INSUFFICIENT_DOWN_AVAILABLE");
    }

    uig = await prisma.user_in_group.update({
        where: {
            userid_chatid: {
                userid: userid,
                chatid: groupid
            }
        },
        data: {
            down_available: uig.down_available + amount,
        }
    });

    return uig.down_available;

}

/**
 * function to get the reputation of a user in a group
 * 
 * @param userid 
 * @param groupid
 */
export async function getUserReputation(userid: bigint, groupid: bigint) {

    let uig = await upsertUserInGroup(userid, groupid, undefined);

    if (uig === null) {
        return 0;
    }

    return uig.reputation;
}

//save a user_in_group to the database if it doeasn't exist
export async function upsertUserInGroup(userid: bigint, groupid: bigint, is_admin: boolean | undefined) {

    //get the user_in_group entry for the user in the group
    let uig = await prisma.user_in_group.upsert({
        where: {
            userid_chatid: {
                userid: userid,
                chatid: groupid
            }
        },
        update: { is_admin: is_admin },
        create: {
            userid: userid,
            chatid: groupid,
            is_admin: is_admin
        }
    });

    return uig;
}

// get all groups id of a user
export async function getByUserId(userid: bigint) {

    const user_in_groups = await prisma.user_in_group.findMany({
        where: { userid: userid }
    });

    return user_in_groups;
}

//get top N users by reputation
export async function getTopNUsers(groupid: bigint, n_users: number) {
    let uig_users = await prisma.user_in_group.findMany({
        where: { chatid: groupid },
        orderBy: { reputation: 'desc' },
        take: n_users
    })

    return uig_users
}