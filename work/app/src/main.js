import './moonpaw.css';
import './app.css';
import exterior from './assets/shop-exterior.webp';
import exteriorPortrait from './assets/exterior-portrait.webp';
import interior from './assets/parlour-landscape.webp';
import interiorPortrait from './assets/parlour-portrait.webp';
import { cardHTML, petHTML } from './card.js';
import { ARTS, INFO, GROUP_ADV, POSITIONS, MAJOR, SUIT_TH, RANK_TH, RANK_NUM, PETS, LINES, PHASES } from './data.js';
import * as store from './store.js';
import { ICON } from './icons.js';

/* ------------------------------------------------------------------ state */
const D = store.load(); // persisted: pet profile, journal, album, today's / this month's reading
// repair older saves: a daily / monthly reading that was opened always belongs in the album
[D.daily, D.monthly].forEach((r) => { if (r && r.arts) r.arts.forEach((a) => { if (!D.collected.includes(a)) D.collected.push(a); }); });
const S = {             // session only
  step: 'street', door: false, entered: false, line: 0,
  mode: 'daily', deck: [], picks: [], arts: [], revs: [], flipped: [], dealt: false, readingId: '',
  repeat: false, newCards: [], albumTab: 'major', detail: null, confirmReset: false, confirmUnsave: false
};
const persist = () => store.save(D);
const timers = [];
const later = (fn, ms) => timers.push(setTimeout(fn, ms));

const pad = (n) => String(n).padStart(2, '0');
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const monthKey = () => todayKey().slice(0, 7);
const thDate = (d, opts, fb) => { try { return d.toLocaleDateString('th-TH', opts); } catch (e) { return fb; } };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const need = () => ({ daily: 1, monthly: 3, celtic: 10 }[S.mode] || 1);
const REV_CHANCE = 0.3; // share of cards that come up reversed (กลับหัว)
const MODE_TH = { daily: 'รายวัน', monthly: 'รายเดือน', celtic: 'ดวงชะตารวม' };
/** A card's reading in the orientation it was drawn. */
function R(a, rev) {
  const x = INFO[a];
  const o = rev ? x.rv : x.up;
  return Object.assign({
    art: a, rev: !!rev, th: x.th, en: x.en, bg: x.bg, color: x.color, hex: x.hex, item: x.item, group: x.group,
    stats: rev ? x.stats.map((v, j) => Math.max(10, Math.min(100, v + [-15, 5, -10][j]))) : x.stats,
    adv: GROUP_ADV[x.group][rev ? 1 : 0]
  }, o);
}
const face = (a, w, rev) => (rev ? `<div class="rev">${cardHTML(a, w)}</div>` : cardHTML(a, w));
const orient = (rev) => `<span class="orient ${rev ? 'rv' : 'up'}">${rev ? 'กลับหัว' : 'ตั้งตรง'}</span>`;
// Celtic Cross positions in a 322×384 box: [centre x, centre y, rotated]
const SPREAD = [[100, 192], [100, 192, 1], [100, 300], [30, 192], [100, 84], [170, 192], [292, 334], [292, 238], [292, 142], [292, 46]];
const dname = () => (D.name || '').trim() || 'เจ้าตัวเล็ก';

