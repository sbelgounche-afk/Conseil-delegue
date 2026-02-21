const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'instagram.db');
const db = new sqlite3.Database(dbPath);

function initDatabase() {
    // Create users table with new fields
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT,
            phone TEXT,
            age INTEGER,
            grade TEXT,
            school TEXT,
            bio TEXT DEFAULT '',
            avatar TEXT DEFAULT '',
            is_admin INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create posts table
    db.run(`
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            image TEXT NOT NULL,
            caption TEXT DEFAULT '',
            likes INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Create likes table
    db.run(`
        CREATE TABLE IF NOT EXISTS likes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            post_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, post_id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (post_id) REFERENCES posts(id)
        )
    `);

    // Create comments table
    db.run(`
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            post_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (post_id) REFERENCES posts(id)
        )
    `);

    // Create follows table
    db.run(`
        CREATE TABLE IF NOT EXISTS follows (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            follower_id INTEGER NOT NULL,
            following_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(follower_id, following_id),
            FOREIGN KEY (follower_id) REFERENCES users(id),
            FOREIGN KEY (following_id) REFERENCES users(id)
        )
    `);

    // Create admin account if not exists
    const bcrypt = require('bcryptjs');
    const adminPassword = 'admin123';
    
    db.get('SELECT id FROM users WHERE username = ?', ['admin'], (err, admin) => {
        if (!admin) {
            bcrypt.hash(adminPassword, 10, (err, hashedPassword) => {
                if (!err) {
                    db.run(`
                        INSERT INTO users (username, email, password, name, is_admin)
                        VALUES (?, ?, ?, ?, ?)
                    `, ['admin', 'admin@school.com', hashedPassword, 'Administrator', 1], (err) => {
                        if (!err) {
                            console.log('Admin account created: username=admin, password=admin123');
                        }
                    });
                }
            });
        }
    });

    console.log('Database initialized successfully');
}

module.exports = { db, initDatabase };
