// Shared game state (persisted household D + session S) and the helpers every screen uses.
import { cardHTML, setCardArt } from './card.js';
import { INFO, GROUP_ADV, LINES, PHASES } from './data.js';
import * as store from './store.js';
import { dayKey, addDays, bdayWindow, REWARDS } from './extras.js';

/* The big content (card pictures, readings, meanings) is loaded separately so the shop front
   shows up fast. loadContent() starts it; the door waits for it before letting anyone in. */
export let READ = null;
export let ITEM_FIX = {};
export let MEANING = {};
let contentP = null;
export function loadContent() {
  if (!contentP) {
    contentP = import('./content.js').then((m) => {
      READ = m.READ; ITEM_FIX = m.ITEM_FIX; MEANING = m.MEANING; setCardArt(m.ART);
    }).catch((e) => { contentP = null; throw e; }); // allow another try (e.g. back online)
  }
  return contentP;
}

export const D = store.load(); // persisted: household (pets + their readings/journals), shared album, streak, rewards

export const S = {             // session only
  step: 'street', door: false, entered: false, line: 0, lines: LINES,
  mode: 'daily', deck: [], picks: [], arts: [], revs: [], flipped: [], dealt: false, sealed: false, gen: 0, readingId: '',
  repeat: false, newCards: [], newRewards: [], streakUp: 0, albumTab: 'major', detail: null,
  confirmReset: false, confirmUnsave: false, confirmRemove: false, toast: '', share: null, install: null
};

export const persist = () => store.save(D);

export const timers = [];

export const later = (fn, ms) => timers.push(setTimeout(fn, ms));

export const todayKey = () => dayKey(new Date());

export const yesterdayKey = () => dayKey(addDays(new Date(), -1));

export const monthKey = () => todayKey().slice(0, 7);

export const thDate = (d, opts, fb) => { try { return d.toLocaleDateString('th-TH', opts); } catch (e) { return fb; } };

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

export const NEED = { daily: 1, monthly: 3, celtic: 10, compat: 3, bday: 3, heart: 1 };

export const need = () => NEED[S.mode] || 1;

export const REV_CHANCE = 0.3; // share of cards that come up reversed (กลับหัว)

export const MODE_TH = { daily: 'รายวัน', monthly: 'รายเดือน', celtic: 'ดวงชะตารวม', compat: 'ดวงสมพงษ์', bday: 'ดวงวันเกิด', heart: 'เสียงในใจน้อง' };

// position labels for the one- and three-card readings
export const LABELS = {
  daily: ['ไพ่ประจำวัน'], heart: ['เสียงในใจน้อง'], monthly: PHASES,
  compat: ['ใจน้อง', 'ใจเจ้าของ', 'สายใยของเรา'], bday: ['ปีที่ผ่านมา', 'ปีใหม่ของน้อง', 'พรวันเกิด']
};

export const LBL = (i) => (LABELS[S.mode] || [])[i] || '';
/** A card's reading in the orientation it was drawn, in the words written for this pet's species
 *  (cat or dog — see readings.js). `act` is the card's own to-do for the owner. */

export function R(a, rev, sp) {
  sp = sp || P().pet;
  const x = INFO[a];
  const t = (READ[sp] || READ.cat)[a];
  const i = rev ? 3 : 0;
  return {
    art: a, rev: !!rev, th: x.th, en: x.en, bg: x.bg, color: x.color, hex: x.hex, group: x.group,
    item: (ITEM_FIX[sp] || {})[x.item] || x.item,
    stats: rev ? x.stats.map((v, j) => Math.max(10, Math.min(100, v + [-15, 5, -10][j]))) : x.stats,
    key: (rev ? x.rv : x.up).key, what: t[i], mean: t[i + 1], act: t[i + 2],
    adv: t[i + 2] || GROUP_ADV[x.group][rev ? 1 : 0]
  };
}

// Madame says the card's to-do in her own voice
export const madame = (act) => `${act} นะจ๊ะ`;

