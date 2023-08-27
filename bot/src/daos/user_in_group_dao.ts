import { PrismaClient, user_in_group } from '@prisma/client'
const prisma = new PrismaClient();

const MAX_UP_AVAILABLE = 10;
const MAX_DOWN_AVAILABLE = 2;

// set up_available = 10 and down_available = 2 for every user in every group

export async function resetAllUpAndDownAvailable() {

    prisma.user_in_group.updateMany({
        data: {
            up_available: MAX_UP_AVAILABLE,
            down_available: MAX_DOWN_AVAILABLE
        }
    });

}