/* ------------------------------------------------------------------ stage */
const stage = document.getElementById('stage');
stage.innerHTML = `
<div id="world">
<div id="room" class="layer room hidden"><img id="roomArt" class="painted-room" src="${interior}" alt="มาดามโมจิอยู่หลังโต๊ะ สมุดดวงทางซ้าย ลูกแก้วตรงกลาง และอัลบั้มไพ่ทางขวา" fetchpriority="high"></div>
<div id="spots" class="panel off spots">
  <button class="spot spot-read" data-act="goRead" aria-label="ดูดวงกับมาดาม"><span class="ping"></span><span class="spot-label">ดูดวงกับมาดาม</span></button>
  <button class="spot spot-journal" data-act="goJournal" aria-label="สมุดดวง"><span class="ping"></span><span class="spot-label">สมุดดวง</span></button>
  <button class="spot spot-album" data-act="goAlbum" aria-label="อัลบั้มไพ่"><span class="ping"></span><span class="spot-label">อัลบั้มไพ่</span></button>
</div>

<div id="street" class="layer street">
  <img id="streetArt" class="painted-street" src="${exterior}" alt="ร้านไพ่เหมียวจันทร์ แสงโคมอุ่นในยามค่ำ" fetchpriority="high">
  <button class="door-btn" data-act="door" aria-label="เปิดประตูเข้าร้าน">
    <span class="door-glow"></span>
    <span id="doorL" class="door-l"><i class="dp dp1"></i><i class="dp dp2"></i></span>
    <span id="doorR" class="door-r"><i class="dp dp1"></i><i class="dp dp2"></i><i class="knob"></i></span>
  </button>

</div>
</div>
  <div id="streetTitle" class="street-title">
    <div class="eyebrow">MOONPAW TAROT PARLOUR</div>
    <h1>ดูดวงไพ่ยิปซี<br>ให้น้องเจ้าตัวเล็ก</h1>
    <p>ร้านเปิดแล้ว… มาดามโมจิรออยู่ข้างใน</p>
    <div class="shop-name">ร้านไพ่เหมียวจันทร์ <span>MOONPAW TAROT</span></div>
  </div>
<div id="streetCta" class="panel on street-cta"><button class="btn-primary pulse" data-act="door">${ICON.paw} เข้าร้านดูดวง</button><button id="dlBtn" class="dl-btn" data-act="download" hidden>${ICON.dl} ดาวน์โหลดไว้เล่นในเครื่อง</button></div>

<div id="flash"></div>
<div id="veil" class="veil off"></div>

<div id="hud" class="panel off hud">
  <button class="round-btn" data-act="back" id="backBtn" aria-label="ย้อนกลับ">${ICON.back}</button>
  <div id="hudMid"></div>
  <button class="pet-chip" data-act="editPet" aria-label="แก้ไขข้อมูลน้อง"><span id="chipFace"></span><span id="chipName"></span></button>
</div>

<div id="hint" class="panel off hint">${ICON.ball}<div id="hintText"></div></div>

<div id="greet" class="panel off greet">
  <button data-act="next" aria-label="ไปต่อ" class="dialog">
    <span class="nametag">มาดามโมจิ</span>
    <span id="greetLine"></span>
    <span class="dialog-more"><span id="greetHint"></span>${ICON.tri}</span>
  </button>
</div>

<div id="petSheet" class="panel sheet off bottom-sheet">
  <div class="handle"></div>
  <h2>น้องคือใครเอ่ย?</h2>
  <div id="petGrid" class="grid4"></div>
  <label for="petName" class="field">ชื่อน้อง
    <input id="petName" maxlength="20" placeholder="เช่น ข้าวปั้น" autocomplete="off">
  </label>
  <label for="petBirthday" class="field">วันเกิดน้อง
    <input id="petBirthday" type="date" autocomplete="off">
  </label>
  <label for="ownerBirthday" class="field">วันเกิดเจ้าของ
    <input id="ownerBirthday" type="date" autocomplete="off">
  </label>
  <p class="note" style="color:#7456B3;font-weight:600">✨ เร็วๆ นี้: ดูดวงสมพงษ์น้องกับเจ้าของ!</p>
  <button class="btn-primary" data-act="toHub" id="petCta">เข้าไปในร้าน</button>
  <button class="link-btn" data-act="reset" id="resetBtn">ล้างข้อมูลทั้งหมด</button>
</div>

<div id="hub" class="panel off full">
  <div class="dock">
    <button class="opt dock-btn lav" data-act="goRead">${ICON.ball2}<b>ดูดวง</b><small id="todayStatus"></small></button>
    <button class="opt dock-btn pink" data-act="goJournal">${ICON.book}<b>สมุดดวง</b><small id="journalCount"></small></button>
    <button class="opt dock-btn butter" data-act="goAlbum">${ICON.cards}<b>อัลบั้มไพ่</b><small id="albumCount"></small></button>
  </div>
</div>

<div id="modeSheet" class="panel sheet off bottom-sheet">
  <div class="handle"></div>
  <h2>จะดูดวงแบบไหนดี?</h2>
  <div class="grid2">
    <button class="opt mode-btn daily" data-act="daily">
      <span class="mode-art">${`<span style="position:absolute;left:30px;top:8px;transform:rotate(-6deg)">${cardHTML('back', 60)}</span>`}${ICON.sun}</span>
      <b>ดวงรายวัน</b><small>ไพ่ 1 ใบ<br><span id="todayShort"></span></small><span id="dailyBadge" class="badge"></span><span class="countdown" id="dailyCd"></span>
    </button>
    <button class="opt mode-btn monthly" data-act="monthly">
      <span class="mode-art">
        <span style="position:absolute;left:8px;top:16px;transform:rotate(-14deg)">${cardHTML('back', 52)}</span>
        <span style="position:absolute;left:60px;top:16px;transform:rotate(14deg)">${cardHTML('back', 52)}</span>
        <span style="position:absolute;left:34px;top:6px">${cardHTML('back', 52)}</span>
      </span>
      <b>ดวงรายเดือน</b><small>ไพ่ 3 ใบ · ต้น กลาง ปลาย<br><span id="monthLabel"></span></small><span id="monthlyBadge" class="badge"></span><span class="countdown" id="monthlyCd"></span>
    </button>
  </div>
  <button class="opt mode-btn celtic" data-act="celtic">
    <span class="celtic-art" aria-hidden="true">${[[22, 34], [22, 34, 1], [22, 68], [0, 34], [22, 0], [44, 34], [76, 72], [76, 48], [76, 24], [76, 0]].map((p) => `<i style="left:${p[0]}px;top:${p[1]}px${p[2] ? ';transform:rotate(90deg)' : ''}">${cardHTML('back', 19)}</i>`).join('')}</span>
    <span class="celtic-text"><b>ดวงชะตารวม 10 ใบ</b><small>ผัง Celtic Cross ดูลึกทุกด้าน ตั้งแต่รากฐาน ใจกลาง จนถึงผลลัพธ์ · เปิดได้ทุกเมื่อ (ไม่นับเข้าอัลบั้มไพ่)</small></span>
  </button>
  <p class="note">ดวงรายวันเปิดได้วันละครั้ง รายเดือนเดือนละครั้ง ไพ่ที่ได้จะเข้าอัลบั้มและบันทึกลงสมุดดวงให้อัตโนมัติ · ดูดวงเพื่อความสนุก หากน้องไม่สบายควรพาไปพบสัตวแพทย์นะ</p>
</div>

<div id="shuffle" class="panel off full">
  <div id="slots" class="slots"></div>
  <div id="fan" class="fan"></div>
  <div id="deck78" class="deck78"></div>
  <div class="center-bottom row-gap"><button class="btn-soft" data-act="reshuffle">${ICON.shuffle} สับไพ่ใหม่</button><button class="btn-soft" data-act="autoPick" id="autoBtn">${ICON.spark} ให้มาดามเลือกให้</button></div>
</div>

<div id="reveal" class="panel off full">
  <div id="revealCards" class="reveal-row"></div>
  <div id="flipAllWrap" class="panel off center-bottom"><button class="btn-soft" data-act="flipAll">${ICON.spark} เปิดทั้งหมด</button></div>
  <div id="readWrap" class="panel off center-bottom"><button class="btn-primary pulse" data-act="toResult">${ICON.spark} อ่านคำทำนาย</button></div>
</div>

<div id="result" class="panel sheet off scroll-sheet" style="top:76px"><div id="resultBody"></div></div>
<div id="journal" class="panel sheet off scroll-sheet" style="top:340px"><div id="journalBody"></div></div>
<div id="album" class="panel sheet off scroll-sheet" style="top:340px"><div id="albumBody"></div></div>
<div id="detail"></div>
`;

const $ = (id) => document.getElementById(id);
const setHTML = (el, html) => { if (el._html !== html) { el._html = html; el.innerHTML = html; } };
const onoff = (el, on) => { el.classList.toggle('on', !!on); el.classList.toggle('off', !on); };

// the fan of nine face-down cards is created once so its transitions can run
for (let i = 0; i < 12; i++) {
  const b = document.createElement('button');
  b.className = 'fan-card';
  b.dataset.act = 'pick';
  b.dataset.i = i;
  b.setAttribute('aria-label', 'ไพ่ใบที่ ' + (i + 1));
  b.innerHTML = `<div class="lift">${cardHTML('back', 84)}</div>`;
  $('fan').appendChild(b);
}

// the ten-card spread lets you choose from the whole deck, laid out in overlapping rows
for (let i = 0; i < 78; i++) {
  const b = document.createElement('button');
  b.className = 'spread-pick';
  b.dataset.act = 'pick';
  b.dataset.i = i;
  b.setAttribute('aria-label', 'ไพ่ใบที่ ' + (i + 1) + ' จาก 78');
  b.innerHTML = `<div class="lift">${cardHTML('back', 44)}</div>`;
  $('deck78').appendChild(b);
}

