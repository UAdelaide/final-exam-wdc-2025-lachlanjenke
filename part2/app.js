const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '/public')));

// Set up sessions
app.use(session({
    key: 'dog_walk',
    secret: 'session_key',
    resave: false,
    saveUninitialized: false
}));

// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);

app.get('/api/dogs', async (req, res) => {
  try {
    // Query the database, change anmes as required, join tables for response
    const [dogs] = await db.execute(`
        SELECT * FROM Dogs);
    // Send the json response
    res.json(dogs);
  } catch (err) {
    // Send the error message
    res.status(500).json({ error: 'Failed to fetch dog list' });
  }
});

// Export the app instead of listening here
module.exports = app;