"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const database_1 = require("../database");
const auth_1 = require("./auth");
const posts_1 = require("./posts");
const router = express_1.default.Router();
// Multer config for avatar uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadsDir = path_1.default.join(__dirname, '..', '..', 'uploads');
        if (!fs_1.default.existsSync(uploadsDir)) {
            fs_1.default.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        cb(null, 'avatar-' + (0, uuid_1.v4)() + ext);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const ext = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mime = allowedTypes.test(file.mimetype);
        if (ext && mime) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed'));
        }
    }
});
// Middleware to verify admin
const authenticateAdmin = async (req, res, next) => {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, auth_1.JWT_SECRET);
        const user = await database_1.db.user.findUnique({
            where: { id: decoded.id },
            select: { is_admin: true }
        });
        if (!user || !user.is_admin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        req.userId = decoded.id;
        next();
    }
    catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
// --- Get Current User's Profile ---
router.get('/profile', posts_1.authenticate, async (req, res) => {
    try {
        const user = await database_1.db.user.findUnique({
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
        const userResult = user;
        const { password } = userResult, userWithoutPassword = __rest(userResult, ["password"]);
        res.json(Object.assign(Object.assign({}, userWithoutPassword), { posts: userResult._count.posts, followers: userResult._count.followedBy, following: userResult._count.following }));
    }
    catch (err) {
        console.error('Error getting profile:', err);
        res.status(500).json({ error: 'Database error' });
    }
});
// Get user by username
router.get('/username/:username', async (req, res) => {
    try {
        const user = await database_1.db.user.findUnique({
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
                const decoded = jsonwebtoken_1.default.verify(token, auth_1.JWT_SECRET);
                const follow = await database_1.db.follow.findUnique({
                    where: {
                        follower_id_following_id: {
                            follower_id: decoded.id,
                            following_id: user.id
                        }
                    }
                });
                isFollowing = !!follow;
            }
            catch (err) {
                // Ignore JWT errors for public profile view
            }
        }
        const userResult = user;
        res.json(Object.assign(Object.assign({}, userResult), { posts: userResult._count.posts, followers: userResult._count.followedBy, following: userResult._count.following, isFollowing }));
    }
    catch (err) {
        console.error('Error getting user by username:', err);
        res.status(500).json({ error: 'Database error' });
    }
});
// --- Update Profile Info ---
// Allows users to change their name, bio, phone, avatar, etc.
router.put('/profile', posts_1.authenticate, upload.single('avatar'), async (req, res) => {
    const { name, bio, phone, age, grade, school, avatar } = req.body;
    try {
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (bio !== undefined)
            updateData.bio = bio;
        if (phone !== undefined)
            updateData.phone = phone;
        if (age !== undefined)
            updateData.age = age ? parseInt(age.toString()) : null;
        if (grade !== undefined)
            updateData.grade = grade;
        if (school !== undefined)
            updateData.school = school;
        if (req.file) {
            updateData.avatar = '/uploads/' + req.file.filename;
        }
        else if (avatar !== undefined) {
            // If explicitly set to empty string, reset to default
            updateData.avatar = avatar.trim() === '' ? '/uploads/default-avatar.svg' : avatar;
        }
        const user = await database_1.db.user.update({
            where: { id: req.userId },
            data: updateData
        });
        const { password } = user, userWithoutPassword = __rest(user, ["password"]);
        res.json(userWithoutPassword);
    }
    catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ error: 'Error updating profile' });
    }
});
// --- Follow/Unfollow Logic ---
router.post('/follow/:userId', posts_1.authenticate, async (req, res) => {
    const targetUserId = parseInt(String(req.params.userId));
    if (targetUserId === req.userId) {
        return res.status(400).json({ error: 'Cannot follow yourself' });
    }
    try {
        const targetUser = await database_1.db.user.findUnique({ where: { id: targetUserId } });
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        await database_1.db.follow.upsert({
            where: {
                follower_id_following_id: {
                    follower_id: req.userId,
                    following_id: targetUserId
                }
            },
            update: {},
            create: {
                follower_id: req.userId,
                following_id: targetUserId
            }
        });
        res.json({ message: 'Followed successfully' });
    }
    catch (err) {
        console.error('Error following user:', err);
        res.status(500).json({ error: 'Error following user' });
    }
});
// Unfollow a user
router.delete('/follow/:userId', posts_1.authenticate, async (req, res) => {
    const targetUserId = parseInt(String(req.params.userId));
    try {
        await database_1.db.follow.deleteMany({
            where: {
                follower_id: req.userId,
                following_id: targetUserId
            }
        });
        res.json({ message: 'Unfollowed successfully' });
    }
    catch (err) {
        console.error('Error unfollowing user:', err);
        res.status(500).json({ error: 'Error unfollowing user' });
    }
});
// 4. API: Suggestions (users the current user might want to follow)
router.get('/suggestions', posts_1.authenticate, async (req, res) => {
    try {
        const userId = req.userId;
        // Fetch 5 random users the current user is not following yet
        // Exclude the current user themselves and also exclude admin accounts
        const suggestions = await database_1.db.user.findMany({
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
    }
    catch (error) {
        console.error('Suggestions error:', error);
        res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
});
// 5. API: Search Users
router.get('/search', posts_1.authenticate, async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.json([]);
        }
        const users = await database_1.db.user.findMany({
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
    }
    catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});
// ============================================
// ADMIN ROUTES
// ============================================
// --- Admin: List All Users ---
router.get('/admin/all-users', authenticateAdmin, async (req, res) => {
    try {
        const users = await database_1.db.user.findMany({
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
    }
    catch (err) {
        console.error('Error getting all users:', err);
        res.status(500).json({ error: 'Error getting users' });
    }
});
// Get statistics (admin only)
router.get('/admin/stats', authenticateAdmin, async (req, res) => {
    try {
        const [userCount, postCount, likeCount, commentCount] = await Promise.all([
            database_1.db.user.count(),
            database_1.db.post.count(),
            database_1.db.like.count(),
            database_1.db.comment.count()
        ]);
        // Users by grade
        const gradeStats = await database_1.db.user.groupBy({
            by: ['grade'],
            where: { grade: { not: '' } },
            _count: { _all: true }
        });
        // Users by age
        const ageStats = await database_1.db.user.groupBy({
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
            usersByGrade: gradeStats.map((s) => ({ grade: s.grade, count: s._count._all })),
            usersByAge: ageStats.map((s) => ({ age: s.age, count: s._count._all }))
        });
    }
    catch (err) {
        console.error('Error getting admin stats:', err);
        res.status(500).json({ error: 'Error getting statistics' });
    }
});
// Delete user (admin only)
router.delete('/admin/user/:userId', authenticateAdmin, async (req, res) => {
    const targetUserId = parseInt(String(req.params.userId));
    try {
        const user = await database_1.db.user.findUnique({
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
        await database_1.db.$transaction([
            database_1.db.like.deleteMany({ where: { user_id: targetUserId } }),
            database_1.db.comment.deleteMany({ where: { user_id: targetUserId } }),
            database_1.db.follow.deleteMany({
                where: {
                    OR: [
                        { follower_id: targetUserId },
                        { following_id: targetUserId }
                    ]
                }
            }),
            database_1.db.post.deleteMany({ where: { user_id: targetUserId } }),
            database_1.db.user.delete({ where: { id: targetUserId } })
        ]);
        res.json({ message: 'User deleted successfully' });
    }
    catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ error: 'Error deleting user' });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map