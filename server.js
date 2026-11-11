const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');

require('dotenv').config();

const db = require('./config/database');

const app = express();


// MIDDLEWARE

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'sleep-health-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(express.static(path.join(__dirname, 'public')));


// HOME PAGE

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});


// REGISTRATION PAGE

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});


// REGISTER USER

app.post('/register', async (req, res) => {

    try {

        const { name, email, password } = req.body;

        if (!name || !email || !password || password.length < 8) {
            return res.status(400).send(
                'Please enter valid details. Password must have at least 8 characters.'
            );
        }

        const [existingUser] = await db.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUser.length > 0) {
            return res.status(409).send(
                'Email already registered. Please login.'
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.execute(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );

        await db.execute(
            'INSERT INTO sleep_goals (user_id, target_hours) VALUES (?, ?)',
            [result.insertId, 8]
        );

        res.redirect('/login?registered=1');

    } catch (error) {

        console.error('Registration Error:', error);

        res.status(500).send('Registration failed. Please try again.');

    }

});


// LOGIN PAGE

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});


// LOGIN USER

app.post('/login', async (req, res) => {

    try {

        const { email, password } = req.body;

        const [users] = await db.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).send('Invalid email or password.');
        }

        const user = users[0];

        const validPassword = await bcrypt.compare(
            password,
            user.password
        );

        if (!validPassword) {
            return res.status(401).send('Invalid email or password.');
        }

        req.session.userId = user.id;
        req.session.userName = user.name;

        res.redirect('/dashboard');

    } catch (error) {

        console.error('Login Error:', error);

        res.status(500).send('Login failed. Please try again.');

    }

});


// SLEEP TRACKING PAGE

app.get('/sleep', (req, res) => {

    if (!req.session.userId) {
        return res.redirect('/login');
    }

    res.sendFile(
        path.join(__dirname, 'views', 'sleep.html')
    );

});


// SAVE SLEEP RECORD

app.post('/sleep', async (req, res) => {

    if (!req.session.userId) {
        return res.redirect('/login');
    }

    try {

        const { sleep_time, wake_time, sleep_quality } = req.body;

        if (!sleep_time || !wake_time || !sleep_quality) {
            return res.status(400).send('Please complete all fields.');
        }

        const start = new Date(sleep_time);
        const end = new Date(wake_time);

        const difference = end - start;

        if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime()) ||
            difference <= 0 ||
            difference > 24 * 60 * 60 * 1000
        ) {
            return res.status(400).send('Please enter valid sleep times.');
        }

        const duration = difference / (1000 * 60 * 60);

        const mysqlSleepTime = sleep_time.replace('T', ' ') + ':00';
        const mysqlWakeTime = wake_time.replace('T', ' ') + ':00';

        await db.execute(
            `INSERT INTO sleep_records
            (user_id, sleep_time, wake_time, duration, sleep_quality)
            VALUES (?, ?, ?, ?, ?)`,
            [
                req.session.userId,
                mysqlSleepTime,
                mysqlWakeTime,
                duration.toFixed(2),
                sleep_quality
            ]
        );

        res.redirect('/dashboard');

    } catch (error) {

        console.error('Sleep Tracking Error:', error);

        res.status(500).send('Unable to save sleep record.');

    }

});


// HEALTH TRACKING PAGE

app.get('/health', (req, res) => {

    if (!req.session.userId) {
        return res.redirect('/login');
    }

    res.sendFile(
        path.join(__dirname, 'views', 'health.html')
    );

});


// SAVE HEALTH RECORD

