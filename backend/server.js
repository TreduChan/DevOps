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
// Register a new user!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
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

// Returns [room_number, type, price, capacity, description, available_from, available_until] or null
function parseRoom(body) {
  const { room_number, type, price_per_night, capacity, description, available_from, available_until } = body || {};
  const price = Number(price_per_night);
  const cap = Number(capacity);
  const from = available_from || null;
  const until = available_until || null;
  if (
    typeof room_number !== 'string' || !room_number.trim() ||
    typeof type !== 'string' || !type.trim() ||
    !Number.isFinite(price) || price <= 0 ||
    !Number.isInteger(cap) || cap < 1 ||
    (from && !validDate(from)) || (until && !validDate(until)) ||
    (from && until && until <= from)
  ) return null;
  const desc = typeof description === 'string' && description.trim() ? description.trim() : null;
  return [room_number.trim(), type.trim(), price, cap, desc, from, until];
}

// ---------- rooms: admin add / update / delete ----------
app.post('/api/admin/rooms', requireAuth, requireAdmin, async (req, res) => {
  const values = parseRoom(req.body);
  if (!values) {
    return res.status(400).json({ error: 'room_number, type, price_per_night (above 0) and capacity (1 or more) are required' });
  }
  try {
    const [result] = await pool.execute(
      'INSERT INTO rooms (room_number, type, price_per_night, capacity, description, available_from, available_until) VALUES (?, ?, ?, ?, ?, ?, ?)',
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
      'UPDATE rooms SET room_number = ?, type = ?, price_per_night = ?, capacity = ?, description = ?, available_from = ?, available_until = ? WHERE id = ?',
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
    where.push('(r.available_from IS NULL OR r.available_from <= ?)');
    params.push(check_in);
    where.push('(r.available_until IS NULL OR r.available_until >= ?)');
    params.push(check_out);
  }

  try {
    const [rows] = await pool.execute(
      `SELECT r.id, r.room_number, r.type, r.price_per_night, r.capacity, r.description,
              r.available_from, r.available_until
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

// Availability info for one room: its open window and the dates already booked
app.get('/api/rooms/:id/availability', requireAuth, async (req, res) => {
  try {
    const [rooms] = await pool.execute(
      'SELECT available_from, available_until FROM rooms WHERE id = ?',
      [req.params.id]
    );
    if (rooms.length === 0) return res.status(404).json({ error: 'Room not found' });

    const [booked] = await pool.execute(
      `SELECT check_in, check_out FROM bookings
       WHERE room_id = ? AND status = 'confirmed' AND check_out >= CURDATE()
       ORDER BY check_in`,
      [req.params.id]
    );
    return res.json({
      available_from: rooms[0].available_from,
      available_until: rooms[0].available_until,
      booked,
    });
  } catch (error) {
    console.error('Availability failed:', error.message);
    return res.status(500).json({ error: 'Could not load availability' });
  }
});

// ---------- bookings ----------
app.post('/api/bookings', requireAuth, async (req, res) => {
  const { room_id, check_in, check_out, guests, special_request, pay_now } = req.body || {};
  const roomId = Number(room_id);
  const guestCount = Number(guests);
  const request = typeof special_request === 'string' ? special_request.trim() : '';
  const today = new Date().toISOString().slice(0, 10);

  if (!Number.isInteger(roomId) || !validDate(check_in) || !validDate(check_out) || check_out <= check_in) {
    return res.status(400).json({ error: 'Choose valid dates (check-out after check-in)' });
  }
  if (!Number.isInteger(guestCount) || guestCount < 1) {
    return res.status(400).json({ error: 'Number of guests must be 1 or more' });
  }
  if (request.length > 200) {
    return res.status(400).json({ error: 'Special request can be at most 200 characters' });
  }
  if (check_in < today) return res.status(400).json({ error: 'Check-in cannot be in the past' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Lock the room row so two people cannot book the same room at the same moment
    const [rooms] = await conn.execute(
      'SELECT id, capacity, price_per_night, available_from, available_until FROM rooms WHERE id = ? FOR UPDATE',
      [roomId]
    );
    if (rooms.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Room not found' });
    }
    const room = rooms[0];
    if (guestCount > room.capacity) {
      await conn.rollback();
      return res.status(400).json({ error: `This room fits at most ${room.capacity} guests` });
    }
    if (
      (room.available_from && check_in < room.available_from) ||
      (room.available_until && check_out > room.available_until)
    ) {
      await conn.rollback();
      return res.status(409).json({ error: 'Room is not available for those dates' });
    }
    const [clash] = await conn.execute(
      `SELECT b.id FROM bookings b WHERE b.room_id = ? AND ${OVERLAP}`,
      [roomId, check_out, check_in]
    );
    if (clash.length > 0) {
      await conn.rollback();
      return res.status(409).json({ error: 'Room is not available for those dates' });
    }
    const nights = Math.round((Date.parse(check_out) - Date.parse(check_in)) / 86400000);
    const total = Math.round(nights * Number(room.price_per_night) * 100) / 100;
    const paid = pay_now === true ? 1 : 0;

    const [result] = await conn.execute(
      `INSERT INTO bookings (user_id, room_id, check_in, check_out, guests, special_request, total_price, paid)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, roomId, check_in, check_out, guestCount, request || null, total, paid]
    );
    await conn.commit();
    return res.status(201).json({
      id: result.insertId, room_id: roomId, check_in, check_out,
      guests: guestCount, total_price: total, paid: paid === 1, status: 'confirmed',
    });
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
        `SELECT b.id, b.check_in, b.check_out, b.status, b.guests, b.special_request, b.total_price, b.paid,
                r.room_number, r.type
         FROM bookings b JOIN rooms r ON r.id = b.room_id
         WHERE b.user_id = ? AND b.status = 'confirmed'
         ORDER BY b.check_in DESC`,
        [req.user.id]
      );
      return res.json(rows);
    } catch (error) {
      console.error('My bookings failed:', error.message);
      return res.status(500).json({ error: 'Could not load reservations' });
    }
});

// Cancel = remove the booking. Allowed for the owner or an admin
app.patch('/api/bookings/:id/cancel', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, user_id FROM bookings WHERE id = ?', [req.params.id]);
    const booking = rows[0];
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not your booking' });
    }
    await pool.execute('DELETE FROM bookings WHERE id = ?', [booking.id]);
    return res.json({ id: booking.id, cancelled: true });
  } catch (error) {
    console.error('Cancel failed:', error.message);
    return res.status(500).json({ error: 'Could not cancel the booking' });
  }
});

// Admin: list all bookings
app.get('/api/admin/bookings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT b.id, b.check_in, b.check_out, b.status, b.guests, b.special_request, b.total_price, b.paid,
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

// Check that the database is reachable, then start the server
pool.query('SELECT 1')
    .then(() => app.listen(port, () => console.log(`Server running on port ${port}`)))
    .catch((error) => {
      console.error('Could not start server:', error.message);
      process.exit(1);
    });