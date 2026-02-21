const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');

const JWT_SECRET = 'instagram-clone-secret-key-2024';

// Multer config for avatar uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadsDir = path.join(__dirname, '..', 'uploads');
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
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Middleware to verify token
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        req.userId = decoded.id;
        next();
    });
};

// Middleware to verify admin
const authenticateAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        
        db.get('SELECT is_admin FROM users WHERE id = ?', [decoded.id], (err, user) => {
            if (err || !user || !user.is_admin) {
                return res.status(403).json({ error: 'Admin access required' });
            }
            req.userId = decoded.id;
            next();
        });
    });
};

// Get user profile
router.get('/profile', authenticate, (req, res) => {
    db.get('SELECT id, username, email, name, phone, age, grade, school, avatar, bio, is_admin FROM users WHERE id = ?', [req.userId], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get post count
        db.get('SELECT COUNT(*) as count FROM posts WHERE user_id = ?', [req.userId], (err, result) => {
            // Get follower count
            db.get('SELECT COUNT(*) as count FROM follows WHERE following_id = ?', [req.userId], (err, followersResult) => {
                // Get following count
                db.get('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?', [req.userId], (err, followingResult) => {
                    res.json({
                        ...user,
                        posts: result?.count || 0,
                        followers: followersResult?.count || 0,
                        following: followingResult?.count || 0
                    });
                });
            });
        });
    });
});

// Get user by username
router.get('/username/:username', (req, res) => {
    db.get('SELECT id, username, name, avatar, bio FROM users WHERE username = ?', [req.params.username], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get post count
        db.get('SELECT COUNT(*) as count FROM posts WHERE user_id = ?', [user.id], (err, result) => {
            // Get follower count
            db.get('SELECT COUNT(*) as count FROM follows WHERE following_id = ?', [user.id], (err, followersResult) => {
                // Get following count
                db.get('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?', [user.id], (err, followingResult) => {
                    // Check if current user follows this user
                    if (req.headers.authorization) {
                        const token = req.headers.authorization.split(' ')[1];
                        jwt.verify(token, JWT_SECRET, (err, decoded) => {
                            if (!err) {
                                db.get('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?', [decoded.id, user.id], (err, follow) => {
                                    res.json({
                                        ...user,
                                        posts: result?.count || 0,
                                        followers: followersResult?.count || 0,
                                        following: followingResult?.count || 0,
                                        isFollowing: !!follow
                                    });
                                });
                            } else {
                                res.json({
                                    ...user,
                                    posts: result?.count || 0,
                                    followers: followersResult?.count || 0,
                                    following: followingResult?.count || 0,
                                    isFollowing: false
                                });
                            }
                        });
                    } else {
                        res.json({
                            ...user,
                            posts: result?.count || 0,
                            followers: followersResult?.count || 0,
                            following: followingResult?.count || 0,
                            isFollowing: false
                        });
                    }
                });
            });
        });
    });
});

// Update user profile
router.put('/profile', authenticate, upload.single('avatar'), (req, res) => {
    const { name, bio, phone, age, grade, school, avatar } = req.body;
    
    let updateQuery = 'UPDATE users SET ';
    let params = [];
    
    if (name !== undefined) {
        updateQuery += 'name = ?';
        params.push(name);
    }
    
    if (bio !== undefined) {
        if (params.length > 0) updateQuery += ', ';
        updateQuery += 'bio = ?';
        params.push(bio);
    }
    
    if (phone !== undefined) {
        if (params.length > 0) updateQuery += ', ';
        updateQuery += 'phone = ?';
        params.push(phone);
    }
    
    if (age !== undefined) {
        if (params.length > 0) updateQuery += ', ';
        updateQuery += 'age = ?';
        params.push(age);
    }
    
    if (grade !== undefined) {
        if (params.length > 0) updateQuery += ', ';
        updateQuery += 'grade = ?';
        params.push(grade);
    }
    
    if (school !== undefined) {
        if (params.length > 0) updateQuery += ', ';
        updateQuery += 'school = ?';
        params.push(school);
    }
    
    if (req.file) {
        if (params.length > 0) updateQuery += ', ';
        updateQuery += 'avatar = ?';
        params.push('/uploads/' + req.file.filename);
    } else if (avatar !== undefined) {
        if (params.length > 0) updateQuery += ', ';
        updateQuery += 'avatar = ?';
        params.push(avatar);
    }
    
    if (params.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }
    
    updateQuery += ' WHERE id = ?';
    params.push(req.userId);
    
    db.run(updateQuery, params, function(err) {
        if (err) {
            return res.status(500).json({ error: 'Error updating profile' });
        }
        
        db.get('SELECT id, username, email, name, phone, age, grade, school, avatar, bio, is_admin FROM users WHERE id = ?', [req.userId], (err, user) => {
            res.json(user);
        });
    });
});

