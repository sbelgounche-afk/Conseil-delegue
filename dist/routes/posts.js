"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const database_1 = require("../database");
const auth_1 = require("./auth");
const router = express_1.default.Router();
// Multer config for post image uploads
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
        cb(null, 'post-' + (0, uuid_1.v4)() + ext);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
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
// Middleware to verify token
const authenticate = (req, res, next) => {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    jsonwebtoken_1.default.verify(token, auth_1.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        req.userId = decoded.id;
        next();
    });
};
exports.authenticate = authenticate;
// --- Main Feed ---
// This route gets the most recent posts to show on the home screen.
// It also fetches info about who wrote the post, comments, and likes.
router.get('/feed', authenticate, async (req, res) => {
    try {
        const posts = await database_1.db.post.findMany({
            where: {
                user: {
                    is_admin: 0 // [FIX] Exclude admin posts from feed
                }
            },
            take: 50,
            orderBy: { created_at: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        avatar: true
                    }
                },
                comments: {
                    take: 3,
                    orderBy: { created_at: 'desc' },
                    include: {
                        user: {
                            select: {
                                username: true,
                                avatar: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        postLikes: true,
                        comments: true
                    }
                },
                postLikes: {
                    where: { user_id: req.userId },
                    select: { id: true }
                }
            }
        });
        const formattedPosts = posts.map((post) => (Object.assign(Object.assign({}, post), { username: post.user.username, name: post.user.name, avatar: post.user.avatar, like_count: post._count.postLikes, comment_count: post._count.comments, liked: post.postLikes.length > 0 ? post.postLikes[0].id : 0, comments: post.comments.map((c) => (Object.assign(Object.assign({}, c), { username: c.user.username, avatar: c.user.avatar }))) })));
        res.json(formattedPosts);
    }
    catch (err) {
        console.error('Error getting feed:', err);
        res.status(500).json({ error: 'Error getting feed' });
    }
});
// Get user's posts
router.get('/user/:userId', authenticate, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const posts = await database_1.db.post.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
            include: {
                user: {
                    select: {
                        username: true,
                        name: true,
                        avatar: true
                    }
                },
                _count: {
                    select: {
                        postLikes: true,
                        comments: true
                    }
                },
                postLikes: {
                    where: { user_id: req.userId },
                    select: { id: true }
                }
            }
        });
        const formattedPosts = posts.map((post) => (Object.assign(Object.assign({}, post), { username: post.user.username, name: post.user.name, avatar: post.user.avatar, like_count: post._count.postLikes, comment_count: post._count.comments, liked: post.postLikes.length > 0 ? post.postLikes[0].id : 0 })));
        res.json(formattedPosts);
    }
    catch (err) {
        console.error('Error getting user posts:', err);
        res.status(500).json({ error: 'Error getting posts' });
    }
});
// --- Create a New Post ---
// Users can upload an image and add a caption.
router.post('/', authenticate, upload.single('image'), async (req, res) => {
    const { caption, image } = req.body;
    let imagePath = '';
    if (req.file) {
        imagePath = '/uploads/' + req.file.filename;
    }
    else if (image) {
        imagePath = image;
    }
    else {
        return res.status(400).json({ error: 'Image is required' });
    }
    try {
        const post = await database_1.db.post.create({
            data: {
                user_id: req.userId,
                image: imagePath,
                caption: caption || ''
            },
            include: {
                user: {
                    select: {
                        username: true,
                        name: true,
                        avatar: true
                    }
                }
            }
        });
        res.json(Object.assign(Object.assign({}, post), { username: post.user.username, name: post.user.name, avatar: post.user.avatar, like_count: 0, comment_count: 0, liked: 0, comments: [] }));
    }
    catch (err) {
        console.error('Error creating post:', err);
        res.status(500).json({ error: 'Error creating post' });
    }
});
// Delete a post
router.delete('/:postId', authenticate, async (req, res) => {
    try {
        const postId = parseInt(String(req.params.postId));
        const post = await database_1.db.post.findUnique({
            where: { id: postId }
        });
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        if (post.user_id !== req.userId) {
            return res.status(403).json({ error: 'Not authorized to delete this post' });
        }
        // Delete the image file if it's a local file
        if (post.image && post.image.startsWith('/uploads/')) {
            const imagePath = path_1.default.join(__dirname, '..', '..', post.image);
            if (fs_1.default.existsSync(imagePath)) {
                fs_1.default.unlinkSync(imagePath);
            }
        }
        await database_1.db.$transaction([
            database_1.db.like.deleteMany({ where: { post_id: postId } }),
            database_1.db.comment.deleteMany({ where: { post_id: postId } }),
            database_1.db.post.delete({ where: { id: postId } })
        ]);
        res.json({ message: 'Post deleted successfully' });
    }
    catch (err) {
        console.error('Error deleting post:', err);
        res.status(500).json({ error: 'Error deleting post' });
    }
});
// --- Like / Heart a Post ---
router.post('/:postId/like', authenticate, async (req, res) => {
    try {
        const postId = parseInt(String(req.params.postId));
        await database_1.db.like.upsert({
            where: {
                user_id_post_id: {
                    user_id: req.userId,
                    post_id: postId
                }
            },
            update: {},
            create: {
                user_id: req.userId,
                post_id: postId
            }
        });
        const count = await database_1.db.like.count({
            where: { post_id: postId }
        });
        res.json({ liked: true, likes: count });
    }
    catch (err) {
        console.error('Error liking post:', err);
        res.status(500).json({ error: 'Error liking post' });
    }
});
// Unlike a post
router.delete('/:postId/like', authenticate, async (req, res) => {
    try {
        const postId = parseInt(String(req.params.postId));
        await database_1.db.like.deleteMany({
            where: {
                user_id: req.userId,
                post_id: postId
            }
        });
        const count = await database_1.db.like.count({
            where: { post_id: postId }
        });
        res.json({ liked: false, likes: count });
    }
    catch (err) {
        console.error('Error unliking post:', err);
        res.status(500).json({ error: 'Error unliking post' });
    }
});
// Get comments for a post
router.get('/:postId/comments', authenticate, async (req, res) => {
    try {
        const postId = parseInt(String(req.params.postId));
        const comments = await database_1.db.comment.findMany({
            where: { post_id: postId },
            orderBy: { created_at: 'desc' },
            include: {
                user: {
                    select: {
                        username: true,
                        avatar: true
                    }
                }
            }
        });
        const formattedComments = comments.map((c) => (Object.assign(Object.assign({}, c), { username: c.user.username, avatar: c.user.avatar })));
        res.json(formattedComments);
    }
    catch (err) {
        console.error('Error getting comments:', err);
        res.status(500).json({ error: 'Error getting comments' });
    }
});
// --- Add a Comment ---
router.post('/:postId/comments', authenticate, async (req, res) => {
    const { text } = req.body;
    const postId = parseInt(String(req.params.postId));
    if (!text || text.trim() === '') {
        return res.status(400).json({ error: 'Comment text is required' });
    }
    try {
        const comment = await database_1.db.comment.create({
            data: {
                user_id: req.userId,
                post_id: postId,
                text
            },
            include: {
                user: {
                    select: {
                        username: true,
                        avatar: true
                    }
                }
            }
        });
        res.json(Object.assign(Object.assign({}, comment), { username: comment.user.username, avatar: comment.user.avatar }));
    }
    catch (err) {
        console.error('Error adding comment:', err);
        res.status(500).json({ error: 'Error adding comment' });
    }
});
// Delete comment
router.delete('/comments/:commentId', authenticate, async (req, res) => {
    try {
        const commentId = parseInt(String(req.params.commentId));
        const comment = await database_1.db.comment.findUnique({
            where: { id: commentId }
        });
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        if (comment.user_id !== req.userId) {
            return res.status(403).json({ error: 'Not authorized to delete this comment' });
        }
        await database_1.db.comment.delete({
            where: { id: commentId }
        });
        res.json({ message: 'Comment deleted successfully' });
    }
    catch (err) {
        console.error('Error deleting comment:', err);
        res.status(500).json({ error: 'Error deleting comment' });
    }
});
// --- Explore Feed ---
// This route gets random posts to show in the explore grid.
router.get('/explore', authenticate, async (req, res) => {
    try {
        const posts = await database_1.db.post.findMany({
            where: {
                user: {
                    is_admin: 0 // Exclude admin posts
                }
            },
            take: 30,
            orderBy: { created_at: 'desc' }, // For now just newest, could be randomized
            select: {
                id: true,
                image: true,
                _count: {
                    select: {
                        postLikes: true,
                        comments: true
                    }
                }
            }
        });
        const formattedPosts = posts.map((post) => ({
            id: post.id,
            image: post.image,
            like_count: post._count.postLikes,
            comment_count: post._count.comments
        }));
        res.json(formattedPosts);
    }
    catch (err) {
        console.error('Error getting explore feed:', err);
        res.status(500).json({ error: 'Error getting explore feed' });
    }
});
exports.default = router;
//# sourceMappingURL=posts.js.map