"use strict";
// This file sets up our connection to the database using Prisma.
// It also handles the first-time setup like creating an admin account.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.initDatabase = initDatabase;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// Create a single instance of PrismaClient to be used throughout the app.
const prisma = new client_1.PrismaClient();
exports.db = prisma;
/**
 * Initializes the database.
 * This function runs when the server starts.
 */
async function initDatabase() {
    try {
        // We set up a default admin account so you can always log in.
        // The default credentials are: admin / admin123
        const adminPassword = 'admin123';
        // Check if the admin user already exists in the database.
        const admin = await prisma.user.findUnique({
            where: { username: 'admin' }
        });
        // If no admin is found, we create one.
        if (!admin) {
            const hashedPassword = await bcryptjs_1.default.hash(adminPassword, 10);
            await prisma.user.create({
                data: {
                    username: 'admin',
                    email: 'admin@school.com',
                    password: hashedPassword,
                    name: 'Administrator',
                    is_admin: 1 // 1 means this user is an admin
                }
            });
            console.log('Admin account created: username=admin, password=admin123');
        }
        console.log('Database connected and verified via Prisma');
    }
    catch (error) {
        // If something goes wrong during startup, we log it here.
        console.error('Error initializing database with Prisma:', error);
    }
}
//# sourceMappingURL=database.js.map