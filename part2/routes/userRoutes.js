const express = require('express');
const router = express.Router();
const db = require('../models/db');

// GET all users (for admin/testing)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT user_id, username, email, role FROM Users');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST a new user (simple signup)
router.post('/register', async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    const [result] = await db.query(`
      INSERT INTO Users (username, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `, [username, email, password, role]);

    res.status(201).json({ message: 'User registered', user_id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  res.json(req.session.user);
});

// POST login
router.post('/login', async (req, res) => {
  // Retrieve parameters
  const { username, password } = req.body;

  try {
    // Select from database where username and password match
    const [rows] = await db.query(`
      SELECT user_id, username, role FROM Users
      WHERE username = ? AND password_hash = ?
    `, [username, password]);

    // If no user found return
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Set up session, including id, username and role
    req.session.user = {
      user_id: rows[0].user_id,
      username: rows[0].username,
      role: rows[0].role
    };

    /// Return sucess message
    return res.json({ message: 'Login successful', user: rows[0] });
  } catch (error) {
    // Return error message
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  // Destory Session
  req.session.destroy((err) => {
    if (err) {
      // Return error if session cannot me deleted
      console.error("Logout unsuccessful due to ", err);
      return res.status(500).json({ error: "Could not logout" });
    }
    // Clear cookie
    res.clearCookie('dog_walk');
    return res.json({ message: 'logged out' });
  });
});


// List owned dogs
router.get('/ownedDogs', async (req, res) => {
  // Get the user id
  const ownerId = req.session.user.user_id;
  try {
    // Query the database
    const [ownerRows] = await db.execute('SELECT dog_id, name, size FROM Dogs WHERE owner_id = ?', [ownerId]);
    // Return the result
    return res.json(ownerRows);
  } catch(err) {
    // Couldn't retrieve Dogs
    return res.status(500).json({ error: 'Could not fetch dogs' });
  }
});
module.exports = router;
