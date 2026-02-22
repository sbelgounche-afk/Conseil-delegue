import express, { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import { JWT_SECRET } from './auth';
import { authenticate, AuthRequest } from './posts';

const router = express.Router();

// Multer config for avatar uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, 'avatar-' + uuidv4() + ext);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mime = allowedTypes.test(file.mimetype);
        if (ext && mime) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed') as any);
        }
    }
});

// Middleware to verify admin
const authenticateAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const user = await db.user.findUnique({
            where: { id: decoded.id },
            select: { is_admin: true }
        });

        if (!user || !user.is_admin) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        req.userId = decoded.id;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// --- Get Current User's Profile ---
router.get('/profile', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = await db.user.findUnique({
            where: { id: req.userId },
            include: {
                _count: {
                    select: {
                        posts: true,
                        followedBy: true,
                        following: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userResult = user as any;
        const { password, ...userWithoutPassword } = userResult;

        res.json({
            ...userWithoutPassword,
            posts: userResult._count.posts,
            followers: userResult._count.followedBy,
            following: userResult._count.following
        });
    } catch (err) {
        console.error('Error getting profile:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get user by username
router.get('/username/:username', async (req: AuthRequest, res: Response) => {
    try {
        const user = await db.user.findUnique({
            where: { username: String(req.params.username) },
            select: {
                id: true,
                username: true,
                name: true,
                avatar: true,
                bio: true,
                _count: {
                    select: {
                        posts: true,
                        followedBy: true,
                        following: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let isFollowing = false;
        if (req.headers.authorization) {
            try {
                const token = String(req.headers.authorization).split(' ')[1];
                const decoded = jwt.verify(token, JWT_SECRET) as any;
                const follow = await db.follow.findUnique({
                    where: {
                        follower_id_following_id: {
                            follower_id: decoded.id as number,
                            following_id: user.id
                        }
                    }
                });
                isFollowing = !!follow;
            } catch (err) {
                // Ignore JWT errors for public profile view
            }
        }

        const userResult = user as any;
        res.json({
            ...userResult,
            posts: userResult._count.posts,
            followers: userResult._count.followedBy,
            following: userResult._count.following,
            isFollowing
        });
    } catch (err) {
        console.error('Error getting user by username:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// --- Update Profile Info ---
// Allows users to change their name, bio, phone, avatar, etc.
router.put('/profile', authenticate, upload.single('avatar'), async (req: AuthRequest, res: Response) => {
    const { name, bio, phone, age, grade, school, avatar } = req.body;

    try {
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (bio !== undefined) updateData.bio = bio;
        if (phone !== undefined) updateData.phone = phone;
        if (age !== undefined) updateData.age = age ? parseInt(age.toString() as string) : null;
        if (grade !== undefined) updateData.grade = grade;
        if (school !== undefined) updateData.school = school;

        if (req.file) {
            updateData.avatar = '/uploads/' + req.file.filename;
        } else if (avatar !== undefined) {
            updateData.avatar = avatar;
        }

        const user = await db.user.update({
            where: { id: req.userId },
            data: updateData
        });

        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ error: 'Error updating profile' });
    }
});

// --- Follow/Unfollow Logic ---
router.post('/follow/:userId', authenticate, async (req: AuthRequest, res: Response) => {
    const targetUserId = parseInt(String(req.params.userId));

    if (targetUserId === req.userId) {
        return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    try {
        const targetUser = await db.user.findUnique({ where: { id: targetUserId } });
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        await db.follow.upsert({
            where: {
                follower_id_following_id: {
                    follower_id: req.userId!,
                    following_id: targetUserId
                }
            },
            update: {},
            create: {
                follower_id: req.userId!,
                following_id: targetUserId
            }
        });

        res.json({ message: 'Followed successfully' });
    } catch (err) {
        console.error('Error following user:', err);
        res.status(500).json({ error: 'Error following user' });
    }
});

// Unfollow a user
router.delete('/follow/:userId', authenticate, async (req: AuthRequest, res: Response) => {
    const targetUserId = parseInt(String(req.params.userId));

    try {
        await db.follow.deleteMany({
            where: {
                follower_id: req.userId!,
                following_id: targetUserId
            }
        });
        res.json({ message: 'Unfollowed successfully' });
    } catch (err) {
        console.error('Error unfollowing user:', err);
        res.status(500).json({ error: 'Error unfollowing user' });
    }
});

// 4. API: Suggestions (users the current user might want to follow)
router.get('/suggestions', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        // Fetch 5 random users the current user is not following yet
        // Exclude the current user themselves and also exclude admin accounts
        const suggestions = await db.user.findMany({
            where: {
                id: { not: userId },
                is_admin: 0, // [FIX] Hide admins from suggestions
                followedBy: {
                    none: {
                        follower_id: userId
                    }
                }
            },
            select: {
                id: true,
                username: true,
                avatar: true
            },
            take: 5
        });

        res.json(suggestions);
    } catch (error) {
        console.error('Suggestions error:', error);
        res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
});

// 5. API: Search Users
router.get('/search', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const query = req.query.q as string;
        if (!query) {
            return res.json([]);
        }

        const users = await db.user.findMany({
            where: {
                username: { contains: query },
                is_admin: 0 // [FIX] Hide admins from search
            },
            select: {
                id: true,
                username: true,
                name: true,
                avatar: true
            },
            take: 10
        });

        res.json(users);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// ============================================
// ADMIN ROUTES
// ============================================

// --- Admin: List All Users ---
router.get('/admin/all-users', authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const users = await db.user.findMany({
            orderBy: { created_at: 'desc' },
            select: {
                id: true,
                username: true,
                email: true,
                name: true,
                phone: true,
                age: true,
                grade: true,
                school: true,
                avatar: true,
                bio: true,
                is_admin: true,
                created_at: true
            }
        });
        res.json(users);
    } catch (err) {
        console.error('Error getting all users:', err);
        res.status(500).json({ error: 'Error getting users' });
    }
});

// Get statistics (admin only)
router.get('/admin/stats', authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const [userCount, postCount, likeCount, commentCount] = await Promise.all([
            db.user.count(),
            db.post.count(),
            db.like.count(),
            db.comment.count()
        ]);

        // Users by grade
        const gradeStats = await db.user.groupBy({
            by: ['grade'],
            where: { grade: { not: '' } },
            _count: { _all: true }
        });

        // Users by age
        const ageStats = await db.user.groupBy({
            by: ['age'],
            where: { age: { not: null } },
            _count: { _all: true },
            orderBy: { age: 'asc' }
        });

        res.json({
            totalUsers: userCount,
            totalPosts: postCount,
            totalLikes: likeCount,
            totalComments: commentCount,
            usersByGrade: gradeStats.map((s: any) => ({ grade: s.grade, count: s._count._all })),
            usersByAge: ageStats.map((s: any) => ({ age: s.age, count: s._count._all }))
        });
    } catch (err) {
        console.error('Error getting admin stats:', err);
        res.status(500).json({ error: 'Error getting statistics' });
    }
});

// Delete user (admin only)
router.delete('/admin/user/:userId', authenticateAdmin, async (req: AuthRequest, res: Response) => {
    const targetUserId = parseInt(String(req.params.userId));

    try {
        const user = await db.user.findUnique({
            where: { id: targetUserId },
            select: { is_admin: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.is_admin) {
            return res.status(400).json({ error: 'Cannot delete admin user' });
        }

        // Deleting a user in Prisma with cascading relations (if configured) or manual deleteMany
        await db.$transaction([
            db.like.deleteMany({ where: { user_id: targetUserId } }),
            db.comment.deleteMany({ where: { user_id: targetUserId } }),
            db.follow.deleteMany({
                where: {
                    OR: [
                        { follower_id: targetUserId },
                        { following_id: targetUserId }
                    ]
                }
            }),
            db.post.deleteMany({ where: { user_id: targetUserId } }),
            db.user.delete({ where: { id: targetUserId } })
        ]);

        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ error: 'Error deleting user' });
    }
});

export default router;

