// Tiny persistence layer. Everything lives in this browser only (localStorage).
// Swap load/save for an API call when the app gets a backend.
const KEY = 'moonpaw.v1';

let seq = 0;
const newId = () => 'p' + Date.now().toString(36) + (seq++).toString(36);

/** One pet in the household. Readings, journal and period locks are kept per pet. */
export function newPet(kind) {
  return {
    id: newId(),
    pet: kind || 'cat',
    name: '',
    petBirthday: '',
    done: {},      // { daily|monthly|compat|bday|heart: { key: period key, arts, revs } }
    journal: []    // [{ id, mk, date, day, month, year, mode, key, bg, cards, revs }]
  };
}

export const DEFAULTS = () => ({
  v: 2,
  met: false,
  ownerBirthday: '',
  pets: [newPet()],
  activeId: '',
  collected: [],  // [artKey] — shared album for the whole household
  streak: { last: '', count: 0, best: 0, days: 0 }, // days = total days with a daily reading
  rewardsSeen: [], // reward ids already announced
  back: 'classic', // card back in use
  deco: []         // shop decorations switched on
});

/** Brings a save from the single-pet version (v1) up to the household format. */
function migrate(o) {
  if (Array.isArray(o.pets)) return o;
  const p = newPet(o.pet);
  p.name = o.name || '';
  p.petBirthday = o.petBirthday || '';
  if (o.daily && o.daily.date) p.done.daily = { key: o.daily.date, arts: o.daily.arts || [], revs: o.daily.revs || [] };
  if (o.monthly && o.monthly.month) p.done.monthly = { key: o.monthly.month, arts: o.monthly.arts || [], revs: o.monthly.revs || [] };
  const MK = { d: 'daily', m: 'monthly', c: 'celtic' };
  p.journal = (o.journal || []).map((e) => {
    const m = /^([dmc])-(.+)$/.exec(e.id || '');
    const mk = m ? MK[m[1]] : e.mode === 'รายวัน' ? 'daily' : e.mode === 'รายเดือน' ? 'monthly' : 'celtic';
    return Object.assign({}, e, { mk, id: m ? `${mk}-${p.id}-${m[2]}` : e.id });
  });
  // seed the visit counter from the daily readings already in the journal
  const days = new Set(p.journal.filter((e) => e.mk === 'daily').map((e) => `${e.year}-${e.month}-${e.day}`));
  if (p.done.daily) days.add(p.done.daily.key);
  const n = { v: 2, met: !!o.met, ownerBirthday: o.ownerBirthday || '', pets: [p], activeId: p.id, collected: o.collected || [] };
  n.streak = { last: p.done.daily ? p.done.daily.key : '', count: p.done.daily ? 1 : 0, best: p.done.daily ? 1 : 0, days: days.size };
  return n;
}

export function load() {
  let data;
  try {
    const raw = localStorage.getItem(KEY);
    data = raw ? migrate(JSON.parse(raw)) : {};
  } catch (e) {
    data = {};
  }
  const d = Object.assign(DEFAULTS(), data);
  d.streak = Object.assign(DEFAULTS().streak, d.streak || {});
  if (!d.pets.length) d.pets = [newPet()];
  d.pets.forEach((p) => {
    p.done = p.done || {}; p.journal = p.journal || [];
    if (p.pet !== 'cat' && p.pet !== 'dog') p.pet = 'cat'; // only cats and dogs have readings now
  });
  if (!d.pets.some((p) => p.id === d.activeId)) d.activeId = d.pets[0].id;
  return d;
}

export function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) { /* private mode or storage full: keep working in memory */ }
}

export function clear() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}
