import express, { Response } from 'express';
import { db } from '../database';
import { authenticate, AuthRequest } from './posts';

const router = express.Router();

/**
 * Ensures all users with is_admin: 1 are members of the specified group.
 */
async function ensureAdminsInGroup(groupId: number) {
    const admins = await db.user.findMany({
        where: { is_admin: 1 },
        select: { id: true }
    });

    for (const admin of admins) {
        await db.groupMember.upsert({
            where: { user_id_group_id: { user_id: admin.id, group_id: groupId } },
            update: {},
            create: { user_id: admin.id, group_id: groupId }
        });
    }
}

/**
 * Ensures a user belongs to the 3 mandatory default groups:
 * 1. GLOBAL (everyone)
 * 2. SCHOOL (everyone from the same school)
 * 3. LEVEL (everyone from the same grade)
 * Also ensures all admins are in these groups.
 */
export async function ensureUserInDefaultGroups(userId: number) {
    const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, school: true, grade: true, is_admin: true }
    });

    if (!user) return;

    // 1. GLOBAL GROUP
    const globalGroupName = "Global Community";
    const globalGroup = await db.group.upsert({
        where: { name: globalGroupName },
        update: {},
        create: {
            name: globalGroupName,
            type: "GLOBAL"
        }
    });

    // Add current user
    await db.groupMember.upsert({
        where: { user_id_group_id: { user_id: userId, group_id: globalGroup.id } },
        update: {},
        create: { user_id: userId, group_id: globalGroup.id }
    });

    // Always ensure admins are in Global
    await ensureAdminsInGroup(globalGroup.id);

    // 2. SCHOOL GROUP
    if (user.school) {
        const schoolGroupName = `School: ${user.school}`;
        const schoolGroup = await db.group.upsert({
            where: { name: schoolGroupName },
            update: { school: user.school },
            create: {
                name: schoolGroupName,
                type: "SCHOOL",
                school: user.school
            }
        });
        await db.groupMember.upsert({
            where: { user_id_group_id: { user_id: userId, group_id: schoolGroup.id } },
            update: {},
            create: { user_id: userId, group_id: schoolGroup.id }
        });

        // Ensure admins are in this school group
        await ensureAdminsInGroup(schoolGroup.id);
    }

    // 3. LEVEL GROUP
    if (user.grade) {
        const gradeGroupName = `Level: ${user.grade}`;
        const gradeGroup = await db.group.upsert({
            where: { name: gradeGroupName },
            update: { grade: user.grade },
            create: {
                name: gradeGroupName,
                type: "LEVEL",
                grade: user.grade
            }
        });
        await db.groupMember.upsert({
            where: { user_id_group_id: { user_id: userId, group_id: gradeGroup.id } },
            update: {},
            create: { user_id: userId, group_id: gradeGroup.id }
        });

        // Ensure admins are in this level group
        await ensureAdminsInGroup(gradeGroup.id);
    }
}

// 1. API: List my groups
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        // Ensure user is in default groups before listing
        await ensureUserInDefaultGroups(userId);

        const memberships = await db.groupMember.findMany({
            where: { user_id: userId },
            include: {
                group: {
                    include: {
                        _count: {
                            select: { members: true }
                        }
                    }
                }
            }
        });

        const groups = memberships.map(m => ({
            ...m.group,
            memberCount: m.group._count.members
        }));

        res.json(groups);
    } catch (error) {
        console.error('List groups error:', error);
        res.status(500).json({ error: 'Failed to fetch groups' });
    }
});

// 2. API: Get group messages
router.get('/:groupId/messages', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const groupId = parseInt(req.params.groupId);
        const userId = req.userId!;

        // Security: Check if user is a member
        const membership = await db.groupMember.findUnique({
            where: { user_id_group_id: { user_id: userId, group_id: groupId } }
        });

        if (!membership) {
            return res.status(403).json({ error: 'Not a member of this group' });
        }

        const messages = await db.groupMessage.findMany({
            where: { group_id: groupId },
            orderBy: { created_at: 'asc' },
            include: {
                user: {
                    select: {
                        username: true,
                        avatar: true,
                        is_admin: true
                    }
                }
            }
        });

        res.json(messages);
    } catch (error) {
        console.error('Get group messages error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// 3. API: Send message to group
router.post('/:groupId/messages', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const groupId = parseInt(req.params.groupId);
        const userId = req.userId!;
        const { text } = req.body;

        if (!text || text.trim() === '') {
            return res.status(400).json({ error: 'Message text is required' });
        }

        // 1. Check membership and permissions
        const membership = await db.groupMember.findUnique({
            where: { user_id_group_id: { user_id: userId, group_id: groupId } },
            include: {
                group: true,
                user: {
                    select: { is_admin: true }
                }
            }
        });

        if (!membership) {
            return res.status(403).json({ error: 'Not a member of this group' });
        }

        // Special Rule: GLOBAL groups can only be messaged by Admins
        if (membership.group.type === "GLOBAL" && membership.user.is_admin === 0) {
            return res.status(403).json({ error: 'Only admins can send messages to the Global group' });
        }

        // 2. Create message
        const message = await db.groupMessage.create({
            data: {
                group_id: groupId,
                user_id: userId,
                text
            },
            include: {
                user: {
                    select: {
                        username: true,
                        avatar: true,
                        is_admin: true
                    }
                }
            }
        });

        res.json(message);
    } catch (error) {
        console.error('Send group message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

export default router;
