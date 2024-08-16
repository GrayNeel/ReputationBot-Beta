import { Group, PrismaClient} from '@prisma/client'
const prisma = new PrismaClient();

export async function upsertGroup(group:Group) {

    await prisma.group.upsert({
        where: { chatid: group.chatid },
        update: {
            title: group.title,
            type: group.type,
            is_silent: group.is_silent,
        },
        create: {
            chatid: group.chatid,
            title: group.title,
            type: group.type,
            is_silent: group.is_silent,
        }
    })

}

/**
 * Must be called after the deletion of each entry in other tables that might use this groupId as a foreign key
 * @param group 
 */
export async function removeGroup(chatid: bigint) {

    await prisma.group.delete({
        where: {
          chatid: chatid
        }
      }).catch(()=>{ throw new Error("removeGroup has failed in removing group: "+chatid); })
    
}

export async function getGroup(chatid: bigint) {
    
        const group = await prisma.group.findUnique({
            where: { chatid: chatid }
        });
    
        return group;
}

export async function invertIsSilent(chatid: bigint) {
    
    const group = await getGroup(chatid);
    if (group === null) throw new Error("group with chatid: " + chatid + " is null");

    await prisma.group.update({
        where: { chatid: chatid },
        data: { is_silent: !group?.is_silent }
    });
    
    return;
}
