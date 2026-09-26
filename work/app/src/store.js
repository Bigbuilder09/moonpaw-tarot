// Tiny persistence layer. Everything lives in this browser only (localStorage).
// Swap these two functions for an API call when the app gets a backend.
const KEY = 'moonpaw.v1';

export const DEFAULTS = {
  pet: 'cat',
  name: '',
  petBirthday: '',
  ownerBirthday: '',
  met: false,
  journal: [],   // [{ id, date, day, month, year, mode, key, bg, cards: [artKey] }]
  collected: [], // [artKey]
  daily: null,   // { date: 'YYYY-MM-DD', arts: [artKey] }
  monthly: null  // { month: 'YYYY-MM', arts: [artKey, artKey, artKey] }
};

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? Object.assign({}, DEFAULTS, JSON.parse(raw)) : Object.assign({}, DEFAULTS);
  } catch (e) {
    return Object.assign({}, DEFAULTS);
  }
}

export function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) { /* private mode or storage full: keep working in memory */ }
}

export function clear() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}
