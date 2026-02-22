"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_1 = require("./database");
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const posts_1 = __importDefault(require("./routes/posts"));
const stories_1 = __importDefault(require("./routes/stories"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Serve uploaded files
// Since server.ts is in src/, uploads is at ../uploads
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '..', 'uploads')));
// Serve static frontend files
// index.html and assets are at ../
app.use(express_1.default.static(path_1.default.join(__dirname, '..')));
// Create uploads directory if it doesn't exist
const uploadsDir = path_1.default.join(__dirname, '..', 'uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Initialize database and start server
async function startServer() {
    await (0, database_1.initDatabase)();
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/posts', posts_1.default);
app.use('/api/stories', stories_1.default);
// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '..', 'index.html'));
});
startServer();
//# sourceMappingURL=server.js.map