/* ------------------------------------------------------------------ countdown */
const pad2 = (n) => String(n).padStart(2, '0');
function untilText(target) {
  let ms = Math.max(0, target - Date.now());
  const d = Math.floor(ms / 86400000); ms -= d * 86400000;
  const h = Math.floor(ms / 3600000); ms -= h * 3600000;
  const m = Math.floor(ms / 60000); ms -= m * 60000;
  const sec = Math.floor(ms / 1000);
  return (d > 0 ? d + ' วัน ' : '') + pad2(h) + ':' + pad2(m) + ':' + pad2(sec);
}
const nextDay = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime(); };
const nextMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(); };
let lastDayKey = todayKey();
function tickCountdown() {
  if (todayKey() !== lastDayKey) { lastDayKey = todayKey(); render(); return; } // a new day or month unlocks readings
  const readToday = D.daily && D.daily.date === todayKey();
  const readMonth = D.monthly && D.monthly.month === monthKey();
  const dTxt = untilText(nextDay()), mTxt = untilText(nextMonth());
  $('dailyCd').innerHTML = readToday ? `<span class="cd-l">${ICON.clock}เปิดใหม่ได้ใน</span><b>${dTxt}</b>` : '';
  $('monthlyCd').innerHTML = readMonth ? `<span class="cd-l">${ICON.clock}เปิดใหม่ได้ใน</span><b>${mTxt}</b>` : '';
  $('todayStatus').textContent = readToday ? 'รายวันใหม่ใน ' + dTxt.replace(/:\d\d$/, '') : 'รายวัน · รายเดือน';
  const cd = document.getElementById('resultCd');
  if (cd) cd.textContent = S.mode === 'monthly' ? mTxt : dTxt;
}
setInterval(tickCountdown, 1000);

/* ------------------------------------------------------------------ flow */
function go(step, extra) {
  Object.assign(S, { step, entered: false, detail: null, confirmReset: false, confirmUnsave: false }, extra || {});
  render();
}

const ACT = {
  download() { downloadApp(); },
  door() {
    if (S.step !== 'street' || S.door) return;
    S.door = true; render();
    later(() => {
      if (D.met) go('hub', { entered: true });
      else go('greet', { line: 0 });
    }, 850);
  },
  next() { if (S.line < LINES.length - 1) { S.line++; render(); } else go('pet'); },
  back() {
    const to = { greet: 'street', pet: D.met ? 'hub' : 'greet', hub: 'street', mode: 'hub', shuffle: 'mode', reveal: 'mode', result: 'hub', journal: 'hub', album: 'hub' }[S.step];
    if (!to) return;
    if (to === 'street') go('street', { door: false, line: 0 });
    else if (to === 'greet') go('greet', { line: LINES.length - 1 });
    else go(to);
  },
  editPet() { if (S.step !== 'pet' && S.step !== 'street') go('pet'); },
  pet(arg) { D.pet = arg; persist(); render(); },
  toHub() {
    D.name = $('petName').value.trim();
    D.petBirthday = $('petBirthday').value;
    D.ownerBirthday = $('ownerBirthday').value;
    D.met = true; persist(); go('hub');
  },
  reset() {
    if (!S.confirmReset) { S.confirmReset = true; render(); return; }
    store.clear(); Object.assign(D, store.load());
    $('petName').value = ''; $('petBirthday').value = ''; $('ownerBirthday').value = '';
    go('street', { door: false, line: 0 });
  },
  goRead() { go('mode'); },
  goJournal() { go('journal'); },
  goAlbum() {
    const first = S.step === 'result' && S.newCards[0];
    const m = first && first.match(/^(cups|wands|swords|pentacles)/);
    go('album', first ? { albumTab: m ? m[1] : 'major' } : {});
  },
  daily() { choose('daily'); },
  monthly() { choose('monthly'); },
  pick(arg) {
    const i = Number(arg);
    if (S.step !== 'shuffle' || !S.dealt || S.picks.includes(i) || S.picks.length >= need()) return;
    const pos = S.picks.length;
    S.picks.push(i); S.arts.push(S.deck[i]);
    // position 2 of the ten-card spread is always read upright (per the source book)
    S.revs.push(S.mode === 'celtic' && pos === 1 ? false : Math.random() < REV_CHANCE);
    render();
    if (S.picks.length === need()) later(() => go('reveal', { flipped: [] }), 950);
  },
  autoPick() {
    if (S.step !== 'shuffle' || !S.dealt) return;
    const count = S.mode === 'celtic' ? 78 : 9;
    const free = shuffle([...Array(count).keys()].filter((i) => !S.picks.includes(i))).slice(0, need() - S.picks.length);
    free.forEach((i, j) => later(() => ACT.pick(i), j * 140));
  },
  flipAll() {
    S.arts.forEach((_, k) => later(() => ACT.flip(k), k * 160));
  },
  reshuffle() {
    S.dealt = false; S.picks = []; S.arts = []; S.revs = []; render();
    later(() => { S.deck = shuffle(ARTS); S.dealt = true; render(); }, 520);
  },
  flip(arg) {
    const k = Number(arg);
    if (S.flipped.includes(k)) return;
    S.flipped.push(k);
    const btn = document.querySelector(`[data-act="flip"][data-arg="${k}"]`);
    if (btn) btn.parentElement.classList.add('flipped');
    if (S.flipped.length === need()) completeReading();
    render();
  },
  toResult() {
    go('result', { newCards: S.newCards.slice(), repeat: false });
  },
  save() {
    // readings are saved automatically; removing one needs a second tap
    const id = entryId();
    const saved = D.journal.some((e) => e.id === id);
    if (!saved) { D.journal = [makeEntry()].concat(D.journal); S.confirmUnsave = false; }
    else if (!S.confirmUnsave) S.confirmUnsave = true;
    else { D.journal = D.journal.filter((e) => e.id !== id); S.confirmUnsave = false; }
    persist(); render();
  },
  celtic() { choose('celtic'); },
  otherMode() { go('mode'); },
  hub() { go('hub'); },
  tab(arg) { S.albumTab = arg; render(); },
  open(arg) { S.detail = arg; render(); },
  close() { S.detail = null; render(); }
};

