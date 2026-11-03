const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(s) {
  return typeof s === 'string' && DATE_RE.test(s) && !Number.isNaN(Date.parse(s));
}

// Number of nights between two YYYY-MM-DD dates
function nightsBetween(checkIn, checkOut) {
  return Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000);
}

function totalPrice(nights, pricePerNight) {
  return Math.round(nights * Number(pricePerNight) * 100) / 100;
}

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

module.exports = { validDate, nightsBetween, totalPrice, parseRoom };