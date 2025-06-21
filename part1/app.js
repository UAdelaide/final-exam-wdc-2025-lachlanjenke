var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql2/promise');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const { request } = require('http');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

let db;

(async () => {
    try {
        // Connect to the database, DogWalkService
        db = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'DogWalkService'
        });

        // Check if the users table is empty
        const [userRows] = await db.execute('SELECT COUNT(*) AS count FROM Users');
        // If the table is empty insert data
        if (userRows[0].count === 0) {
            await db.execute(`
                INSERT INTO Users (username, email, password_hash, role) VALUES
                ('alice123','alice@example.com','hashed123','owner'),
                ('bobwalker','bob@example.com','hashed456','walker'),
                ('carol123','carol@example.com','hashed789','owner'),
                ('lachlan007','lachlan@example.com','hashed007','owner'),
                ('charlie02','charlie@example.com','hashed233','walker')
            `);
        }

        // Check if the Dogs table is empty
        const [dogRows] = await db.execute('SELECT COUNT(*) AS count FROM Dogs');
        // If the table is empty insert data
        if (dogRows[0].count === 0) {
            await db.execute(`
                INSERT INTO Dogs(name, size, owner_id) VALUES
                ('Max','medium', (SELECT user_id FROM Users WHERE username = 'alice123')),
                ('Bella','small', (SELECT user_id FROM Users WHERE username = 'carol123')),
                ('Lewis', 'large', (SELECT user_id FROM Users WHERE username = 'lachlan007')),
                ('Lenny', 'medium', (SELECT user_id FROM Users WHERE username = 'lachlan007')),
                ('Otis', 'small', (SELECT user_id FROM Users WHERE username = 'carol123'))
            `);
        }

        // Check if the Walk Requests table is empty
        const [requestRows] = await db.execute('SELECT COUNT(*) AS count FROM WalkRequests');
        // If the table is empty insert data
        if (requestRows[0].count === 0) {
            await db.execute(`
                INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status) VALUES
                (1,'2025-06-10 08:00:00',30,'Parklands','open'),
                (2,'2025-06-10 09:30:00',45,'Beachside Ave','accepted'),
                (3,'2025-07-11 11:45:00',60,'Glenelg','completed'),
                (4,'2025-06-12 15:10:00',20,'Burnside','cancelled'),
                (5,'2025-07-10 06:30:00',55,'Kintore ave','open')
            `);
        }

        // Check if the Walk Applications table is empty
        const [applicationRows] = await db.execute('SELECT COUNT(*) AS count FROM WalkApplications');
        // If the table is empty insert data
        if (applicationRows[0].count === 0) {
            await db.execute(`
                INSERT INTO WalkApplications (request_id, walker_id, status) VALUES
                (1,(SELECT user_id FROM Users WHERE username = 'bobwalker'),'pending'),
                (5,(SELECT user_id FROM Users WHERE username = 'charlie02'),'accepted')
            `);
        }

        // Check if the Walk Ratings table is empty
        const [ratingsRows] = await db.execute('SELECT COUNT(*) AS count FROM WalkRatings');
        // If the table is empty insert data
        if (ratingsRows[0].count === 0) {
            await db.execute(`
                INSERT INTO WalkRatings (request_id, walker_id, owner_id, rating, comments) VALUES
                (
                 (SELECT request_id FROM WalkRequests WHERE location = 'Parklands'),
                 (SELECT user_id FROM Users WHERE username = 'bobwalker'),
                 (SELECT user_id FROM Users WHERE username = 'alice123'),
                 5, 'Very good walk!'
            )
            `);
        }

    } catch (err) {
        // Console log an error
        console.error('Error setting up the database. ', err);
    }
})();

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// Route for loading all dogs
app.get('/api/dogs', async (req, res) => {
  try {
    // Query the database, change anmes as required, join tables for response
    const [dogs] = await db.execute(`
        SELECT d.name AS dog_name, d.size, u.username AS owner_username FROM Dogs AS d
        INNER JOIN Users AS u ON d.owner_id = u.user_id`);
    // Send the json response
    res.json(dogs);
  } catch (err) {
    // Send the error message
    res.status(500).json({ error: 'Failed to fetch dog list' });
  }
});

// Route for all open walk requests
app.get('/api/walkrequests/open', async (req, res) => {
  try {
    // Query the database, change names as required, join tables for resposnse
    const [requests] = await db.execute(`
        SELECT r.request_id, d.name AS dog_name, r.requested_time, r.duration_minutes,
        r.location, u.username AS owner_username FROM ((WalkRequests AS r INNER JOIN Dogs AS d ON
        r.dog_id = d.dog_id) INNER JOIN Users AS u ON d.owner_id = u.user_id)
        WHERE r.status = 'open'`);
    // Send the json resposne
    res.json(requests);
  } catch (err) {
    // Send error
    res.status(500).json({ error: 'Failed to fetch walk requests' });
  }
});

// Route for summaray of the walkers
app.get('/api/walkers/summary', async (req, res) => {
  try {
    // Query the database
    const [walkers] = await db.execute(`
        SELECT u.username AS walker_username, COUNT(r.rating) AS total_ratings, AVG(r.rating) AS average_rating, (SELECT COUNT(*)
        FROM WalkRequests WHERE status = 'completed') AS completed_walks FROM ((Users AS u INNER
        JOIN WalkRatings AS r ON u.user_id = r.walker_id) INNER JOIN WalkRequests AS re
        ON r.request_id = re.request_id) GROUP BY u.username`);
    // Send the response
    res.json(walkers);
  } catch (err) {
    // Return an error message
    res.status(500).json({ error: 'Failed to fetch walkers summary' });
  }
});


module.exports = app;
