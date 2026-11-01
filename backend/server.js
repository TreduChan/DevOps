const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const app = express();
const port = process.env.PORT || 3000;

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hotel',
  charset: 'utf8mb4'
});

app.use(express.json());
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Checks the token in the "Authorization: Bearer ..." header
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Not logged in' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admins only' });
  }
  next();
}

// Example protected routes
app.get('/api/me', requireAuth, (req, res) => res.json(req.user));
app.get('/api/admin/ping', requireAuth, requireAdmin, (req, res) => res.json({ ok: true }));

// Create the users table if it does not exist yet
async function createTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
                                       id INT AUTO_INCREMENT PRIMARY KEY,
                                       name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

// Register a new user
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body || {};

  if (![name, email, password].every((v) => typeof v === 'string' && v.trim())) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'email is not valid' });
  }
  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({ error: 'password must be 8-72 characters' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
        'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
        [cleanName, cleanEmail, hash]
    );
    return res.status(201).json({ id: result.insertId, name: cleanName, email: cleanEmail });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('Register failed:', error.message);
    return res.status(500).json({ error: 'Could not register user' });
  }
});

// Log in an existing user
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const [rows] = await pool.execute(
        'SELECT id, name, email, role, password_hash FROM users WHERE email = ?',
        [email.trim().toLowerCase()]
    );
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '2h' });
    return res.status(200).json({ id: user.id, name: user.name, email: user.email, role: user.role, token });
  } catch (error) {
    console.error('Login failed:', error.message);
    return res.status(500).json({ error: 'Could not log in user' });
  }
});

// Bad JSON in a request returns JSON instead of an HTML error page
app.use((err, req, res, next) => {
  res.status(400).json({ error: 'Invalid request' });
});

createTable()
    .then(() => app.listen(port, () => console.log(`Server running on port ${port}`)))
    .catch((error) => {
      console.error('Could not start server:', error.message);
      process.exit(1);
    });