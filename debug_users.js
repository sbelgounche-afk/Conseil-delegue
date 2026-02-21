const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('instagram.db');

db.all('SELECT * FROM users', [], (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('User count:', rows.length);
        rows.forEach(row => {
            console.log(`ID: ${row.id}, Username: ${row.username}, Email: ${row.email}, Admin: ${row.is_admin}`);
        });
    }
    db.close();
});
