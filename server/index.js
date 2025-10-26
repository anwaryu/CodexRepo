const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const path = require('path');
const { db, initializeDatabase } = require('./database');
const { authenticateToken, generateToken } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Initialize database
initializeDatabase();

// Helper function to get family ID for a user
const getFamilyIdForUser = (userId, callback) => {
  db.get('SELECT id FROM families WHERE user_id = ?', [userId], (err, row) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, row ? row.id : null);
    }
  });
};

// Auth Routes
app.post('/api/register', async (req, res) => {
  const { username, password, email, familyName } = req.body;

  if (!username || !password || !email || !familyName) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
      [username, hashedPassword, email],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: 'Error creating user' });
        }

        const userId = this.lastID;

        // Create a family for the user
        db.run(
          'INSERT INTO families (name, user_id) VALUES (?, ?)',
          [familyName, userId],
          function (err) {
            if (err) {
              return res.status(500).json({ error: 'Error creating family' });
            }

            const token = generateToken({ id: userId, username });
            res.status(201).json({
              message: 'User registered successfully',
              token,
              user: { id: userId, username, email }
            });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({ id: user.id, username: user.username });
    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  });
});

// Family Members Routes
app.get('/api/family-members', authenticateToken, (req, res) => {
  getFamilyIdForUser(req.user.id, (err, familyId) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    if (!familyId) {
      return res.status(404).json({ error: 'Family not found' });
    }

    db.all(
      'SELECT * FROM family_members WHERE family_id = ? ORDER BY created_at DESC',
      [familyId],
      (err, members) => {
        if (err) {
          return res.status(500).json({ error: 'Error fetching family members' });
        }
        res.json(members);
      }
    );
  });
});

app.post('/api/family-members', authenticateToken, (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  getFamilyIdForUser(req.user.id, (err, familyId) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    if (!familyId) {
      return res.status(404).json({ error: 'Family not found' });
    }

    db.run(
      'INSERT INTO family_members (name, family_id) VALUES (?, ?)',
      [name, familyId],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Error creating family member' });
        }
        res.status(201).json({
          id: this.lastID,
          name,
          family_id: familyId
        });
      }
    );
  });
});

app.delete('/api/family-members/:id', authenticateToken, (req, res) => {
  const memberId = req.params.id;

  getFamilyIdForUser(req.user.id, (err, familyId) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    if (!familyId) {
      return res.status(404).json({ error: 'Family not found' });
    }

    // Verify the member belongs to the user's family
    db.get(
      'SELECT * FROM family_members WHERE id = ? AND family_id = ?',
      [memberId, familyId],
      (err, member) => {
        if (err) {
          return res.status(500).json({ error: 'Server error' });
        }
        if (!member) {
          return res.status(404).json({ error: 'Family member not found' });
        }

        db.run('DELETE FROM family_members WHERE id = ?', [memberId], (err) => {
          if (err) {
            return res.status(500).json({ error: 'Error deleting family member' });
          }
          res.json({ message: 'Family member deleted successfully' });
        });
      }
    );
  });
});

// Default Chores Routes
app.get('/api/default-chores', authenticateToken, (req, res) => {
  db.all('SELECT * FROM default_chores ORDER BY name', (err, chores) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching default chores' });
    }
    res.json(chores);
  });
});

// Chores Routes
app.get('/api/chores', authenticateToken, (req, res) => {
  getFamilyIdForUser(req.user.id, (err, familyId) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    if (!familyId) {
      return res.status(404).json({ error: 'Family not found' });
    }

    db.all(
      `SELECT c.*, fm.name as assigned_to 
       FROM chores c 
       LEFT JOIN family_members fm ON c.family_member_id = fm.id 
       WHERE c.family_id = ? 
       ORDER BY c.created_at DESC`,
      [familyId],
      (err, chores) => {
        if (err) {
          return res.status(500).json({ error: 'Error fetching chores' });
        }
        res.json(chores);
      }
    );
  });
});

