import { PrismaClient, User } from '@prisma/client'
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

export async function getUserById(userid: bigint) {

    const user = await prisma.user.findUnique({
        where: { userid: userid }
    });

    return user;
}

