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
// Get all posts (feed)
router.get('/feed', authenticate, (req, res) => {
    database_1.db.all(`
        SELECT p.*, u.username, u.name, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        (SELECT id FROM likes WHERE user_id = ? AND post_id = p.id) as liked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
        LIMIT 50
    `, [req.userId], (err, posts) => {
        if (err) {
            console.error('Error getting feed:', err);
            return res.status(500).json({ error: 'Error getting feed' });
        }
        // Get comments for each post
        const getComments = (post) => {
            return new Promise((resolve) => {
                database_1.db.all(`
                    SELECT c.*, u.username, u.avatar
                    FROM comments c
                    JOIN users u ON c.user_id = u.id
                    WHERE c.post_id = ?
                    ORDER BY c.created_at DESC
                    LIMIT 3
                `, [post.id], (err, comments) => {
                    resolve(comments || []);
                });
            });
        };
        Promise.all(posts.map(post => getComments(post).then(comments => (Object.assign(Object.assign({}, post), { comments })))))
            .then(postsWithComments => {
            res.json(postsWithComments);
        });
    });
});
// Get user's posts
router.get('/user/:userId', authenticate, (req, res) => {
    database_1.db.all(`
        SELECT p.*, u.username, u.name, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        (SELECT id FROM likes WHERE user_id = ? AND post_id = p.id) as liked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC
    `, [req.userId, req.params.userId], (err, posts) => {
        if (err) {
            return res.status(500).json({ error: 'Error getting posts' });
        }
        res.json(posts);
    });
});
// Create a post
router.post('/', authenticate, upload.single('image'), (req, res) => {
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
    database_1.db.run('INSERT INTO posts (user_id, image, caption) VALUES (?, ?, ?)', [req.userId, imagePath, caption || ''], function (err) {
        if (err) {
            console.error('Error creating post:', err);
            return res.status(500).json({ error: 'Error creating post' });
        }
        database_1.db.get(`
                SELECT p.*, u.username, u.name, u.avatar,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
                0 as liked
                FROM posts p
                JOIN users u ON p.user_id = u.id
                WHERE p.id = ?
            `, [this.lastID], (err, post) => {
            res.json(Object.assign(Object.assign({}, post), { comments: [] }));
        });
    });
});
// Delete a post
router.delete('/:postId', authenticate, (req, res) => {
    database_1.db.get('SELECT * FROM posts WHERE id = ?', [req.params.postId], (err, post) => {
        if (err || !post) {
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
        database_1.db.run('DELETE FROM likes WHERE post_id = ?', [req.params.postId], (err) => {
            database_1.db.run('DELETE FROM comments WHERE post_id = ?', [req.params.postId], (err) => {
                database_1.db.run('DELETE FROM posts WHERE id = ?', [req.params.postId], (err) => {
                    res.json({ message: 'Post deleted successfully' });
                });
            });
        });
    });
});
// Like a post
router.post('/:postId/like', authenticate, (req, res) => {
    database_1.db.get('SELECT id FROM posts WHERE id = ?', [req.params.postId], (err, post) => {
        if (err || !post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        database_1.db.run('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [req.userId, req.params.postId], function (err) {
            if (err) {
                return res.status(500).json({ error: 'Error liking post' });
            }
            // Update like count
            database_1.db.get('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [req.params.postId], (err, result) => {
                res.json({ liked: true, likes: result.count });
            });
        });
    });
});
// Unlike a post
router.delete('/:postId/like', authenticate, (req, res) => {
    database_1.db.run('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [req.userId, req.params.postId], function (err) {
        if (err) {
            return res.status(500).json({ error: 'Error unliking post' });
        }
        // Update like count
        database_1.db.get('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [req.params.postId], (err, result) => {
            res.json({ liked: false, likes: result.count });
        });
    });
});
// Get comments for a post
router.get('/:postId/comments', authenticate, (req, res) => {
    database_1.db.all(`
        SELECT c.*, u.username, u.avatar
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ?
        ORDER BY c.created_at DESC
    `, [req.params.postId], (err, comments) => {
        if (err) {
            return res.status(500).json({ error: 'Error getting comments' });
        }
        res.json(comments || []);
    });
});
// Add comment to a post
router.post('/:postId/comments', authenticate, (req, res) => {
    const { text } = req.body;
    if (!text || text.trim() === '') {
        return res.status(400).json({ error: 'Comment text is required' });
    }
    database_1.db.get('SELECT id FROM posts WHERE id = ?', [req.params.postId], (err, post) => {
        if (err || !post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        database_1.db.run('INSERT INTO comments (user_id, post_id, text) VALUES (?, ?, ?)', [req.userId, req.params.postId, text], function (err) {
            if (err) {
                return res.status(500).json({ error: 'Error adding comment' });
            }
            database_1.db.get(`
                    SELECT c.*, u.username, u.avatar
                    FROM comments c
                    JOIN users u ON c.user_id = u.id
                    WHERE c.id = ?
                `, [this.lastID], (err, comment) => {
                res.json(comment);
            });
        });
    });
});
// Delete comment
router.delete('/comments/:commentId', authenticate, (req, res) => {
    database_1.db.get('SELECT * FROM comments WHERE id = ?', [req.params.commentId], (err, comment) => {
        if (err || !comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        if (comment.user_id !== req.userId) {
            return res.status(403).json({ error: 'Not authorized to delete this comment' });
        }
        database_1.db.run('DELETE FROM comments WHERE id = ?', [req.params.commentId], (err) => {
            res.json({ message: 'Comment deleted successfully' });
        });
    });
});
exports.default = router;
//# sourceMappingURL=posts.js.map