function choose(mode) {
  // only the daily and monthly readings are once-per-period; the ten-card spread can be opened any time
  const done = mode === 'daily' ? !!(D.daily && D.daily.date === todayKey())
    : mode === 'monthly' ? !!(D.monthly && D.monthly.month === monthKey()) : false;
  const readingId = { daily: 'd-' + todayKey(), monthly: 'm-' + monthKey(), celtic: 'c-' + Date.now() }[mode];
  if (done) {
    const r = mode === 'daily' ? D.daily : D.monthly;
    go('result', { mode, readingId, arts: r.arts.slice(), revs: (r.revs || []).slice(), repeat: true, newCards: [] });
    return;
  }
  go('shuffle', { mode, readingId, deck: shuffle(ARTS), picks: [], arts: [], revs: [], flipped: [], dealt: false, repeat: false, newCards: [] });
  later(() => { S.dealt = true; render(); }, 380);
}

/** Runs once, the moment the last card of a reading is turned over: everything is saved
 *  right away, so leaving the screen early never loses the reading or its cards. */
function completeReading() {
  if (S.mode === 'daily') D.daily = { date: todayKey(), arts: S.arts.slice(), revs: S.revs.slice() };
  if (S.mode === 'monthly') D.monthly = { month: monthKey(), arts: S.arts.slice(), revs: S.revs.slice() };
  // only the once-per-period readings fill the album; the ten-card spread can be opened any time
  const fresh = S.mode === 'celtic' ? [] : S.arts.filter((a) => !D.collected.includes(a));
  D.collected = D.collected.concat(fresh);
  S.newCards = fresh;
  if (!D.journal.some((e) => e.id === entryId())) D.journal = [makeEntry()].concat(D.journal);
  persist();
}

const entryId = () => S.readingId;
function makeEntry() {
  const d = new Date();
  const rs = S.arts.map((a, i) => R(a, S.revs[i]));
  const lead = S.mode === 'monthly' ? rs[1] : rs[0];
  return {
    id: entryId(), day: d.getDate(), month: d.getMonth(), year: d.getFullYear(),
    date: S.mode === 'monthly' ? thDate(d, { month: 'short', year: '2-digit' }, monthKey()) : thDate(d, { day: 'numeric', month: 'short' }, todayKey()),
    mode: MODE_TH[S.mode], key: lead.key, bg: rs[0].bg, cards: S.arts.slice(), revs: S.revs.slice()
  };
}

stage.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act]');
  if (!t || !stage.contains(t)) return;
  const fn = ACT[t.dataset.act];
  if (fn) fn(t.dataset.arg !== undefined ? t.dataset.arg : t.dataset.i);
});
$('petName').addEventListener('input', (e) => { D.name = e.target.value; $('chipName').textContent = dname(); });
$('petName').addEventListener('keydown', (e) => { if (e.key === 'Enter') ACT.toHub(); });
$('petBirthday').addEventListener('change', (e) => { D.petBirthday = e.target.value; });
$('ownerBirthday').addEventListener('change', (e) => { D.ownerBirthday = e.target.value; });

