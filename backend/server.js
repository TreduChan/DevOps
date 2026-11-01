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
  charset: 'utf8mb4',
  dateStrings: true
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

// ---------- helpers ----------
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (s) => typeof s === 'string' && DATE_RE.test(s) && !Number.isNaN(Date.parse(s));

// A stay overlaps if it starts before the new one ends and ends after the new one starts
const OVERLAP = `b.status = 'confirmed' AND b.check_in < ? AND b.check_out > ?`;

// Returns [room_number, type, price, capacity, description] or null if invalid
function parseRoom(body) {
  const { room_number, type, price_per_night, capacity, description } = body || {};
  const price = Number(price_per_night);
  const cap = Number(capacity);
  if (
    typeof room_number !== 'string' || !room_number.trim() ||
    typeof type !== 'string' || !type.trim() ||
    !Number.isFinite(price) || price <= 0 ||
    !Number.isInteger(cap) || cap < 1
  ) return null;
  const desc = typeof description === 'string' && description.trim() ? description.trim() : null;
  return [room_number.trim(), type.trim(), price, cap, desc];
}

// ---------- rooms: admin add / update / delete ----------
app.post('/api/admin/rooms', requireAuth, requireAdmin, async (req, res) => {
  const values = parseRoom(req.body);
  if (!values) {
    return res.status(400).json({ error: 'room_number, type, price_per_night (above 0) and capacity (1 or more) are required' });
  }
  try {
    const [result] = await pool.execute(
      'INSERT INTO rooms (room_number, type, price_per_night, capacity, description) VALUES (?, ?, ?, ?, ?)',
      values
    );
    return res.status(201).json({ id: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Room number already exists' });
    console.error('Add room failed:', error.message);
    return res.status(500).json({ error: 'Could not add room' });
  }
});

app.put('/api/admin/rooms/:id', requireAuth, requireAdmin, async (req, res) => {
  const values = parseRoom(req.body);
  if (!values) return res.status(400).json({ error: 'Invalid room data' });
  try {
    const [result] = await pool.execute(
      'UPDATE rooms SET room_number = ?, type = ?, price_per_night = ?, capacity = ?, description = ? WHERE id = ?',
      [...values, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Room not found' });
    return res.json({ id: Number(req.params.id) });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Room number already exists' });
    console.error('Update room failed:', error.message);
    return res.status(500).json({ error: 'Could not update room' });
  }
});

app.delete('/api/admin/rooms/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM rooms WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Room not found' });
    return res.json({ ok: true });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ error: 'This room has bookings, so it cannot be deleted' });
    }
    console.error('Delete room failed:', error.message);
    return res.status(500).json({ error: 'Could not delete room' });
  }
});

// ---------- rooms: list and search (any logged-in user) ----------
// Optional filters: ?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD&guests=2&type=double
app.get('/api/rooms', requireAuth, async (req, res) => {
  const { check_in, check_out, guests, type } = req.query;
  const where = [];
  const params = [];

  if (guests) {
    if (!(Number(guests) >= 1)) return res.status(400).json({ error: 'guests must be 1 or more' });
    where.push('r.capacity >= ?');
    params.push(Number(guests));
  }
  if (type) {
    where.push('r.type = ?');
    params.push(String(type));
  }
  if (check_in || check_out) {
    if (!validDate(check_in) || !validDate(check_out) || check_out <= check_in) {
      return res.status(400).json({ error: 'Give a valid check-in and a later check-out date' });
    }
    where.push(`NOT EXISTS (SELECT 1 FROM bookings b WHERE b.room_id = r.id AND ${OVERLAP})`);
    params.push(check_out, check_in);
  }

  try {
    const [rows] = await pool.execute(
      `SELECT r.id, r.room_number, r.type, r.price_per_night, r.capacity, r.description
       FROM rooms r ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY r.room_number`,
      params
    );
    return res.json(rows);
  } catch (error) {
    console.error('List rooms failed:', error.message);
    return res.status(500).json({ error: 'Could not load rooms' });
  }
});

// ---------- bookings ----------
app.post('/api/bookings', requireAuth, async (req, res) => {
  const { room_id, check_in, check_out } = req.body || {};
  const roomId = Number(room_id);
  const today = new Date().toISOString().slice(0, 10);

  if (!Number.isInteger(roomId) || !validDate(check_in) || !validDate(check_out) || check_out <= check_in) {
    return res.status(400).json({ error: 'room_id and valid dates are required (check-out after check-in)' });
  }
  if (check_in < today) return res.status(400).json({ error: 'Check-in cannot be in the past' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Lock the room row so two people cannot book the same room at the same moment
    const [rooms] = await conn.execute('SELECT id FROM rooms WHERE id = ? FOR UPDATE', [roomId]);
    if (rooms.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Room not found' });
    }
    const [clash] = await conn.execute(
      `SELECT b.id FROM bookings b WHERE b.room_id = ? AND ${OVERLAP}`,
      [roomId, check_out, check_in]
    );
    if (clash.length > 0) {
      await conn.rollback();
      return res.status(409).json({ error: 'Room is not available for those dates' });
    }
    const [result] = await conn.execute(
      'INSERT INTO bookings (user_id, room_id, check_in, check_out) VALUES (?, ?, ?, ?)',
      [req.user.id, roomId, check_in, check_out]
    );
    await conn.commit();
    return res.status(201).json({ id: result.insertId, room_id: roomId, check_in, check_out, status: 'confirmed' });
  } catch (error) {
    await conn.rollback().catch(() => {});
    console.error('Booking failed:', error.message);
    return res.status(500).json({ error: 'Could not make the booking' });
  } finally {
    conn.release();
  }
});

// My reservations
app.get('/api/bookings/mine', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT b.id, b.check_in, b.check_out, b.status, r.room_number, r.type, r.price_per_night
       FROM bookings b JOIN rooms r ON r.id = b.room_id
       WHERE b.user_id = ? ORDER BY b.check_in DESC`,
      [req.user.id]
    );
    return res.json(rows);
  } catch (error) {
    console.error('My bookings failed:', error.message);
    return res.status(500).json({ error: 'Could not load reservations' });
  }
});

// Cancel: the owner or an admin
app.patch('/api/bookings/:id/cancel', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, user_id FROM bookings WHERE id = ?', [req.params.id]);
    const booking = rows[0];
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not your booking' });
    }
    await pool.execute("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [booking.id]);
    return res.json({ id: booking.id, status: 'cancelled' });
  } catch (error) {
    console.error('Cancel failed:', error.message);
    return res.status(500).json({ error: 'Could not cancel the booking' });
  }
});

// Admin: list all bookings
app.get('/api/admin/bookings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT b.id, b.check_in, b.check_out, b.status,
             u.name AS user_name, u.email AS user_email,
             r.room_number
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      JOIN rooms r ON r.id = b.room_id
      ORDER BY b.check_in DESC
    `);
    return res.json(rows);
  } catch (error) {
    console.error('List bookings failed:', error.message);
    return res.status(500).json({ error: 'Could not load bookings' });
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