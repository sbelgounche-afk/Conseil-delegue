import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import { JWT_SECRET } from './auth';
import { Post, Comment } from '../types/models';
import sqlite3 from 'sqlite3';

const router = express.Router();

// Extend Request type to include userId
interface AuthRequest extends Request {
    userId?: number;
}

// Multer config for post image uploads
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
        cb(null, 'post-' + uuidv4() + ext);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mime = allowedTypes.test(file.mimetype);
        if (ext && mime) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Middleware to verify token
const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        req.userId = decoded.id;
        next();
    });
};

// Get all posts (feed)
router.get('/feed', authenticate, (req: AuthRequest, res: Response) => {
    db.all(`
        SELECT p.*, u.username, u.name, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        (SELECT id FROM likes WHERE user_id = ? AND post_id = p.id) as liked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
        LIMIT 50
    `, [req.userId], (err, posts: Post[]) => {
        if (err) {
            console.error('Error getting feed:', err);
            return res.status(500).json({ error: 'Error getting feed' });
        }

        // Get comments for each post
        const getComments = (post: Post) => {
            return new Promise<Comment[]>((resolve) => {
                db.all(`
                    SELECT c.*, u.username, u.avatar
                    FROM comments c
                    JOIN users u ON c.user_id = u.id
                    WHERE c.post_id = ?
                    ORDER BY c.created_at DESC
                    LIMIT 3
                `, [post.id], (err, comments: Comment[]) => {
                    resolve(comments || []);
                });
            });
        };

        Promise.all(posts.map(post => getComments(post).then(comments => ({ ...post, comments }))))
            .then(postsWithComments => {
                res.json(postsWithComments);
            });
    });
});

// Get user's posts
router.get('/user/:userId', authenticate, (req: AuthRequest, res: Response) => {
    db.all(`
        SELECT p.*, u.username, u.name, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        (SELECT id FROM likes WHERE user_id = ? AND post_id = p.id) as liked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC
    `, [req.userId, req.params.userId], (err, posts: Post[]) => {
        if (err) {
            return res.status(500).json({ error: 'Error getting posts' });
        }
        res.json(posts);
    });
});

// Create a post
router.post('/', authenticate, upload.single('image'), (req: AuthRequest, res: Response) => {
    const { caption, image } = req.body;

    let imagePath = '';

    if (req.file) {
        imagePath = '/uploads/' + req.file.filename;
    } else if (image) {
        imagePath = image;
    } else {
        return res.status(400).json({ error: 'Image is required' });
    }

    db.run(
        'INSERT INTO posts (user_id, image, caption) VALUES (?, ?, ?)',
        [req.userId, imagePath, caption || ''],
        function (this: any, err: any) {
            if (err) {
                console.error('Error creating post:', err);
                return res.status(500).json({ error: 'Error creating post' });
            }

            db.get(`
                SELECT p.*, u.username, u.name, u.avatar,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
                0 as liked
                FROM posts p
                JOIN users u ON p.user_id = u.id
                WHERE p.id = ?
            `, [this.lastID], (err, post: Post) => {
                res.json({ ...post, comments: [] });
            });
        }
    );
});

// Delete a post
router.delete('/:postId', authenticate, (req: AuthRequest, res: Response) => {
    db.get('SELECT * FROM posts WHERE id = ?', [req.params.postId], (err, post: Post) => {
        if (err || !post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        if (post.user_id !== req.userId) {
            return res.status(403).json({ error: 'Not authorized to delete this post' });
        }

        // Delete the image file if it's a local file
        if (post.image && post.image.startsWith('/uploads/')) {
            const imagePath = path.join(__dirname, '..', '..', post.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        db.run('DELETE FROM likes WHERE post_id = ?', [req.params.postId], (err) => {
            db.run('DELETE FROM comments WHERE post_id = ?', [req.params.postId], (err) => {
                db.run('DELETE FROM posts WHERE id = ?', [req.params.postId], (err) => {
                    res.json({ message: 'Post deleted successfully' });
                });
            });
        });
    });
});

// Like a post
router.post('/:postId/like', authenticate, (req: AuthRequest, res: Response) => {
    db.get('SELECT id FROM posts WHERE id = ?', [req.params.postId], (err, post: Post) => {
        if (err || !post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        db.run('INSERT INTO likes (user_id, post_id) VALUES (?, ?)',
            [req.userId, req.params.postId],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: 'Error liking post' });
                }

                // Update like count
                db.get('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [req.params.postId], (err, result: any) => {
                    res.json({ liked: true, likes: result.count });
                });
            }
        );
    });
});

// Unlike a post
router.delete('/:postId/like', authenticate, (req: AuthRequest, res: Response) => {
    db.run('DELETE FROM likes WHERE user_id = ? AND post_id = ?',
        [req.userId, req.params.postId],
        function (err) {
            if (err) {
                return res.status(500).json({ error: 'Error unliking post' });
            }

            // Update like count
            db.get('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [req.params.postId], (err, result: any) => {
                res.json({ liked: false, likes: result.count });
            });
        }
    );
});

// Get comments for a post
router.get('/:postId/comments', authenticate, (req: AuthRequest, res: Response) => {
    db.all(`
        SELECT c.*, u.username, u.avatar
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ?
        ORDER BY c.created_at DESC
    `, [req.params.postId], (err, comments: Comment[]) => {
        if (err) {
            return res.status(500).json({ error: 'Error getting comments' });
        }
        res.json(comments || []);
    });
});

// Add comment to a post
router.post('/:postId/comments', authenticate, (req: AuthRequest, res: Response) => {
    const { text } = req.body;

    if (!text || text.trim() === '') {
        return res.status(400).json({ error: 'Comment text is required' });
    }

    db.get('SELECT id FROM posts WHERE id = ?', [req.params.postId], (err, post: Post) => {
        if (err || !post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        db.run('INSERT INTO comments (user_id, post_id, text) VALUES (?, ?, ?)',
            [req.userId, req.params.postId, text],
            function (this: any, err: any) {
                if (err) {
                    return res.status(500).json({ error: 'Error adding comment' });
                }

                db.get(`
                    SELECT c.*, u.username, u.avatar
                    FROM comments c
                    JOIN users u ON c.user_id = u.id
                    WHERE c.id = ?
                `, [this.lastID], (err, comment: Comment) => {
                    res.json(comment);
                });
            }
        );
    });
});

// Delete comment
router.delete('/comments/:commentId', authenticate, (req: AuthRequest, res: Response) => {
    db.get('SELECT * FROM comments WHERE id = ?', [req.params.commentId], (err, comment: Comment) => {
        if (err || !comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        if (comment.user_id !== req.userId) {
            return res.status(403).json({ error: 'Not authorized to delete this comment' });
        }

        db.run('DELETE FROM comments WHERE id = ?', [req.params.commentId], (err) => {
            res.json({ message: 'Comment deleted successfully' });
        });
    });
});

export default router;
export { authenticate, AuthRequest };