/* ------------------------------------------------------------------ render */
function render() {
  const s = S.step;
  const n = need();
  const readToday = D.daily && D.daily.date === todayKey();
  const readMonth = D.monthly && D.monthly.month === monthKey();
  const allFlipped = S.arts.length === n && S.flipped.length >= n;
  const d = new Date();

  // scene layers
  stage.dataset.step = s;
  $('streetTitle').hidden = s !== 'street';
  $('street').classList.toggle('gone', s !== 'street');
  onoff($('streetCta'), s === 'street' && !S.door);
  $('doorL').classList.toggle('open', S.door);
  $('doorR').classList.toggle('open', S.door);
  $('room').className = 'layer room ' + ({ street: 'hidden', shuffle: 'table', reveal: 'table dim', result: 'dim', journal: 'shelfL', album: 'shelfR' }[s] || 'wide');
  setHTML($('flash'), (s === 'greet' && S.line === 0) || (s === 'hub' && S.entered) ? '<div class="flash"></div>' : '');
  onoff($('veil'), s === 'reveal' || s === 'result');
  layout();

  // HUD
  onoff($('hud'), s !== 'street');
  $('backBtn').setAttribute('aria-label', s === 'hub' ? 'ออกจากร้าน' : 'ย้อนกลับ');
  const ORDER = ['mode', 'shuffle', 'reveal', 'result'];
  const idx = ORDER.indexOf(s);
  const place = { greet: 'ร้านไพ่เหมียวจันทร์', pet: 'ร้านไพ่เหมียวจันทร์', hub: 'ห้องมาดามโมจิ', journal: 'ชั้นสมุดดวง', album: 'ตู้ไพ่สะสม' }[s] || '';
  setHTML($('hudMid'), idx >= 0
    ? `<div class="dots">${ORDER.map((o, i) => `<i class="dot" style="width:${i === idx ? 22 : 8}px;background:${i <= idx ? '#7456B3' : '#D9CCEB'}"></i>`).join('')}</div>`
    : `<div class="place">${place}</div>`);
  setHTML($('chipFace'), petHTML(D.pet, 30));
  $('chipName').textContent = dname();

  // hint bubble
  const hints = {
    hub: readToday ? `ดูดวงวันนี้แล้วนะ น้อง${dname()} จะแวะดูสมุดหรืออัลบั้มก็ได้จ้ะ` : `แตะจุดที่ส่องแสงในร้านได้เลย วันนี้น้อง${dname()} ยังไม่ได้ดูดวงนะ`,
    pet: 'เจ้าตัวเล็กของเจ้าชื่ออะไร เป็นน้องอะไรเอ่ย?',
    mode: `น้อง${dname()} อยากรู้ดวงแบบไหนดีจ๊ะ`,
    shuffle: n === 1 ? `ตั้งจิตถึงน้อง${dname()} แล้วเลือกไพ่ 1 ใบ` : n === 3 ? `เลือกไพ่ 3 ใบ ต้น กลาง ปลายเดือน (${S.picks.length}/3)` : `ตั้งคำถามเรื่องน้อง${dname()} ในใจ แล้วเลือกไพ่ 10 ใบ (${S.picks.length}/10)`,
    reveal: allFlipped ? 'ไพ่พูดแล้ว… มาฟังคำทำนายกันเถอะ' : n === 10 ? 'แตะไพ่ทีละใบตามลำดับ หรือเปิดทั้งหมดพร้อมกันก็ได้จ้ะ' : 'แตะไพ่เพื่อเปิดดวงชะตา'
  };
  onoff($('hint'), !!hints[s]);
  if (hints[s]) $('hintText').textContent = hints[s];

  // greet
  onoff($('greet'), s === 'greet');
  setHTML($('greetLine'), `<span class="lineIn line" data-l="${S.line}">${LINES[S.line]}</span>`);
  $('greetHint').textContent = S.line < LINES.length - 1 ? 'แตะเพื่อไปต่อ' : 'แตะเพื่อแนะนำน้อง';

  // pet sheet
  onoff($('petSheet'), s === 'pet');
  setHTML($('petGrid'), PETS.map((p) => `<button class="opt pet-opt${D.pet === p.k ? ' sel' : ''}" data-act="pet" data-arg="${p.k}" aria-pressed="${D.pet === p.k}">${petHTML(p.k, 52)}<span>${p.th}</span></button>`).join(''));
  if (s === 'pet' && document.activeElement !== $('petName')) $('petName').value = D.name || '';
  if (s === 'pet') {
    if (document.activeElement !== $('petBirthday')) $('petBirthday').value = D.petBirthday || '';
    if (document.activeElement !== $('ownerBirthday')) $('ownerBirthday').value = D.ownerBirthday || '';
  }
  $('petCta').textContent = D.met ? 'บันทึก' : 'เข้าไปในร้าน';
  $('resetBtn').style.display = D.met ? '' : 'none';
  $('resetBtn').textContent = S.confirmReset ? 'แตะอีกครั้งเพื่อยืนยันการล้างข้อมูล' : 'ล้างข้อมูลทั้งหมด';

  // hub
  onoff($('hub'), s === 'hub');
  onoff($('spots'), s === 'hub');
  $('journalCount').textContent = D.journal.length + ' บันทึก';
  $('albumCount').textContent = D.collected.length + '/78 ใบ';

  // mode
  onoff($('modeSheet'), s === 'mode');
  $('todayShort').textContent = thDate(d, { weekday: 'short', day: 'numeric', month: 'short' }, 'วันนี้');
  $('monthLabel').textContent = thDate(d, { month: 'long', year: 'numeric' }, 'เดือนนี้');
  $('dailyBadge').textContent = readToday ? 'เปิดแล้ววันนี้ · แตะดูอีกครั้ง' : '';
  $('monthlyBadge').textContent = readMonth ? 'เปิดแล้วเดือนนี้ · แตะดูอีกครั้ง' : '';
  tickCountdown();

  // shuffle
  onoff($('shuffle'), s === 'shuffle');
  const slotW = n === 1 ? 72 : 64;
  $('slots').classList.toggle('mini-spread', n === 10);
  setHTML($('slots'), n === 10
    ? SPREAD.map((p, i) => `<div class="mslot${i < S.picks.length ? ' filled pop' : ''}" style="left:${(p[0] - 28) * 0.42}px;top:${(p[1] - 46) * 0.42}px${p[2] ? ';transform:rotate(90deg)' : ''}">${i < S.picks.length ? cardHTML('back', 24) : `<span>${i + 1}</span>`}</div>`).join('')
    : Array.from({ length: n }, (_, i) =>
      `<div class="slot-col"><div class="slot" style="width:${slotW}px;height:${Math.round(slotW * 1.65)}px">${i < S.picks.length ? `<div class="pop slot-card">${cardHTML('back', slotW)}</div>` : ''}</div><span class="chip">${n === 1 ? 'ไพ่ประจำวัน' : PHASES[i]}</span></div>`).join(''));
  const fanCount = n === 10 ? 12 : 9;
  const spreadDeg = n === 10 ? 27 : 22;
  [...$('fan').children].forEach((b, i) => {
    b.style.display = i < fanCount ? '' : 'none';
    const a = -spreadDeg + i * (2 * spreadDeg / (fanCount - 1));
    const picked = S.picks.includes(i);
    b.style.transform = picked ? `rotate(${a}deg) translateY(-150px) scale(.55)` : S.dealt ? `rotate(${a}deg)` : 'rotate(0deg) translateY(30px)';
    b.style.opacity = picked ? 0 : 1;
    b.style.transitionDelay = (S.dealt ? i * 40 : (fanCount - 1 - i) * 22) + 'ms';
  });
  $('autoBtn').style.display = n === 10 ? '' : 'none';
  $('fan').style.display = n === 10 ? 'none' : '';
  $('deck78').style.display = n === 10 ? '' : 'none';
  if (n === 10) layoutDeck78();

  // reveal
  onoff($('reveal'), s === 'reveal');
  const bigW = n === 1 ? 200 : n === 3 ? 108 : 56;
  const flipBtn = (a, k, w) => `<button class="flip" data-act="flip" data-arg="${k}" aria-label="เปิดไพ่ใบที่ ${k + 1}" style="width:${w}px;height:${Math.round(w * 1.65)}px">
        <div class="flip-inner"><div class="face" style="border-radius:${Math.round(w * 0.08)}px">${cardHTML('back', w)}</div><div class="face front" style="border-radius:${Math.round(w * 0.08)}px">${face(a, w, S.revs[k])}</div></div>
        ${ICON.burst}
      </button>`;
  $('revealCards').classList.toggle('spread', n === 10);
  setHTML($('revealCards'), s !== 'reveal' ? '' : n === 10
    ? S.arts.map((a, k) => { const p = SPREAD[k]; return `<div class="rise flip-col spread-card${p[2] ? ' cross' : ''}" style="left:${p[0] - 28}px;top:${p[1] - 46}px;animation-delay:${k * 90}ms"><span class="pos-num">${k + 1}</span>${flipBtn(a, k, 56)}</div>`; }).join('')
    : S.arts.map((a, k) =>
    `<div class="rise flip-col" style="animation-delay:${k * 140}ms">
      <span class="chip">${n === 1 ? 'ไพ่ประจำวัน' : PHASES[k]}</span>
      ${flipBtn(a, k, bigW)}
      <span class="fname" style="font-size:${n === 1 ? 20 : 14}px;max-width:${bigW}px">${INFO[a].th}${S.revs[k] ? '<br><small>กลับหัว</small>' : ''}</span>
    </div>`).join(''));
  onoff($('flipAllWrap'), s === 'reveal' && n === 10 && !allFlipped);
  onoff($('readWrap'), s === 'reveal' && allFlipped);

  // result / journal / album / detail
  onoff($('result'), s === 'result');
  setHTML($('resultBody'), s === 'result' ? resultHTML() : '');
  const saveBtn = $('saveBtn');
  if (saveBtn) {
    const isSaved = D.journal.some((e) => e.id === entryId());
    saveBtn.innerHTML = !isSaved ? 'บันทึกลงสมุดดวง' : S.confirmUnsave ? 'แตะอีกครั้งเพื่อลบออกจากสมุดดวง' : ICON.check + 'บันทึกในสมุดดวงแล้ว';
    saveBtn.setAttribute('aria-pressed', isSaved);
  }
  onoff($('journal'), s === 'journal');
  setHTML($('journalBody'), s === 'journal' ? journalHTML() : '');
  onoff($('album'), s === 'album');
  setHTML($('albumBody'), s === 'album' ? albumHTML() : '');
  setHTML($('detail'), S.detail ? detailHTML(S.detail) : '');
}