// owner tips for the ten positions of the big spread, built around the card's own to-do
export const POS_TIP = [
  (a) => `เริ่มจากตรงนี้ก่อนเลย ${a}`,
  (a) => `ลองลดสิ่งรบกวนรอบตัวลงสักอย่าง แล้ว${a}`,
  (a) => `ลองนึกย้อนว่าเรื่องนี้เริ่มตอนไหน จะได้เข้าใจน้องโดยไม่โทษเขา จากนั้น${a}`,
  (a) => `พาน้องกลับมากิน เล่น นอนตามเวลาเดิมก่อน แล้ว${a}`,
  (a) => `แนวโน้มนี้ยังเปลี่ยนได้นะ ลองทำแบบนี้สักสองสามวัน ${a}`,
  (a) => `เตรียมตัวไว้ก่อนได้เลย ${a}`,
  (a) => `ให้น้องเป็นคนเลือกจังหวะเอง แล้ว${a}`,
  (a) => `ชวนคนในบ้านช่วยกันนะ ${a}`,
  (a) => `ดูการกิน การนอน และภาษากายจริง ๆ ก่อนจะกังวลแทนน้อง แล้ว${a}`,
  (a) => `ทำเรื่องเล็ก ๆ ให้ต่อเนื่องทุกวันก็พอ ${a}`
];

export const face = (a, w, rev) => (rev ? `<div class="rev">${cardHTML(a, w)}</div>` : cardHTML(a, w));

export const orient = (rev) => `<span class="orient ${rev ? 'rv' : 'up'}">${rev ? 'กลับหัว' : 'ตั้งตรง'}</span>`;

// Celtic Cross positions in a 322×384 box: [centre x, centre y, rotated]
export const SPREAD = [[100, 192], [100, 192, 1], [100, 300], [30, 192], [100, 84], [170, 192], [292, 334], [292, 238], [292, 142], [292, 46]];

export const P = () => D.pets.find((p) => p.id === D.activeId) || D.pets[0];   // the pet being read for

export const nameOf = (p) => (p.name || '').trim() || 'เจ้าตัวเล็ก';

export const dname = () => nameOf(P());

export const MAX_PETS = 1;

// Adding more pets will be a paid unlock later. Until then the button shows a lock.
// Preserve older pets in storage, but only the currently selected pet is available while locked.
export const ADD_PET_LOCKED = true;

export const availablePets = () => ADD_PET_LOCKED ? [P()] : D.pets;

// once-per-period readings: the key of the current period (celtic has none)
export function periodKey(mode, p = P()) {
  if (mode === 'daily' || mode === 'heart') return todayKey();
  if (mode === 'monthly' || mode === 'compat') return monthKey();
  if (mode === 'bday') { const w = bdayWindow(p.petBirthday); return w.open ? w.year : ''; }
  return '';
}

export const CELTIC_WAIT = 24 * 3600 * 1000; // the ten-card spread opens once every 24 hours

export const doneFor = (mode, p = P()) => {
  const r = p.done[mode];
  if (mode === 'celtic') return r && r.at && Date.now() - r.at < CELTIC_WAIT ? r : null;
  const k = periodKey(mode, p); return k && r && r.key === k ? r : null;
};

export const celticUntil = (p = P()) => ((p.done.celtic && p.done.celtic.at) || 0) + CELTIC_WAIT;

export const hasReward = (id) => { const r = REWARDS.find((x) => x.id === id); return !!r && D.streak.days >= r.days; };

// a streak is still alive if the last daily reading was today or yesterday
export const liveStreak = () => (D.streak.last === todayKey() || D.streak.last === yesterdayKey() ? D.streak.count : 0);

export function markDay() {
  const st = D.streak, t = todayKey();
  if (st.last === t) return false;
  st.count = st.last === yesterdayKey() ? st.count + 1 : 1;
  st.last = t; st.days += 1; st.best = Math.max(st.best, st.count);
  return true;
}

export function newlyUnlocked() {
  const fresh = REWARDS.filter((r) => r.days > 0 && D.streak.days >= r.days && !D.rewardsSeen.includes(r.id));
  D.rewardsSeen = D.rewardsSeen.concat(fresh.map((r) => r.id));
  return fresh;
}

export const $ = (id) => document.getElementById(id);

export const pad2 = (n) => String(n).padStart(2, '0');

export function untilText(target) {
  let ms = Math.max(0, target - Date.now());
  const d = Math.floor(ms / 86400000); ms -= d * 86400000;
  const h = Math.floor(ms / 3600000); ms -= h * 3600000;
  const m = Math.floor(ms / 60000); ms -= m * 60000;
  const sec = Math.floor(ms / 1000);
  return (d > 0 ? d + ' วัน ' : '') + pad2(h) + ':' + pad2(m) + ':' + pad2(sec);
}

export const nextDay = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime(); };

export const nextMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(); };
