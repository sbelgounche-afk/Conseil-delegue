import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../database';
import { ensureUserInDefaultGroups } from './groups';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'instagram-clone-secret-key-2024';

interface JwtPayload {
    id: number;
    username: string;
}

// --- User Registration ---
// This route creates a new user account.
router.post('/register', async (req: Request, res: Response) => {
    const { username, email, password, name, phone, age, grade, school } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email and password are required' });
    }

    try {
        // Check if user already exists
        const existingUser = await db.user.findFirst({
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
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await db.user.create({
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
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

        // Ensure user is in default groups
        await ensureUserInDefaultGroups(user.id);

        const { password: _, ...userWithoutPassword } = user;

        res.json({
            message: 'User created successfully',
            token,
            user: userWithoutPassword
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Error creating user' });
    }
});

// --- User Login ---
// This route checks credentials and gives the user a "token" (JWT) so they can stay logged in.
router.post('/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const user = await db.user.findFirst({
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

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

        // Ensure user is in default groups
        await ensureUserInDefaultGroups(user.id);

        const { password: _, ...userWithoutPassword } = user;

        res.json({
            message: 'Login successful',
            token,
            user: userWithoutPassword
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// --- Token Verification ---
// This route checks if a user's token is still valid.
// Useful for keeping users logged in when they refresh the page.
router.get('/verify', async (req: Request, res: Response) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

        const user = await db.user.findUnique({
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
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

export default router;
export { JWT_SECRET };
