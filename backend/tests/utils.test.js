const { validDate, nightsBetween, totalPrice, parseRoom } = require('../utils');

describe('validDate', () => {
  test('accepts a normal date', () => {
    expect(validDate('2026-12-01')).toBe(true);
  });
  test('rejects the wrong format', () => {
    expect(validDate('1.12.2026')).toBe(false);
  });
  test('rejects a month that does not exist', () => {
    expect(validDate('2026-13-01')).toBe(false);
  });
  test('rejects values that are not strings', () => {
    expect(validDate(null)).toBe(false);
    expect(validDate(20261201)).toBe(false);
  });
});

describe('nights and price', () => {
  test('counts 3 nights', () => {
    expect(nightsBetween('2026-12-01', '2026-12-04')).toBe(3);
  });
  test('counts nights across a month end', () => {
    expect(nightsBetween('2026-11-29', '2026-12-02')).toBe(3);
  });
  test('3 nights at 59 per night cost 177', () => {
    expect(totalPrice(3, 59)).toBe(177);
  });
  test('rounds the total to cents', () => {
    expect(totalPrice(3, '19.99')).toBe(59.97);
  });
});

describe('parseRoom', () => {
  const valid = { room_number: '101', type: 'single', price_per_night: 59, capacity: 2 };

  test('accepts valid room data', () => {
    expect(parseRoom(valid)).toEqual(['101', 'single', 59, 2, null, null, null]);
  });
  test('accepts an availability window', () => {
    const room = { ...valid, available_from: '2026-12-01', available_until: '2026-12-10' };
    expect(parseRoom(room)).toEqual(['101', 'single', 59, 2, null, '2026-12-01', '2026-12-10']);
  });
  test('rejects a price of zero or less', () => {
    expect(parseRoom({ ...valid, price_per_night: 0 })).toBeNull();
    expect(parseRoom({ ...valid, price_per_night: -5 })).toBeNull();
  });
  test('rejects a capacity below 1', () => {
    expect(parseRoom({ ...valid, capacity: 0 })).toBeNull();
  });
  test('rejects an availability window that ends before it starts', () => {
    const room = { ...valid, available_from: '2026-12-10', available_until: '2026-12-01' };
    expect(parseRoom(room)).toBeNull();
  });
});