const STATS = [['พลังงาน', '#F0B955'], ['ความขี้อ้อน', '#EE9FB4'], ['ความซน', '#9C86D4']];
function statsHTML(rs) {
  const avg = [0, 1, 2].map((j) => Math.round(rs.reduce((t, x) => t + x.stats[j], 0) / rs.length));
  return `<div class="box"><div class="mid">ค่าพลังของน้อง</div>
      ${STATS.map((st, j) => `<div class="stat"><span>${st[0]}</span><div class="track"><div class="bar" style="width:${avg[j]}%;background:${st[1]}"></div></div><em>${avg[j]}</em></div>`).join('')}
    </div>`;
}
const luckyHTML = (x) => `<div class="grid2">
      <div class="box"><div class="muted">สีมงคล</div><div class="row"><span class="swatch" style="background:${x.hex}"></span><b>${x.color}</b></div></div>
      <div class="box"><div class="muted">ของนำโชค</div><div class="row">${ICON.gift}<b>${x.item}</b></div></div>
    </div>`;
const adviceHTML = (label, text) => `<div class="advice">${ICON.mochi}<div><div class="muted strong">${label}</div><div class="quote">“${text}”</div></div></div>`;
const thumb = (x, w) => `<button class="card-btn" data-act="open" data-arg="${x.art}" aria-label="ดูความหมาย ${x.th}">${face(x.art, w, x.rev)}</button>`;

// Lay the 78 face-down cards in gently arched, overlapping rows that fit the screen width.
function layoutDeck78() {
  const box = $('deck78');
  const W = Math.min(box.clientWidth || 358, 760);
  const rows = W < 520 ? 4 : 3;
  const perRow = Math.ceil(78 / rows);
  const step = (W - 44) / (perRow - 1);
  [...box.children].forEach((b, i) => {
    const r = Math.floor(i / perRow), c = i % perRow;
    const t = perRow > 1 ? c / (perRow - 1) - 0.5 : 0; // -0.5 … 0.5 across the row
    const x = (box.clientWidth - W) / 2 + c * step;
    const y = r * 46 + t * t * 36;
    const picked = S.picks.includes(i);
    b.style.zIndex = i;
    b.style.transform = !S.dealt ? `translate(${box.clientWidth / 2 - 22}px, 60px) rotate(0deg)`
      : picked ? `translate(${x}px, ${y - 70}px) rotate(${t * 16}deg) scale(.6)` : `translate(${x}px, ${y}px) rotate(${t * 16}deg)`;
    b.style.opacity = picked ? 0 : 1;
    b.style.transitionDelay = (S.dealt ? i * 9 : 0) + 'ms';
  });
}

function resultHTML() {
  const n = need();
  const rs = S.arts.filter((a) => INFO[a]).map((a, i) => R(a, S.revs[i]));
  if (rs.length < n) return `<div class="res"><h2>ไพ่ยังไม่ครบ</h2><div class="body">ลองเลือกไพ่ใหม่อีกครั้งนะจ๊ะ</div><button class="btn-primary" data-act="otherMode">กลับไปเลือกแบบดูดวง</button></div>`;
  const first = rs[0], mid = rs[Math.floor(rs.length / 2)], last = rs[rs.length - 1];
  const d = new Date();
  const title = { daily: thDate(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, 'วันนี้'), monthly: 'ดวงประจำเดือน' + thDate(d, { month: 'long', year: 'numeric' }, ''), celtic: 'ดวงชะตารวม 10 ใบ · ' + thDate(d, { day: 'numeric', month: 'short' }, '') }[S.mode];
  let body = '';
  if (n === 1) {
    body = `<div class="lineIn main-card" style="background:${first.bg}">${thumb(first, 96)}<div><div class="muted">${first.th} ${orient(first.rev)}</div><div class="big">${first.key}</div></div></div>
      <div class="box story"><div class="muted strong">น้องเป็นแบบนี้</div><div class="body">${first.what}</div><div class="body">${first.mean}</div></div>
      ${statsHTML(rs)}${luckyHTML(first)}
      ${adviceHTML('มาดามโมจิฝากบอกเจ้าของ', first.adv)}`;
  } else if (n === 3) {
    body = `<div class="theme"><div class="muted">ธีมของเดือน</div><div class="big">${mid.key}</div></div>` +
      rs.map((x, k) => `<div class="lineIn phase" style="background:${x.bg};animation-delay:${k * 120}ms">${thumb(x, 56)}<div><div class="muted">${PHASES[k]} · ${x.th} ${orient(x.rev)}</div><div class="mid">${x.key}</div><div class="body">${x.what}</div><div class="body soft">${x.mean}</div></div></div>`).join('') +
      statsHTML(rs) + luckyHTML(first) + adviceHTML('มาดามโมจิฝากบอกเจ้าของ', last.adv);
  } else {
    const P = POSITIONS;
    body = `<div class="theme"><div class="muted">หัวใจของเรื่อง · ใบที่ 1 และ 2</div><div class="big">${rs[0].key}</div><div class="body">ท่ามกลางแรงที่เข้ามา: ${rs[1].key}</div></div>
      <div class="theme mint"><div class="muted">ทิศทางสุดท้าย · ใบที่ 10</div><div class="big">${rs[9].key}</div></div>
      <div class="spread-mini">${rs.map((x, k) => { const p = SPREAD[k]; return `<div class="spread-card${p[2] ? ' cross' : ''}" style="left:${p[0] - 28}px;top:${p[1] - 46}px"><span class="pos-num">${k + 1}</span>${thumb(x, 56)}</div>`; }).join('')}</div>
      <p class="note">ตามตำรา ใบที่ 2 “แรงที่ไขว้เข้ามา” อ่านแบบตั้งตรงเสมอ เพราะเป็นแรงที่เกิดขึ้นจริงตรงหน้า</p>
      ${rs.map((x, k) => `<section class="pos-block lineIn" style="animation-delay:${Math.min(k, 5) * 80}ms">
        <div class="pos-head"><span class="num" style="background:${x.bg}">${k + 1}</span><div><b>${P[k][0]}</b><div class="muted">${P[k][2]}</div></div></div>
        <div class="pos-card">${thumb(x, 52)}<div><div class="muted">${x.th} ${orient(x.rev)}</div><div class="mid">${x.key}</div></div></div>
        <div class="body">${P[k][3]} ${x.what}</div>
        <div class="body soft">${x.mean}</div>
        <div class="owner-tip"><b>คำแนะนำสำหรับเจ้าของ · ${P[k][4]}</b><div>${x.adv}</div></div>
      </section>`).join('')}
      ${statsHTML(rs)}${luckyHTML(last)}
      ${adviceHTML('มาดามโมจิสรุปให้', last.adv)}
      <p class="note">ไพ่จากดวงชะตารวมไม่นับเข้าอัลบั้ม สะสมไพ่ได้จากดวงรายวันและรายเดือนนะจ๊ะ</p>`;
  }
  return `<div class="res">
    <div><div class="muted">${title}</div>
    <h2>คำทำนายของน้อง${esc(dname())}</h2></div>
    ${S.repeat ? `<div class="notice">${n === 1 ? 'วันนี้น้องเปิดไพ่ไปแล้ว นี่คือไพ่ประจำวันของน้องจ้ะ' : 'เดือนนี้น้องเปิดไพ่ไปแล้ว นี่คือดวงประจำเดือนของน้องจ้ะ'}<div class="notice-cd">${ICON.clock}<span>เปิดใหม่ได้ใน <b id="resultCd">${untilText(n === 1 ? nextDay() : nextMonth())}</b></span></div></div>` : ''}
    ${S.newCards.length ? `<button class="pop new-cards" data-act="goAlbum"><svg class="shine" width="36" height="36" viewBox="0 0 36 36" aria-hidden="true"><path d="M18 3 Q18 18 33 18 Q18 18 18 33 Q18 18 3 18 Q18 18 18 3Z" fill="#F0B955" stroke="#6B5577" stroke-width="2" stroke-linejoin="round"/></svg><span><b>ได้ไพ่ใหม่เข้าอัลบั้ม +${S.newCards.length}</b><small>สะสมแล้ว ${D.collected.length}/78 ใบ · แตะเพื่อดูอัลบั้ม</small></span></button>` : ''}
    ${body}
    <button class="btn-primary" data-act="save" id="saveBtn"></button>
    <div class="grid2"><button class="btn-outline" data-act="otherMode">ดูดวงแบบอื่น</button><button class="btn-outline" data-act="hub">กลับไปในร้าน</button></div>
    <p class="note">คำทำนายเพื่อความบันเทิง หากน้องมีอาการผิดปกติควรปรึกษาสัตวแพทย์</p>
  </div>`;
}

