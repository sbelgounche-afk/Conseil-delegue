const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'instagram.db');
const db = new sqlite3.Database(dbPath);

console.log('--- USERS ---');
db.all('SELECT id, username, email, is_admin FROM users', [], (err, rows) => {
    if (err) console.error(err);
    console.log(rows);

    console.log('\n--- POSTS ---');
    db.all('SELECT id, user_id, image, caption FROM posts', [], (err, rows) => {
        if (err) console.error(err);
        console.log(rows);
        db.close();
    });
});
