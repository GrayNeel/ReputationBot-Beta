import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient();

//save a userId to the database if it doesn't exist
export async function saveUser(userId: number, name: string | undefined) {
    await prisma.user.upsert({
        where: { id: userId },
        update: {name: name},
        create: {
            id: userId,
            name: name
        }
    });
}