function journalHTML() {
  const d = new Date();
  const y = d.getFullYear(), m = d.getMonth(), today = d.getDate();
  const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
  const marked = {};
  D.journal.forEach((e) => { if (e.month === m && e.year === y && e.mode === 'รายวัน') marked[e.day] = true; });
  let cal = '';
  for (let i = 0; i < first; i++) cal += '<span></span>';
  for (let dd = 1; dd <= days; dd++) cal += `<span class="day${dd === today ? ' today' : ''}${marked[dd] ? ' marked' : ''}">${dd}</span>`;
  return `<div class="sheet-body">
    <div class="handle"></div>
    <div class="row between"><h2>สมุดดวงของน้อง${esc(dname())}</h2><span class="chip pink">${D.journal.length} บันทึก</span></div>
    <div class="box"><div class="mid">${thDate(d, { month: 'long', year: 'numeric' }, '')}</div>
      <div class="cal">${['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((w) => `<b>${w}</b>`).join('')}${cal}</div></div>
    ${D.journal.length ? D.journal.map((e) => `<div class="entry" style="background:${e.bg}"><div class="entry-cards">${e.cards.slice(0, 3).map((c, i) => `<button class="card-btn" data-act="open" data-arg="${c}" aria-label="ดูความหมาย">${face(c, 40, e.revs && e.revs[i])}</button>`).join('')}${e.cards.length > 3 ? `<span class="more">+${e.cards.length - 3}</span>` : ''}</div><div><div class="muted">${e.date} · ${e.mode}</div><div class="mid">${e.key}</div></div></div>`).join('')
      : `<div class="empty"><svg width="84" height="64" viewBox="0 0 84 64" aria-hidden="true"><path d="M8 12 Q24 4 42 12 V58 Q24 50 8 58 Z" fill="#F7B6C4" stroke="#6B5577" stroke-width="2.5" stroke-linejoin="round"/><path d="M76 12 Q60 4 42 12 V58 Q60 50 76 58 Z" fill="#FFF6EA" stroke="#6B5577" stroke-width="2.5" stroke-linejoin="round"/></svg><b>สมุดยังว่างอยู่เลย</b><div class="body">ดูดวงแล้วกด “บันทึกลงสมุดดวง” เพื่อเก็บคำทำนายไว้ย้อนดู</div><button class="btn-primary small" data-act="goRead">ไปหามาดามโมจิ</button></div>`}
  </div>`;
}

