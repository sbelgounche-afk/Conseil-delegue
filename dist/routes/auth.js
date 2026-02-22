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
exports.JWT_SECRET = void 0;
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../database");
const router = express_1.default.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'instagram-clone-secret-key-2024';
exports.JWT_SECRET = JWT_SECRET;
// --- User Registration ---
// This route creates a new user account.
router.post('/register', async (req, res) => {
    const { username, email, password, name, phone, age, grade, school } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email and password are required' });
    }
    try {
        // Check if user already exists
        const existingUser = await database_1.db.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email }
                ]
            }
        });
        if (existingUser) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Create user
        const user = await database_1.db.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                name: name || username,
                phone: phone || '',
                age: age ? parseInt(age.toString()) : null,
                grade: grade || '',
                school: school || '',
                avatar: '',
                bio: '',
                is_admin: 0
            }
        });
        // Generate token
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        const { password: _ } = user, userWithoutPassword = __rest(user, ["password"]);
        res.json({
            message: 'User created successfully',
            token,
            user: userWithoutPassword
        });
    }
    catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Error creating user' });
    }
});
// --- User Login ---
// This route checks credentials and gives the user a "token" (JWT) so they can stay logged in.
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    try {
        const user = await database_1.db.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email: username }
                ]
            }
        });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        const { password: _ } = user, userWithoutPassword = __rest(user, ["password"]);
        res.json({
            message: 'Login successful',
            token,
            user: userWithoutPassword
        });
    }
    catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});
// --- Token Verification ---
// This route checks if a user's token is still valid.
// Useful for keeping users logged in when they refresh the page.
router.get('/verify', async (req, res) => {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = await database_1.db.user.findUnique({
            where: { id: decoded.id },
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
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        res.json({ user });
    }
    catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map