// Follow a user
router.post('/follow/:userId', authenticate, (req, res) => {
    const targetUserId = parseInt(req.params.userId);
    
    if (targetUserId === req.userId) {
        return res.status(400).json({ error: 'Cannot follow yourself' });
    }
    
    db.get('SELECT id FROM users WHERE id = ?', [targetUserId], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        db.run('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)', 
            [req.userId, targetUserId], 
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Error following user' });
                }
                res.json({ message: 'Followed successfully' });
            }
        );
    });
});

// Unfollow a user
router.delete('/follow/:userId', authenticate, (req, res) => {
    const targetUserId = parseInt(req.params.userId);
    
    db.run('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', 
        [req.userId, targetUserId], 
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Error unfollowing user' });
            }
            res.json({ message: 'Unfollowed successfully' });
        }
    );
});

// Get suggested users
router.get('/suggestions', authenticate, (req, res) => {
    db.all(`
        SELECT u.id, u.username, u.name, u.avatar, u.bio
        FROM users u
        WHERE u.id != ?
        AND u.id NOT IN (SELECT following_id FROM follows WHERE follower_id = ?)
        LIMIT 5
    `, [req.userId, req.userId], (err, users) => {
        if (err) {
            return res.status(500).json({ error: 'Error getting suggestions' });
        }
        res.json(users);
    });
});

// Search users
router.get('/search', (req, res) => {
    const { q } = req.query;
    
    if (!q) {
        return res.json([]);
    }
    
    db.all(`
        SELECT id, username, name, avatar
        FROM users
        WHERE username LIKE ? OR name LIKE ?
        LIMIT 10
    `, ['%' + q + '%', '%' + q + '%'], (err, users) => {
        if (err) {
            return res.status(500).json({ error: 'Error searching users' });
        }
        res.json(users);
    });
});

// ============================================
// ADMIN ROUTES
// ============================================

// Get all users (admin only)
router.get('/admin/all-users', authenticateAdmin, (req, res) => {
    db.all(`
        SELECT id, username, email, name, phone, age, grade, school, avatar, bio, is_admin, created_at
        FROM users
        ORDER BY created_at DESC
    `, [], (err, users) => {
        if (err) {
            return res.status(500).json({ error: 'Error getting users' });
        }
        res.json(users);
    });
});

// Get statistics (admin only)
router.get('/admin/stats', authenticateAdmin, (req, res) => {
    db.get('SELECT COUNT(*) as totalUsers FROM users', [], (err, userResult) => {
        db.get('SELECT COUNT(*) as totalPosts FROM posts', [], (err, postResult) => {
            db.get('SELECT COUNT(*) as totalLikes FROM likes', [], (err, likeResult) => {
                db.get('SELECT COUNT(*) as totalComments FROM comments', [], (err, commentResult) => {
                    // Users by grade
                    db.all(`
                        SELECT grade, COUNT(*) as count 
                        FROM users 
                        WHERE grade != '' 
                        GROUP BY grade
                    `, [], (err, gradeStats) => {
                        // Users by age
                        db.all(`
                            SELECT age, COUNT(*) as count 
                            FROM users 
                            WHERE age IS NOT NULL 
                            GROUP BY age
                            ORDER BY age
                        `, [], (err, ageStats) => {
                            res.json({
                                totalUsers: userResult?.totalUsers || 0,
                                totalPosts: postResult?.totalPosts || 0,
                                totalLikes: likeResult?.totalLikes || 0,
                                totalComments: commentResult?.totalComments || 0,
                                usersByGrade: gradeStats || [],
                                usersByAge: ageStats || []
                            });
                        });
                    });
                });
            });
        });
    });
});

// Delete user (admin only)
router.delete('/admin/user/:userId', authenticateAdmin, (req, res) => {
    const targetUserId = parseInt(req.params.userId);
    
    // Don't allow deleting admin
    db.get('SELECT is_admin FROM users WHERE id = ?', [targetUserId], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (user.is_admin) {
            return res.status(400).json({ error: 'Cannot delete admin user' });
        }
        
        // Delete user's posts, likes, comments, follows
        db.run('DELETE FROM likes WHERE user_id = ?', [targetUserId], (err) => {
            db.run('DELETE FROM comments WHERE user_id = ?', [targetUserId], (err) => {
                db.run('DELETE FROM follows WHERE follower_id = ? OR following_id = ?', [targetUserId, targetUserId], (err) => {
                    db.run('DELETE FROM posts WHERE user_id = ?', [targetUserId], (err) => {
                        db.run('DELETE FROM users WHERE id = ?', [targetUserId], (err) => {
                            res.json({ message: 'User deleted successfully' });
                        });
                    });
                });
            });
        });
    });
});

module.exports = router;