function albumHTML() {
  const TABS = [['major', 'เมเจอร์'], ['cups', 'ถ้วย'], ['wands', 'ไม้เท้า'], ['swords', 'ดาบ'], ['pentacles', 'เหรียญ']];
  const items = (t) => t === 'major'
    ? MAJOR.map((r) => ({ num: r[0], name: r[1], art: r[2] }))
    : RANK_TH.map((rt, i) => ({ num: RANK_NUM[i], name: i < 10 ? (i === 0 ? 'เอซ' : rt) + SUIT_TH[t] : rt, art: t + (i + 1) }));
  const has = (a) => D.collected.includes(a);
  return `<div class="sheet-body">
    <div class="handle"></div>
    <h2>อัลบั้มไพ่สะสม</h2>
    <div class="row"><div class="track grow"><div class="bar" style="width:${Math.round(D.collected.length / 78 * 100)}%;background:#F0B955"></div></div><b class="small-b">${D.collected.length}/78</b></div>
    <div class="muted">สะสมไพ่ได้จากดวงรายวันและรายเดือน · แตะไพ่ที่ปลดล็อกเพื่อดูความหมาย</div>
    <div class="tabs">${TABS.map((t) => { const it = items(t[0]); return `<button class="tab${S.albumTab === t[0] ? ' sel' : ''}" data-act="tab" data-arg="${t[0]}" aria-pressed="${S.albumTab === t[0]}">${t[1]}<small>${it.filter((r) => has(r.art)).length}/${it.length}</small></button>`; }).join('')}</div>
    <div class="album-grid">${items(S.albumTab).map((r) => has(r.art)
      ? `<div class="album-item"><button class="card-btn opt pop" data-act="open" data-arg="${r.art}" aria-label="ดูความหมาย ${r.name}">${cardHTML(r.art, 72)}</button><span>${r.num} · ${r.name}</span></div>`
      : `<div class="album-item locked"><div class="locked-card">${cardHTML('back', 72)}${ICON.lock}</div><span>${r.num} · ???</span></div>`).join('')}</div>
  </div>`;
}

function detailHTML(key) {
  if (!INFO[key]) return '';
  const u = R(key, false), r = R(key, true);
  const side = (x) => `<div class="box stack" style="background:${x.bg}">
        <div class="row between"><b>${x.key}</b>${orient(x.rev)}</div>
        <div>${x.what}</div><div class="soft">${x.mean}</div>
        <div class="owner-tip"><b>คำแนะนำสำหรับเจ้าของ</b><div>${x.adv}</div></div>
      </div>`;
  return `<div class="modal lineIn" role="dialog" aria-modal="true" aria-label="${u.th}">
    <button class="modal-bg" data-act="close" aria-label="ปิด"></button>
    <div class="modal-box">
      <div class="pop" style="transform:rotate(-2deg)">${cardHTML(key, 150)}</div>
      <div class="center"><div class="muted">${u.en}</div><div class="big">${u.th}</div></div>
      ${side(u)}${side(r)}
      <button class="btn-primary small" data-act="close">ปิด</button>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ responsive layout */
// The painted scene (shop + street) is drawn in a 390×844 "design space" with extra
// backdrop on each side. It is scaled to the screen height and centred; on wide screens
// it slides left to make room for the side panel. UI panels are plain responsive CSS.
const SIDE_STEPS = ['pet', 'mode', 'result', 'journal', 'album'];
function layout() {
  const W = stage.clientWidth, H = stage.clientHeight;
  const wide = W >= 640 && W / H >= 1.2;
  const tablet = !wide && W >= 700;
  stage.classList.toggle('wide', wide);
  stage.classList.toggle('tablet', tablet);
  const portrait = W / H < 0.9;
  stage.classList.toggle('portrait-scene', portrait);
  const sceneW = portrait ? 1024 : 1536, sceneH = portrait ? 1536 : 1024;
  const side = wide && SIDE_STEPS.includes(S.step);
  const top = S.step === 'street' ? (H < 560 ? 108 : portrait ? 190 : 156) : 78;
  const bottom = S.step === 'street' ? 120 : 100;
  const availableW = Math.max(240, W - (side ? 514 : 24));
  const availableH = Math.max(150, H - top - bottom);
  const scale = Math.min(availableW / sceneW, availableH / sceneH);
  const x = (side ? availableW + 32 : W) / 2 - sceneW * scale / 2;
  const y = top + (availableH - sceneH * scale) / 2;
  $('world').style.width = `${sceneW}px`;
  $('world').style.height = `${sceneH}px`;
  $('world').style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  stage.style.setProperty('--scene-scale', scale);
  const roomSource = portrait ? interiorPortrait : interior;
  if ($('roomArt').getAttribute('src') !== roomSource) $('roomArt').src = roomSource;
  const streetSource = portrait ? exteriorPortrait : exterior;
  if ($('streetArt').getAttribute('src') !== streetSource) $('streetArt').src = streetSource;
  stage.style.setProperty('--backdrop', `url("${S.step === 'street' ? streetSource : roomSource}")`);
  const k = Math.max(0.6, Math.min(W / 390, H / 844, wide ? 1.25 : 1.45));
  stage.classList.toggle('side', wide && SIDE_STEPS.includes(S.step));
  stage.classList.toggle('short', H < 560);
  stage.style.setProperty('--k', k.toFixed(3));
  if (S.step === 'shuffle' && need() === 10) layoutDeck78();
}
// focusing an input inside a sliding panel must never scroll the stage itself
stage.addEventListener('scroll', () => { stage.scrollLeft = 0; stage.scrollTop = 0; });
let resizeTimer;
window.addEventListener('resize', () => {
  stage.classList.add('resizing');
  layout();
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => stage.classList.remove('resizing'), 150);
});
stage.classList.add('resizing'); // first frame: place the scene without animating
render();
requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.remove('resizing')));

/* ------------------------------------------------------------------ download
   Offers the whole single-file app as moonpaw-pet-tarot.html.
   - On claude.ai (published artifact): the file is published next to the page and
     saved through the viewer's "downloads" capability.
   - On a normal web host: re-fetches this page and saves it with <a download>.
   - Opened from a local file: hidden (it is already downloaded). */
const DL_NAME = 'moonpaw-pet-tarot.html';
let dlMode = null;
async function initDownload() {
  const btn = $('dlBtn');
  if (window.claude && window.claude.use) {
    try { const d = await window.claude.use('downloads'); if (d) { dlMode = { kind: 'claude', d }; btn.hidden = false; } } catch (e) { /* unavailable */ }
  } else if (/^https?:$/.test(location.protocol)) {
    dlMode = { kind: 'web' }; btn.hidden = false;
  }
}
async function downloadApp() {
  const btn = $('dlBtn');
  if (!dlMode || btn.disabled) return;
  const label = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = `${ICON.dl} กำลังเตรียมไฟล์…`;
  try {
    if (dlMode.kind === 'claude') {
      const r = await fetch(DL_NAME);
      if (!r.ok) throw new Error('fetch');
      await dlMode.d.save({ filename: DL_NAME, data: await r.blob() });
    } else {
      const r = await fetch(location.href.split('#')[0]);
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement('a'); a.href = url; a.download = DL_NAME;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }
  } catch (e) {
    if (e && ['unavailable', 'not_granted', 'capability_disabled', 'capability_removed'].includes(e.code)) btn.hidden = true;
  } finally { btn.disabled = false; btn.innerHTML = label; }
}
initDownload();