app.post('/health', async (req, res) => {

    if (!req.session.userId) {
        return res.redirect('/login');
    }

    try {

        const {
            record_date,
            water_intake,
            steps,
            exercise_minutes
        } = req.body;

        if (
            !record_date ||
            water_intake === '' ||
            steps === '' ||
            exercise_minutes === ''
        ) {
            return res.status(400).send('Please complete all fields.');
        }

        const water = Number(water_intake);
        const dailySteps = Number(steps);
        const exercise = Number(exercise_minutes);

        if (
            !Number.isFinite(water) ||
            !Number.isInteger(dailySteps) ||
            !Number.isInteger(exercise) ||
            water < 0 ||
            dailySteps < 0 ||
            exercise < 0 ||
            !/^\d{4}-\d{2}-\d{2}$/.test(record_date)
        ) {
            return res.status(400).send('Please enter valid health details.');
        }

        const [existing] = await db.execute(
            `SELECT id FROM health_records
             WHERE user_id = ? AND record_date = ?`,
            [req.session.userId, record_date]
        );

        if (existing.length > 0) {

            await db.execute(
                `UPDATE health_records
                 SET water_intake = ?,
                     steps = ?,
                     exercise_minutes = ?
                 WHERE user_id = ? AND record_date = ?`,
                [
                    water,
                    dailySteps,
                    exercise,
                    req.session.userId,
                    record_date
                ]
            );

        } else {

            await db.execute(
                `INSERT INTO health_records
                 (user_id, water_intake, steps, exercise_minutes, record_date)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    req.session.userId,
                    water,
                    dailySteps,
                    exercise,
                    record_date
                ]
            );

        }

        res.redirect('/dashboard');

    } catch (error) {

        console.error('Health Tracking Error:', error);

        res.status(500).send('Unable to save health record.');

    }

});


// DASHBOARD PAGE

app.get('/dashboard', (req, res) => {

    if (!req.session.userId) {
        return res.redirect('/login');
    }

    res.sendFile(
        path.join(__dirname, 'views', 'dashboard.html')
    );

});


// DASHBOARD DATA API

app.get('/api/dashboard', async (req, res) => {

    if (!req.session.userId) {
        return res.status(401).json({
            message: 'Please login first'
        });
    }

    try {

        const userId = req.session.userId;

        const [users] = await db.execute(
            'SELECT name FROM users WHERE id = ?',
            [userId]
        );

        const [sleep] = await db.execute(
            `SELECT duration FROM sleep_records
             WHERE user_id = ?
             ORDER BY sleep_time DESC LIMIT 1`,
            [userId]
        );

        const [health] = await db.execute(
            `SELECT water_intake, steps, exercise_minutes
             FROM health_records
             WHERE user_id = ? AND record_date = CURDATE()
             LIMIT 1`,
            [userId]
        );

        const [goals] = await db.execute(
            'SELECT target_hours FROM sleep_goals WHERE user_id = ?',
            [userId]
        );

        const [weekly] = await db.execute(
            `SELECT DATE(sleep_time) AS date, SUM(duration) AS duration
             FROM sleep_records
             WHERE user_id = ?
             AND sleep_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
             GROUP BY DATE(sleep_time)
             ORDER BY date`,
            [userId]
        );

        res.json({

            name: users[0].name,

            sleepDuration: Number(sleep[0]?.duration || 0),

            waterIntake: health[0]?.water_intake || 0,

            steps: health[0]?.steps || 0,

            exerciseMinutes: health[0]?.exercise_minutes || 0,

            sleepGoal: Number(goals[0]?.target_hours || 8),

            weeklySummary: weekly

        });

    } catch (error) {

        console.error('Dashboard API Error:', error);

        res.status(500).json({
            message: 'Unable to load dashboard'
        });

    }

});


// LOGOUT

app.get('/logout', (req, res) => {

    req.session.destroy(() => {
        res.redirect('/login');
    });

});


// DATABASE TEST

app.get('/test-db', async (req, res) => {

    try {

        const [rows] = await db.query(
            'SELECT NOW() AS server_time'
        );

        res.json({
            message: 'MySQL Connected Successfully!',
            database: 'sleep_health_db',
            time: rows[0].server_time
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: 'Database connection failed'
        });

    }

});


// HISTORY PAGE

app.get('/history', (req, res) => {

    if (!req.session.userId) {
        return res.redirect('/login');
    }

    res.sendFile(
        path.join(__dirname, 'views', 'history.html')
    );

});


// SLEEP GOAL API

app.get('/api/sleep-goal', async (req, res) => {

    if (!req.session.userId) {
        return res.status(401).json({ message: 'Please login first.' });
    }

    try {

        const [rows] = await db.execute(
            'SELECT target_hours FROM sleep_goals WHERE user_id = ?',
            [req.session.userId]
        );

        res.json({
            target_hours: rows.length > 0 ? rows[0].target_hours : 8
        });

    } catch (error) {

        console.error(error);
        res.status(500).json({ message: 'Unable to load sleep goal.' });

    }

});


// UPDATE SLEEP GOAL

app.post('/api/sleep-goal', async (req, res) => {

    if (!req.session.userId) {
        return res.status(401).json({ message: 'Please login first.' });
    }

    try {

        const target = Number(req.body.target_hours);

        if (!Number.isFinite(target) || target < 1 || target > 24) {
            return res.status(400).json({
                message: 'Enter a goal between 1 and 24 hours.'
            });
        }

        const [rows] = await db.execute(
            'SELECT id FROM sleep_goals WHERE user_id = ?',
            [req.session.userId]
        );

        if (rows.length > 0) {

            await db.execute(
                'UPDATE sleep_goals SET target_hours = ? WHERE user_id = ?',
                [target, req.session.userId]
            );

        } else {

            await db.execute(
                'INSERT INTO sleep_goals (user_id, target_hours) VALUES (?, ?)',
                [target, req.session.userId]
            );

        }

        res.json({ message: 'Sleep goal updated successfully!' });

    } catch (error) {

        console.error(error);
        res.status(500).json({ message: 'Unable to update sleep goal.' });

    }

});


// HISTORY API

app.get('/api/history', async (req, res) => {

    if (!req.session.userId) {
        return res.status(401).json({
            message: 'Please login first.'
        });
    }

    try {

        const [sleepRecords] = await db.execute(
            `SELECT id, sleep_time, wake_time, duration, sleep_quality
             FROM sleep_records
             WHERE user_id = ?
             ORDER BY sleep_time DESC`,
            [req.session.userId]
        );

        const [healthRecords] = await db.execute(
            `SELECT id, record_date, water_intake, steps, exercise_minutes
             FROM health_records
             WHERE user_id = ?
             ORDER BY record_date DESC`,
            [req.session.userId]
        );

        res.json({
            sleep: sleepRecords,
            health: healthRecords
        });

    } catch (error) {

        console.error('History Error:', error);

        res.status(500).json({
            message: 'Unable to load history.'
        });

    }

});


// DELETE SLEEP RECORD

app.delete('/api/sleep/:id', async (req, res) => {

    if (!req.session.userId) {
        return res.status(401).json({ message: 'Please login first.' });
    }

    try {

        const [result] = await db.execute(
            'DELETE FROM sleep_records WHERE id = ? AND user_id = ?',
            [req.params.id, req.session.userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Sleep record not found.' });
        }

        res.json({ message: 'Sleep record deleted successfully.' });

    } catch (error) {

        console.error(error);

        res.status(500).json({ message: 'Unable to delete sleep record.' });

    }

});


// DELETE HEALTH RECORD

app.delete('/api/health/:id', async (req, res) => {

    if (!req.session.userId) {
        return res.status(401).json({ message: 'Please login first.' });
    }

    try {

        const [result] = await db.execute(
            'DELETE FROM health_records WHERE id = ? AND user_id = ?',
            [req.params.id, req.session.userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Health record not found.' });
        }

        res.json({ message: 'Health record deleted successfully.' });

    } catch (error) {

        console.error(error);

        res.status(500).json({ message: 'Unable to delete health record.' });

    }

});


// SERVER

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});