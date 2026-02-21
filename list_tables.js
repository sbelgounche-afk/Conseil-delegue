const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'instagram.db');
console.log('Connecting to:', dbPath);
const db = new sqlite3.Database(dbPath);

db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
    if (err) {
        console.error('Error fetching tables:', err);
    } else {
        console.log('Tables found:', rows.map(r => r.name));
    }
    db.close();
});
