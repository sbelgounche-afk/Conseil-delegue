"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const database_1 = require("../database");
const posts_1 = require("./posts");
const router = express_1.default.Router();
// Multer config for story uploads (similar to posts)
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
        cb(null, 'story-' + (0, uuid_1.v4)() + ext);
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
// 1. API: Create a new Story
router.post('/', posts_1.authenticate, upload.single('image'), async (req, res) => {
    try {
        const { image } = req.body;
        let imagePath = '';
        if (req.file) {
            imagePath = '/uploads/' + req.file.filename;
        }
        else if (image) {
            imagePath = image;
        }
        else {
            return res.status(400).json({ error: 'Story image is required' });
        }
        const story = await database_1.db.story.create({
            data: {
                user_id: req.userId,
                image: imagePath
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
        res.json(story);
    }
    catch (error) {
        console.error('Create story error:', error);
        res.status(500).json({ error: 'Failed to create story' });
    }
});
// 2. API: Get active stories (last 24h)
// For now, we show stories from all non-admin users, or if implemented, only from following.
router.get('/', posts_1.authenticate, async (req, res) => {
    try {
        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);
        const stories = await database_1.db.story.findMany({
            where: {
                created_at: { gte: oneDayAgo },
                user: {
                    is_admin: 0 // Hide admin stories too
                }
            },
            orderBy: { created_at: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true
                    }
                }
            }
        });
        // Group stories by user for easier frontend rendering
        const groupedStories = {};
        stories.forEach(story => {
            if (!groupedStories[story.user_id]) {
                groupedStories[story.user_id] = {
                    user: story.user,
                    items: []
                };
            }
            groupedStories[story.user_id].items.push(story);
        });
        res.json(Object.values(groupedStories));
    }
    catch (error) {
        console.error('Get stories error:', error);
        res.status(500).json({ error: 'Failed to fetch stories' });
    }
});
exports.default = router;
//# sourceMappingURL=stories.js.map