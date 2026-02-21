"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_SECRET = void 0;
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../database");
const router = express_1.default.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'instagram-clone-secret-key-2024';
exports.JWT_SECRET = JWT_SECRET;
// Register
router.post('/register', (req, res) => {
    const { username, email, password, name, phone, age, grade, school } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email and password are required' });
    }
    // Check if user already exists
    database_1.db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email], (err, existingUser) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (existingUser) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        // Hash password
        bcryptjs_1.default.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                return res.status(500).json({ error: 'Error hashing password' });
            }
            // Insert user with new fields
            database_1.db.run('INSERT INTO users (username, email, password, name, phone, age, grade, school) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [username, email, hashedPassword, name || username, phone || '', age || null, grade || '', school || ''], function (err) {
                if (err) {
                    return res.status(500).json({ error: 'Error creating user' });
                }
                // Generate token
                const token = jsonwebtoken_1.default.sign({ id: this.lastID, username }, JWT_SECRET, { expiresIn: '7d' });
                res.json({
                    message: 'User created successfully',
                    token,
                    user: {
                        id: this.lastID,
                        username,
                        email,
                        name: name || username,
                        phone: phone || '',
                        age: age || null,
                        grade: grade || '',
                        school: school || '',
                        avatar: '',
                        bio: '',
                        is_admin: 0
                    }
                });
            });
        });
    });
});
// Login
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    database_1.db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        bcryptjs_1.default.compare(password, user.password, (err, isMatch) => {
            if (err) {
                return res.status(500).json({ error: 'Error checking password' });
            }
            if (!isMatch) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
            res.json({
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    name: user.name,
                    phone: user.phone || '',
                    age: user.age || null,
                    grade: user.grade || '',
                    school: user.school || '',
                    avatar: user.avatar,
                    bio: user.bio || '',
                    is_admin: user.is_admin || 0
                }
            });
        });
    });
});
// Verify token
router.get('/verify', (req, res) => {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        const payload = decoded;
        database_1.db.get('SELECT id, username, email, name, phone, age, grade, school, avatar, bio, is_admin FROM users WHERE id = ?', [payload.id], (err, user) => {
            if (err || !user) {
                return res.status(401).json({ error: 'User not found' });
            }
            res.json({ user });
        });
    });
});
exports.default = router;
//# sourceMappingURL=auth.js.map