app.post('/api/chores', authenticateToken, (req, res) => {
  const { name, estimated_minutes, family_member_id, schedule } = req.body;

  if (!name || !estimated_minutes) {
    return res.status(400).json({ error: 'Name and estimated_minutes are required' });
  }

  getFamilyIdForUser(req.user.id, (err, familyId) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    if (!familyId) {
      return res.status(404).json({ error: 'Family not found' });
    }

    // If family_member_id is provided, verify it belongs to the user's family
    if (family_member_id) {
      db.get(
        'SELECT * FROM family_members WHERE id = ? AND family_id = ?',
        [family_member_id, familyId],
        (err, member) => {
          if (err) {
            return res.status(500).json({ error: 'Server error' });
          }
          if (!member) {
            return res.status(400).json({ error: 'Invalid family member' });
          }

          insertChore();
        }
      );
    } else {
      insertChore();
    }

    function insertChore() {
      db.run(
        'INSERT INTO chores (name, estimated_minutes, family_id, family_member_id, schedule) VALUES (?, ?, ?, ?, ?)',
        [name, estimated_minutes, familyId, family_member_id || null, schedule || null],
        function (err) {
          if (err) {
            return res.status(500).json({ error: 'Error creating chore' });
          }
          res.status(201).json({
            id: this.lastID,
            name,
            estimated_minutes,
            family_id: familyId,
            family_member_id: family_member_id || null,
            schedule: schedule || null,
            status: 'pending'
          });
        }
      );
    }
  });
});

app.put('/api/chores/:id', authenticateToken, (req, res) => {
  const choreId = req.params.id;
  const { name, estimated_minutes, family_member_id, schedule, status } = req.body;

  getFamilyIdForUser(req.user.id, (err, familyId) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    if (!familyId) {
      return res.status(404).json({ error: 'Family not found' });
    }

    // Verify the chore belongs to the user's family
    db.get(
      'SELECT * FROM chores WHERE id = ? AND family_id = ?',
      [choreId, familyId],
      (err, chore) => {
        if (err) {
          return res.status(500).json({ error: 'Server error' });
        }
        if (!chore) {
          return res.status(404).json({ error: 'Chore not found' });
        }

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (estimated_minutes !== undefined) updates.estimated_minutes = estimated_minutes;
        if (family_member_id !== undefined) updates.family_member_id = family_member_id;
        if (schedule !== undefined) updates.schedule = schedule;
        if (status !== undefined) updates.status = status;

        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(updates), choreId];

        db.run(
          `UPDATE chores SET ${fields} WHERE id = ?`,
          values,
          (err) => {
            if (err) {
              return res.status(500).json({ error: 'Error updating chore' });
            }
            res.json({ message: 'Chore updated successfully', ...updates });
          }
        );
      }
    );
  });
});

app.delete('/api/chores/:id', authenticateToken, (req, res) => {
  const choreId = req.params.id;

  getFamilyIdForUser(req.user.id, (err, familyId) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    if (!familyId) {
      return res.status(404).json({ error: 'Family not found' });
    }

    // Verify the chore belongs to the user's family
    db.get(
      'SELECT * FROM chores WHERE id = ? AND family_id = ?',
      [choreId, familyId],
      (err, chore) => {
        if (err) {
          return res.status(500).json({ error: 'Server error' });
        }
        if (!chore) {
          return res.status(404).json({ error: 'Chore not found' });
        }

        db.run('DELETE FROM chores WHERE id = ?', [choreId], (err) => {
          if (err) {
            return res.status(500).json({ error: 'Error deleting chore' });
          }
          res.json({ message: 'Chore deleted successfully' });
        });
      }
    );
  });
});

// Family info route
app.get('/api/family', authenticateToken, (req, res) => {
  getFamilyIdForUser(req.user.id, (err, familyId) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    if (!familyId) {
      return res.status(404).json({ error: 'Family not found' });
    }

    db.get('SELECT * FROM families WHERE id = ?', [familyId], (err, family) => {
      if (err) {
        return res.status(500).json({ error: 'Server error' });
      }
      res.json(family);
    });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
