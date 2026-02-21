const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('instagram.db');

db.serialize(() => {
    console.log('Adding missing columns to users table...');

    const columns = [
        'ALTER TABLE users ADD COLUMN phone TEXT',
        'ALTER TABLE users ADD COLUMN age INTEGER',
        'ALTER TABLE users ADD COLUMN grade TEXT',
        'ALTER TABLE users ADD COLUMN school TEXT',
        'ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0'
    ];

    columns.forEach(query => {
        db.run(query, (err) => {
            if (err) {
                if (err.message.includes('duplicate column name')) {
                    console.log(`Column already exists: ${query.split(' ').pop()}`);
                } else {
                    console.error(`Error running ${query}:`, err.message);
                }
            } else {
                console.log(`Successfully run: ${query}`);
            }
        });
    });
});

db.close();
