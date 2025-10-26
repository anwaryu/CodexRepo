const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'chores.db');
const db = new sqlite3.Database(dbPath);

const initializeDatabase = () => {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Families table
    db.run(`
      CREATE TABLE IF NOT EXISTS families (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Family members table
    db.run(`
      CREATE TABLE IF NOT EXISTS family_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        family_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (family_id) REFERENCES families(id)
      )
    `);

    // Default chores table
    db.run(`
      CREATE TABLE IF NOT EXISTS default_chores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        estimated_minutes INTEGER NOT NULL
      )
    `);

    // Chores table (user-specific chores)
    db.run(`
      CREATE TABLE IF NOT EXISTS chores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        estimated_minutes INTEGER NOT NULL,
        family_id INTEGER NOT NULL,
        family_member_id INTEGER,
        schedule TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (family_id) REFERENCES families(id),
        FOREIGN KEY (family_member_id) REFERENCES family_members(id)
      )
    `);

    // Insert default chores if they don't exist
    db.get('SELECT COUNT(*) as count FROM default_chores', (err, row) => {
      if (err) {
        console.error('Error checking default chores:', err);
        return;
      }
      
      if (row.count === 0) {
        const defaultChores = [
          { name: 'Vacuum living room', minutes: 20 },
          { name: 'Clean bathroom', minutes: 30 },
          { name: 'Wash dishes', minutes: 15 },
          { name: 'Take out trash', minutes: 5 },
          { name: 'Mow lawn', minutes: 45 },
          { name: 'Dust furniture', minutes: 15 },
          { name: 'Clean kitchen', minutes: 25 },
          { name: 'Do laundry', minutes: 60 },
          { name: 'Walk the dog', minutes: 20 },
          { name: 'Water plants', minutes: 10 }
        ];

        const stmt = db.prepare('INSERT INTO default_chores (name, estimated_minutes) VALUES (?, ?)');
        defaultChores.forEach(chore => {
          stmt.run(chore.name, chore.minutes);
        });
        stmt.finalize();
        console.log('Default chores inserted');
      }
    });
  });
};

module.exports = { db, initializeDatabase };
