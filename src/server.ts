import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

import { initDatabase } from './database';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import postRoutes from './routes/posts';
import storiesRoutes from './routes/stories';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
// Since server.ts is in src/, uploads is at ../uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Serve static frontend files
// index.html and assets are at ../
app.use(express.static(path.join(__dirname, '..')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize database and start server
async function startServer() {
    await initDatabase();

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/stories', storiesRoutes);

// Serve index.html for root
app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

startServer();

