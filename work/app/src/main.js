import './moonpaw.css';
import './app.css';
import exterior from './assets/shop-exterior.webp';
import exteriorPortrait from './assets/exterior-portrait.webp';
import interior from './assets/parlour-landscape.webp';
import interiorPortrait from './assets/parlour-portrait.webp';
import { cardHTML, petHTML, setBack } from './card.js';
import { ARTS, INFO, GROUP_ADV, POSITIONS, MAJOR, SUIT_TH, RANK_TH, RANK_NUM, PETS, LINES, PHASES } from './data.js';
import * as store from './store.js';
import { ICON } from './icons.js';
import { READ, ITEM_FIX } from './readings.js';
import { dayKey, addDays, isBirthday, daysToBirthday, ageText, bdayWindow, BDAY_WINDOW, compatInfo, EL_TH, BLESS, HEART, REWARDS, nextReward } from './extras.js';
import { makeShareImage } from './share.js';
import { initInstall, installKind, promptInstall, openExternal, askedExternal, isLine, persistStorage } from './install.js';

/* ------------------------------------------------------------------ state */
const D = store.load(); // persisted: household (pets + their readings/journals), shared album, streak, rewards
const S = {             // session only
  step: 'street', door: false, entered: false, line: 0, lines: LINES,
  mode: 'daily', deck: [], picks: [], arts: [], revs: [], flipped: [], dealt: false, readingId: '',
  repeat: false, newCards: [], newRewards: [], streakUp: 0, albumTab: 'major', detail: null,
  confirmReset: false, confirmUnsave: false, confirmRemove: false, toast: '', share: null, install: null
};
const persist = () => store.save(D);
const timers = [];
const later = (fn, ms) => timers.push(setTimeout(fn, ms));

const todayKey = () => dayKey(new Date());
const yesterdayKey = () => dayKey(addDays(new Date(), -1));
const monthKey = () => todayKey().slice(0, 7);
const thDate = (d, opts, fb) => { try { return d.toLocaleDateString('th-TH', opts); } catch (e) { return fb; } };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const NEED = { daily: 1, monthly: 3, celtic: 10, compat: 3, bday: 3, heart: 1 };
const need = () => NEED[S.mode] || 1;
const REV_CHANCE = 0.3; // share of cards that come up reversed (กลับหัว)
const MODE_TH = { daily: 'รายวัน', monthly: 'รายเดือน', celtic: 'ดวงชะตารวม', compat: 'ดวงสมพงษ์', bday: 'ดวงวันเกิด', heart: 'เสียงในใจน้อง' };
// position labels for the one- and three-card readings
const LABELS = {
  daily: ['ไพ่ประจำวัน'], heart: ['เสียงในใจน้อง'], monthly: PHASES,
  compat: ['ใจน้อง', 'ใจเจ้าของ', 'สายใยของเรา'], bday: ['ปีที่ผ่านมา', 'ปีใหม่ของน้อง', 'พรวันเกิด']
};
const LBL = (i) => (LABELS[S.mode] || [])[i] || '';
/** A card's reading in the orientation it was drawn, in the words written for this pet's species
 *  (cat or dog — see readings.js). `act` is the card's own to-do for the owner. */
function R(a, rev, sp) {
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
const madame = (act) => `${act} นะจ๊ะ`;
// owner tips for the ten positions of the big spread, built around the card's own to-do
const POS_TIP = [
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
const face = (a, w, rev) => (rev ? `<div class="rev">${cardHTML(a, w)}</div>` : cardHTML(a, w));
const orient = (rev) => `<span class="orient ${rev ? 'rv' : 'up'}">${rev ? 'กลับหัว' : 'ตั้งตรง'}</span>`;
// Celtic Cross positions in a 322×384 box: [centre x, centre y, rotated]
const SPREAD = [[100, 192], [100, 192, 1], [100, 300], [30, 192], [100, 84], [170, 192], [292, 334], [292, 238], [292, 142], [292, 46]];

/* ------------------------------------------------------------------ household */
const P = () => D.pets.find((p) => p.id === D.activeId) || D.pets[0];   // the pet being read for
const nameOf = (p) => (p.name || '').trim() || 'เจ้าตัวเล็ก';
const dname = () => nameOf(P());
const MAX_PETS = 6;
// once-per-period readings: the key of the current period (celtic has none)
function periodKey(mode, p = P()) {
  if (mode === 'daily' || mode === 'heart') return todayKey();
  if (mode === 'monthly' || mode === 'compat') return monthKey();
  if (mode === 'bday') { const w = bdayWindow(p.petBirthday); return w.open ? w.year : ''; }
  return '';
}
const doneFor = (mode, p = P()) => { const k = periodKey(mode, p); const r = p.done[mode]; return k && r && r.key === k ? r : null; };
const hasReward = (id) => { const r = REWARDS.find((x) => x.id === id); return !!r && D.streak.days >= r.days; };
// a streak is still alive if the last daily reading was today or yesterday
const liveStreak = () => (D.streak.last === todayKey() || D.streak.last === yesterdayKey() ? D.streak.count : 0);
function markDay() {
  const st = D.streak, t = todayKey();
  if (st.last === t) return false;
  st.count = st.last === yesterdayKey() ? st.count + 1 : 1;
  st.last = t; st.days += 1; st.best = Math.max(st.best, st.count);
  return true;
}
function newlyUnlocked() {
  const fresh = REWARDS.filter((r) => r.days > 0 && D.streak.days >= r.days && !D.rewardsSeen.includes(r.id));
  D.rewardsSeen = D.rewardsSeen.concat(fresh.map((r) => r.id));
  return fresh;
}
// repair older saves: a once-per-period reading that was opened always belongs in the album
D.pets.forEach((p) => Object.values(p.done).forEach((r) => (r.arts || []).forEach((a) => { if (!D.collected.includes(a)) D.collected.push(a); })));
setBack(D.back);

/* ------------------------------------------------------------------ stage */
const stage = document.getElementById('stage');
stage.innerHTML = `
<div id="world">
<div id="room" class="layer room hidden"><img id="roomArt" class="painted-room" src="${interior}" alt="มาดามโมจิอยู่หลังโต๊ะ สมุดดวงทางซ้าย ลูกแก้วตรงกลาง และอัลบั้มไพ่ทางขวา" fetchpriority="high"><div id="deco" class="deco" aria-hidden="true"></div></div>
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
<div id="streetCta" class="panel on street-cta"><button class="btn-primary pulse" data-act="door">${ICON.paw} เข้าร้านดูดวง</button><button id="installBtn" class="dl-btn install-btn" data-act="install" hidden>${ICON.phone} ติดตั้งร้านไว้บนหน้าจอ</button><button id="dlBtn" class="dl-btn" data-act="download" hidden>${ICON.dl} ดาวน์โหลดไว้เล่นในเครื่อง</button></div>

<div id="flash"></div>
<div id="veil" class="veil off"></div>

<div id="hud" class="panel off hud">
  <button class="round-btn" data-act="back" id="backBtn" aria-label="ย้อนกลับ">${ICON.back}</button>
  <div id="hudMid"></div>
  <div class="hud-right">
    <button class="music-btn" data-act="music" aria-label="เปิดหรือปิดเพลง"></button>
    <button class="pet-chip" data-act="editPet" aria-label="แก้ไขข้อมูลน้อง"><span id="chipFace"></span><span id="chipName"></span></button>
  </div>
</div>
<button class="music-btn street-music" data-act="music" aria-label="เปิดหรือปิดเพลง"></button>
<audio id="bgm" loop preload="none" src="./moonpetalmedia-parlor-of-secrets-vintage-witchy-tarot-instrumental-537898.mp3"></audio>

<div id="hint" class="panel off hint">${ICON.ball}<div id="hintText"></div></div>

<div id="greet" class="panel off greet">
  <button data-act="next" aria-label="ไปต่อ" class="dialog">
    <span class="nametag">มาดามโมจิ</span>
    <span id="greetLine"></span>
    <span class="dialog-more"><span id="greetHint"></span>${ICON.tri}</span>
  </button>
</div>

<div id="petSheet" class="panel sheet off bottom-sheet">
  <button class="sheet-close" id="petClose" data-act="back" aria-label="ปิด">${ICON.close}</button>
  <div class="handle"></div>
  <h2 id="petTitle" class="sheet-head">น้องคือใครเอ่ย?</h2>
  <div id="petTabs" class="pet-tabs"></div>
  <div id="petGrid" class="grid2 pet-grid"></div>
  <label for="petName" class="field">ชื่อน้อง
    <input id="petName" maxlength="20" placeholder="เช่น ข้าวปั้น" autocomplete="off">
  </label>
  <label for="petBirthday" class="field">วันเกิดน้อง
    <input id="petBirthday" type="date" autocomplete="off">
  </label>
  <label for="ownerBirthday" class="field">วันเกิดเจ้าของ <small class="field-sub">ใช้กับน้องทุกตัว</small>
    <input id="ownerBirthday" type="date" autocomplete="off">
  </label>
  <p class="note bd-note">${ICON.cake}ใส่วันเกิดเพื่อปลดล็อก “ดวงสมพงษ์น้องกับเจ้าของ” และ “ดวงวันเกิดน้อง” แล้วมาดามจะอวยพรให้ในวันเกิดด้วยนะ</p>
  <button class="btn-primary" data-act="toHub" id="petCta">เข้าไปในร้าน</button>
  <button class="link-btn" data-act="removePet" id="removeBtn">ลบน้องตัวนี้</button>
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
  <button class="sheet-close" data-act="back" aria-label="ปิด">${ICON.close}</button>
  <div class="handle"></div>
  <h2 class="sheet-head">จะดูดวงแบบไหนดี?</h2>
  <div id="modePets" class="pet-tabs"></div>
  <div class="grid2">
    <button class="opt mode-btn daily" data-act="daily">
      <span class="mode-art"><span data-bk="60" style="position:absolute;left:30px;top:8px;transform:rotate(-6deg)"></span>${ICON.sun}</span>
      <b>ดวงรายวัน</b><small>ไพ่ 1 ใบ<br><span id="todayShort"></span></small><span id="dailyBadge" class="badge"></span><span class="countdown" id="dailyCd"></span>
    </button>
    <button class="opt mode-btn monthly" data-act="monthly">
      <span class="mode-art">
        <span data-bk="52" style="position:absolute;left:8px;top:16px;transform:rotate(-14deg)"></span>
        <span data-bk="52" style="position:absolute;left:60px;top:16px;transform:rotate(14deg)"></span>
        <span data-bk="52" style="position:absolute;left:34px;top:6px"></span>
      </span>
      <b>ดวงรายเดือน</b><small>ไพ่ 3 ใบ · ต้น กลาง ปลาย<br><span id="monthLabel"></span></small><span id="monthlyBadge" class="badge"></span><span class="countdown" id="monthlyCd"></span>
    </button>
  </div>
  <button class="opt mode-btn celtic" data-act="celtic">
    <span class="celtic-art" aria-hidden="true">${[[22, 34], [22, 34, 1], [22, 68], [0, 34], [22, 0], [44, 34], [76, 72], [76, 48], [76, 24], [76, 0]].map((p) => `<i data-bk="19" style="left:${p[0]}px;top:${p[1]}px${p[2] ? ';transform:rotate(90deg)' : ''}"></i>`).join('')}</span>
    <span class="celtic-text"><b>ดวงชะตารวม 10 ใบ</b><small>ผัง Celtic Cross ดูลึกทุกด้าน ตั้งแต่รากฐาน ใจกลาง จนถึงผลลัพธ์ · เปิดได้ทุกเมื่อ (ไม่นับเข้าอัลบั้มไพ่)</small></span>
  </button>
  <div class="grid2">
    <button class="opt mode-row compat" data-act="compat" id="compatBtn"><span class="mode-ico">${ICON.hearts}</span><span class="mode-txt"><b>ดวงสมพงษ์</b><small id="compatSub"></small></span></button>
    <button class="opt mode-row bday" data-act="bday" id="bdayBtn"><span class="mode-ico">${ICON.cake}</span><span class="mode-txt"><b>ดวงวันเกิด</b><small id="bdaySub"></small></span></button>
  </div>
  <button class="opt mode-row heart" data-act="heart" id="heartBtn"><span class="mode-ico">${ICON.bubble}</span><span class="mode-txt"><b>ดวงเสียงในใจน้อง</b><small id="heartSub"></small></span></button>
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
<div id="shareBox"></div>
<div id="installBox"></div>
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
  b.innerHTML = '<div class="lift" data-bk="84"></div>';
  $('fan').appendChild(b);
}

// the ten-card spread lets you choose from the whole deck, laid out in overlapping rows
for (let i = 0; i < 78; i++) {
  const b = document.createElement('button');
  b.className = 'spread-pick';
  b.dataset.act = 'pick';
  b.dataset.i = i;
  b.setAttribute('aria-label', 'ไพ่ใบที่ ' + (i + 1) + ' จาก 78');
  b.innerHTML = '<div class="lift" data-bk="44"></div>';
  $('deck78').appendChild(b);
}

// face-down cards drawn once into the page follow the card back chosen in the rewards
function refreshBacks() {
  document.querySelectorAll('[data-bk]').forEach((el) => { el.innerHTML = cardHTML('back', Number(el.dataset.bk)); });
}
refreshBacks();

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
const cdHTML = (txt) => `<span class="cd-l">${ICON.clock}เปิดใหม่ได้ใน</span><b>${txt}</b>`;
function tickCountdown() {
  if (todayKey() !== lastDayKey) { lastDayKey = todayKey(); render(); return; } // a new day or month unlocks readings
  const readToday = !!doneFor('daily');
  const readMonth = !!doneFor('monthly');
  const dTxt = untilText(nextDay()), mTxt = untilText(nextMonth());
  $('dailyCd').innerHTML = readToday ? cdHTML(dTxt) : '';
  $('monthlyCd').innerHTML = readMonth ? cdHTML(mTxt) : '';
  $('todayStatus').textContent = readToday ? 'รายวันใหม่ใน ' + dTxt.replace(/:\d\d$/, '') : `น้อง${dname()}ยังไม่ได้เปิดไพ่`;
  const cd = document.getElementById('resultCd');
  if (cd) cd.textContent = S.mode === 'monthly' || S.mode === 'compat' ? mTxt : dTxt;
}
setInterval(tickCountdown, 1000);

/* ------------------------------------------------------------------ Madame remembers */
// Lines Madame says when a known visitor walks back in.
function greetingLines() {
  const p = P(), name = dname(), now = new Date(), h = now.getHours();
  const tod = h < 11 ? 'อรุณสวัสดิ์' : h < 17 ? 'สวัสดียามบ่าย' : 'ค่ำนี้ดาวสวยเชียว';
  const hello = [
    `เมี้ยว~ ${tod}จ้ะ น้อง${name} กลับมาหาข้าอีกแล้ว`,
    `${tod}จ้ะ ข้ารู้อยู่แล้วว่าวันนี้น้อง${name}ต้องแวะมา ลูกแก้วกระซิบบอก`,
    `อ้าว น้อง${name} มาแล้ว! ${tod}จ้ะ เข้ามานั่งก่อน`,
    p.pet === 'dog' ? `${tod}จ้ะ ได้ยินเสียงหางน้อง${name}กระดิกมาแต่ไกลเลย` : `${tod}จ้ะ น้อง${name} ย่องมาเงียบ ๆ แบบแมวแท้ ข้าก็ยังรู้นะ`
  ];
  const lines = [hello[now.getDate() % hello.length]];
  const extra = [];
  // birthdays come first
  if (isBirthday(p.petBirthday, now)) {
    const age = ageText(p.petBirthday, now);
    extra.push(`วันนี้วันเกิดน้อง${name}! สุขสันต์วันเกิด${age ? 'ครบ ' + age : ''}จ้ะ ข้าเตรียม “ดวงวันเกิด” ไว้ให้แล้ว`);
  } else {
    const dd = daysToBirthday(p.petBirthday, now);
    if (dd > 0 && dd <= 7) extra.push(`อีก ${dd} วันก็วันเกิดน้อง${name}แล้วนะ ข้าจะเตรียมดวงวันเกิดไว้รอ`);
  }
  D.pets.filter((q) => q.id !== p.id && isBirthday(q.petBirthday, now)).forEach((q) => extra.push(`วันนี้วันเกิดน้อง${nameOf(q)}ด้วยนะ! อย่าลืมพาน้องมาเปิดดวงวันเกิดล่ะ`));
  if (isBirthday(D.ownerBirthday, now)) extra.push('แล้ววันนี้ก็เป็นวันเกิดของเจ้าด้วยนี่! ขอให้เจ้ากับน้องมีความสุขมาก ๆ นะจ๊ะ');
  // yesterday's card
  const y = p.journal.find((e) => e.mk === 'daily' && e.id.endsWith(yesterdayKey()));
  if (y && INFO[y.cards[0]]) extra.push(`เมื่อวานน้องได้${INFO[y.cards[0]].th} “${y.key}” เป็นอย่างที่ไพ่บอกไหมจ๊ะ`);
  // streak
  const st = D.streak;
  if (st.last === todayKey()) extra.push(`วันนี้เปิดไพ่ไปแล้ว มาหาข้าต่อเนื่อง ${st.count} วันเลยนะ เก่งมาก`);
  else if (st.last === yesterdayKey() && st.count > 1) extra.push(`มาหาข้าติดกัน ${st.count} วันแล้ว วันนี้เปิดไพ่ต่อเป็นวันที่ ${st.count + 1} กันเถอะ`);
  else if (st.last === yesterdayKey()) extra.push('เมื่อวานก็มาหาข้า วันนี้เปิดไพ่อีกครั้งจะได้นับเป็น 2 วันติดกันเลยนะ');
  else if (st.days > 0) extra.push('หายไปหลายวันเลย ข้าคิดถึงนะ วันนี้มาเริ่มนับวันใหม่กันจ้ะ');
  const nr = nextReward(st.days);
  if (nr && st.last !== todayKey()) extra.push(`อีก ${nr.days - st.days} วันจะได้ “${nr.name}” นะ`);
  // other pets still waiting
  const waiting = D.pets.filter((q) => q.id !== p.id && !doneFor('daily', q)).map(nameOf);
  if (waiting.length) extra.push(`วันนี้น้อง${waiting.slice(0, 2).join(' กับน้อง')} ยังไม่ได้เปิดไพ่เลยนะ`);
  return lines.concat(extra.slice(0, 3));
}

/* ------------------------------------------------------------------ flow */
function go(step, extra) {
  Object.assign(S, { step, entered: false, detail: null, confirmReset: false, confirmUnsave: false, confirmRemove: false, toast: '' }, extra || {});
  render();
}
function toast(msg) { S.toast = msg; render(); }
function syncForm() {
  const p = P();
  p.name = $('petName').value.trim();
  p.petBirthday = $('petBirthday').value;
  D.ownerBirthday = $('ownerBirthday').value;
}
function fillForm() {
  const p = P();
  $('petName').value = p.name || '';
  $('petBirthday').value = p.petBirthday || '';
  $('ownerBirthday').value = D.ownerBirthday || '';
}

const ACT = {
  download() { downloadApp(); },
  async install() {
    const k = installKind();
    if (k === 'prompt') { const ok = await promptInstall(); if (ok) persistStorage(); render(); return; }
    if (k) { S.install = k; render(); }
  },
  installClose() { S.install = null; render(); },
  installLater() { D.installSnooze = todayKey(); persist(); render(); },
  openBrowser() { openExternal(); },
  music() { D.music = !musicOn(); persist(); syncMusic(); },
  door() {
    if (S.step !== 'street' || S.door) return;
    S.door = true; render();
    later(() => go('greet', { line: 0, lines: D.met ? greetingLines() : LINES }), 850);
  },
  next() {
    if (S.line < S.lines.length - 1) { S.line++; render(); }
    else if (D.met) go('hub', { entered: true });
    else { fillForm(); go('pet'); }
  },
  back() {
    const to = { greet: 'street', pet: D.met ? 'hub' : 'greet', hub: 'street', mode: 'hub', shuffle: 'mode', reveal: 'mode', result: 'hub', journal: 'hub', album: 'hub' }[S.step];
    if (!to) return;
    if (S.step === 'pet') syncForm();
    if (to === 'street') go('street', { door: false, line: 0 });
    else if (to === 'greet') go('greet', { line: S.lines.length - 1 });
    else go(to);
  },
  editPet() { if (S.step !== 'pet' && S.step !== 'street') { fillForm(); go('pet'); } },
  pet(arg) { if (arg !== 'cat' && arg !== 'dog') return; P().pet = arg; persist(); render(); },
  switchPet(arg) {
    if (arg === D.activeId) return;
    if (S.step === 'pet') syncForm();
    D.activeId = arg; persist();
    if (S.step === 'pet') { fillForm(); go('pet'); } else render();
  },
  addPet() {
    if (D.pets.length >= MAX_PETS) return;
    syncForm();
    const p = store.newPet();
    D.pets.push(p); D.activeId = p.id; persist();
    fillForm(); go('pet');
    later(() => $('petName').focus(), 60);
  },
  removePet() {
    if (D.pets.length < 2) return;
    if (!S.confirmRemove) { S.confirmRemove = true; render(); return; }
    D.pets = D.pets.filter((p) => p.id !== D.activeId);
    D.activeId = D.pets[0].id; persist();
    fillForm(); go('pet');
  },
  toHub() {
    syncForm();
    D.met = true; persist(); persistStorage(); go('hub');
  },
  reset() {
    if (!S.confirmReset) { S.confirmReset = true; render(); return; }
    store.clear(); Object.assign(D, store.load());
    setBack(D.back); refreshBacks(); fillForm();
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
  celtic() { choose('celtic'); },
  compat() { choose('compat'); },
  bday() { choose('bday'); },
  heart() { choose('heart'); },
  pick(arg) {
    const i = Number(arg);
    if (S.step !== 'shuffle' || !S.dealt || S.picks.includes(i) || S.picks.length >= need()) return;
    const pos = S.picks.length;
    S.picks.push(i); S.arts.push(S.deck[i]);
    // position 2 of the ten-card spread is always read upright (per the source book);
    // birthday cards are a blessing, so they are always read upright too
    S.revs.push((S.mode === 'celtic' && pos === 1) || S.mode === 'bday' ? false : Math.random() < REV_CHANCE);
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
    go('result', { newCards: S.newCards.slice(), newRewards: S.newRewards.slice(), streakUp: S.streakUp, repeat: false });
  },
  save() {
    // readings are saved automatically; removing one needs a second tap
    const id = entryId();
    const p = P();
    const saved = p.journal.some((e) => e.id === id);
    if (!saved) { p.journal = [makeEntry()].concat(p.journal); S.confirmUnsave = false; }
    else if (!S.confirmUnsave) S.confirmUnsave = true;
    else { p.journal = p.journal.filter((e) => e.id !== id); S.confirmUnsave = false; }
    persist(); render();
  },
  otherMode() { go('mode'); },
  hub() { go('hub'); },
  tab(arg) { S.albumTab = arg; render(); },
  open(arg) { S.detail = arg; render(); },
  close() { S.detail = null; render(); },
  // rewards
  useBack(arg) {
    const r = REWARDS.find((x) => x.id === arg);
    if (!r || r.type !== 'back' || !hasReward(arg)) return;
    D.back = arg; setBack(arg); refreshBacks(); persist(); render();
  },
  toggleDeco(arg) {
    if (!hasReward(arg)) return;
    D.deco = D.deco.includes(arg) ? D.deco.filter((x) => x !== arg) : D.deco.concat(arg);
    persist(); render();
  },
  // share image
  async share() {
    if (S.share && S.share.busy) return;
    S.share = { busy: true }; render();
    try {
      const blob = await makeShareImage(shareOpts());
      S.share = { url: URL.createObjectURL(blob), blob };
    } catch (e) {
      S.share = { error: true };
    }
    render();
  },
  async shareSend() {
    const sh = S.share;
    if (!sh || !sh.blob) return;
    const file = new File([sh.blob], shareName(), { type: 'image/png' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'ร้านไพ่เหมียวจันทร์', text: `ดวงของน้อง${dname()} จากร้านไพ่เหมียวจันทร์` });
        return;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
    ACT.shareSave();
  },
  shareSave() {
    const sh = S.share;
    if (!sh || !sh.url) return;
    const a = document.createElement('a');
    a.href = sh.url; a.download = shareName();
    document.body.appendChild(a); a.click(); a.remove();
  },
  shareClose() {
    if (S.share && S.share.url) URL.revokeObjectURL(S.share.url);
    S.share = null; render();
  }
};

function choose(mode) {
  const p = P();
  if (mode === 'compat' && !(p.petBirthday && D.ownerBirthday)) {
    fillForm(); go('pet', { toast: 'ใส่วันเกิดน้องและวันเกิดเจ้าของก่อนนะ แล้วค่อยกลับไปดูดวงสมพงษ์กัน' }); return;
  }
  if (mode === 'bday') {
    if (!p.petBirthday) { fillForm(); go('pet', { toast: 'ใส่วันเกิดน้องก่อนนะ ดวงวันเกิดจะเปิดให้ในช่วงวันเกิดของน้อง' }); return; }
    const w = bdayWindow(p.petBirthday);
    if (!w.open) { toast(`ดวงวันเกิดเปิดได้ตั้งแต่วันเกิดน้อง${dname()} ไปอีก ${BDAY_WINDOW} วัน · อีก ${w.until} วันนะจ๊ะ`); return; }
  }
  if (mode === 'heart' && !hasReward('heart')) {
    const r = REWARDS.find((x) => x.id === 'heart');
    toast(`ดวงนี้จะปลดล็อกเมื่อมาเปิดไพ่รายวันครบ ${r.days} วัน · ตอนนี้ ${D.streak.days} วันแล้วจ้ะ`); return;
  }
  const pk = periodKey(mode);
  const readingId = mode === 'celtic' ? `celtic-${p.id}-${Date.now()}` : `${mode}-${p.id}-${pk}`;
  const done = doneFor(mode);
  if (done) {
    go('result', { mode, readingId, arts: done.arts.slice(), revs: (done.revs || []).slice(), repeat: true, newCards: [], newRewards: [], streakUp: 0 });
    return;
  }
  go('shuffle', { mode, readingId, deck: shuffle(ARTS), picks: [], arts: [], revs: [], flipped: [], dealt: false, repeat: false, newCards: [], newRewards: [], streakUp: 0 });
  later(() => { S.dealt = true; render(); }, 380);
}

/** Runs once, the moment the last card of a reading is turned over: everything is saved
 *  right away, so leaving the screen early never loses the reading or its cards. */
function completeReading() {
  const p = P();
  const pk = periodKey(S.mode);
  if (pk) p.done[S.mode] = { key: pk, arts: S.arts.slice(), revs: S.revs.slice() };
  // only the once-per-period readings fill the album; the ten-card spread can be opened any time
  const fresh = S.mode === 'celtic' ? [] : S.arts.filter((a) => !D.collected.includes(a));
  D.collected = D.collected.concat(fresh);
  S.newCards = fresh;
  S.streakUp = S.mode === 'daily' && markDay() ? D.streak.count : 0;
  S.newRewards = newlyUnlocked();
  if (!p.journal.some((e) => e.id === entryId())) p.journal = [makeEntry()].concat(p.journal);
  persist();
}

const entryId = () => S.readingId;
function makeEntry() {
  const d = new Date();
  const rs = S.arts.map((a, i) => R(a, S.revs[i]));
  const lead = NEED[S.mode] === 3 ? rs[1] : rs[0];
  const monthly = S.mode === 'monthly' || S.mode === 'compat';
  return {
    id: entryId(), mk: S.mode, day: d.getDate(), month: d.getMonth(), year: d.getFullYear(),
    date: monthly ? thDate(d, { month: 'short', year: '2-digit' }, monthKey()) : thDate(d, { day: 'numeric', month: 'short' }, todayKey()),
    mode: MODE_TH[S.mode], key: lead.key, bg: rs[0].bg, cards: S.arts.slice(), revs: S.revs.slice()
  };
}

stage.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act]');
  if (!t || !stage.contains(t)) return;
  const fn = ACT[t.dataset.act];
  if (fn) fn(t.dataset.arg !== undefined ? t.dataset.arg : t.dataset.i);
});
$('petName').addEventListener('input', (e) => { P().name = e.target.value; $('chipName').textContent = dname(); });
$('petName').addEventListener('keydown', (e) => { if (e.key === 'Enter') ACT.toHub(); });
$('petBirthday').addEventListener('change', (e) => { P().petBirthday = e.target.value; });
$('ownerBirthday').addEventListener('change', (e) => { D.ownerBirthday = e.target.value; });

/* ------------------------------------------------------------------ render */
// the household row: one chip per pet (+ add button in the pet sheet)
function petTabsHTML(withAdd) {
  if (!withAdd && D.pets.length < 2) return '';
  return D.pets.map((p) => {
    const sel = p.id === D.activeId;
    const dot = !withAdd && !doneFor('daily', p) ? '<i class="wait-dot" title="ยังไม่ได้เปิดไพ่วันนี้"></i>' : '';
    return `<button class="pet-tab${sel ? ' sel' : ''}" data-act="switchPet" data-arg="${p.id}" aria-pressed="${sel}">${petHTML(p.pet, 26)}<span>${esc(nameOf(p))}</span>${dot}</button>`;
  }).join('') + (withAdd && D.met && D.pets.length < MAX_PETS ? `<button class="pet-tab add" data-act="addPet">${ICON.plus}<span>เพิ่มน้อง</span></button>` : '');
}
// twinkling stars / falling petals over the parlour, unlocked as rewards
const DECO_POS = [[8, 12], [22, 6], [37, 15], [52, 5], [66, 13], [81, 7], [93, 18], [14, 30], [31, 26], [58, 24], [76, 29], [89, 36], [5, 45], [45, 36], [70, 42], [97, 52]];
function decoHTML() {
  let h = '';
  if (D.deco.includes('stars') && hasReward('stars')) {
    h += DECO_POS.map(([x, y], i) => `<i class="d-star" style="left:${x}%;top:${y}%;animation-delay:${(i * 0.37) % 2.4}s;transform:scale(${0.6 + (i % 4) * 0.2})"></i>`).join('');
  }
  if (D.deco.includes('petals') && hasReward('petals')) {
    h += DECO_POS.slice(0, 12).map(([x], i) => `<i class="d-petal" style="left:${(x * 7 + i * 13) % 100}%;animation-delay:${(i * 0.83) % 7}s;animation-duration:${7 + (i % 4)}s"></i>`).join('');
  }
  return h;
}

function render() {
  const s = S.step;
  const n = need();
  const p = P();
  const readToday = !!doneFor('daily');
  const readMonth = !!doneFor('monthly');
  const allFlipped = S.arts.length === n && S.flipped.length >= n;
  const d = new Date();

  // scene layers
  stage.dataset.step = s;
  $('streetTitle').hidden = s !== 'street';
  $('street').classList.toggle('gone', s !== 'street');
  onoff($('streetCta'), s === 'street' && !S.door);
  $('installBtn').hidden = !installKind();
  document.querySelector('.street-music').hidden = s !== 'street';
  $('doorL').classList.toggle('open', S.door);
  $('doorR').classList.toggle('open', S.door);
  $('room').className = 'layer room ' + ({ street: 'hidden', shuffle: 'table', reveal: 'table dim', result: 'dim', journal: 'shelfL', album: 'shelfR' }[s] || 'wide');
  setHTML($('deco'), decoHTML());
  setHTML($('flash'), (s === 'greet' && S.line === 0) || (s === 'hub' && S.entered) ? '<div class="flash"></div>' : '');
  onoff($('veil'), s === 'reveal' || s === 'result');
  layout();

  // HUD
  onoff($('hud'), s !== 'street');
  $('backBtn').setAttribute('aria-label', s === 'hub' ? 'ออกจากร้าน' : 'ย้อนกลับ');
  const ORDER = ['mode', 'shuffle', 'reveal', 'result'];
  const idx = ORDER.indexOf(s);
  const place = { greet: 'ร้านไพ่เหมียวจันทร์', pet: 'ร้านไพ่เหมียวจันทร์', hub: 'ห้องมาดามโมจิ', journal: 'ชั้นสมุดดวง', album: 'ตู้ไพ่สะสม' }[s] || '';
  const streak = liveStreak();
  setHTML($('hudMid'), idx >= 0
    ? `<div class="dots">${ORDER.map((o, i) => `<i class="dot" style="width:${i === idx ? 22 : 8}px;background:${i <= idx ? '#7456B3' : '#D9CCEB'}"></i>`).join('')}</div>`
    : `<div class="place">${place}${s === 'hub' && streak ? `<span class="streak-mini" title="มาต่อเนื่อง ${streak} วัน">${ICON.flame}${streak}</span>` : ''}</div>`);
  setHTML($('chipFace'), petHTML(p.pet, 30));
  $('chipName').textContent = dname();

  // hint bubble
  const waiting = D.pets.filter((q) => q.id !== p.id && !doneFor('daily', q)).map(nameOf);
  const shuffleHint = {
    daily: `ตั้งจิตถึงน้อง${dname()} แล้วเลือกไพ่ 1 ใบ`,
    heart: `ตั้งใจฟังเสียงในใจน้อง${dname()} แล้วเลือกไพ่ 1 ใบ`,
    monthly: `เลือกไพ่ 3 ใบ ต้น กลาง ปลายเดือน (${S.picks.length}/3)`,
    compat: `คิดถึงช่วงเวลาดี ๆ ของเจ้ากับน้อง${dname()} แล้วเลือกไพ่ 3 ใบ (${S.picks.length}/3)`,
    bday: `อธิษฐานให้น้อง${dname()} แล้วเลือกไพ่ 3 ใบ (${S.picks.length}/3)`,
    celtic: `ตั้งคำถามเรื่องน้อง${dname()} ในใจ แล้วเลือกไพ่ 10 ใบ (${S.picks.length}/10)`
  }[S.mode];
  const hints = {
    hub: isBirthday(p.petBirthday) ? `สุขสันต์วันเกิดน้อง${dname()}! แตะลูกแก้วเพื่อเปิดดวงวันเกิดได้เลยจ้ะ`
      : !readToday ? `แตะจุดที่ส่องแสงในร้านได้เลย วันนี้น้อง${dname()} ยังไม่ได้ดูดวงนะ`
      : waiting.length ? `น้อง${dname()}ดูดวงวันนี้แล้ว แต่น้อง${waiting[0]}ยังไม่ได้ดูนะ แตะชื่อน้องมุมขวาบนเพื่อสลับ`
      : `ดูดวงวันนี้แล้วนะ น้อง${dname()} จะแวะดูสมุดหรืออัลบั้มก็ได้จ้ะ`,
    pet: D.met ? 'แก้ข้อมูล สลับ หรือเพิ่มน้องในบ้านได้ที่นี่จ้ะ' : 'เจ้าตัวเล็กของเจ้าชื่ออะไร เป็นน้องอะไรเอ่ย?',
    mode: `น้อง${dname()} อยากรู้ดวงแบบไหนดีจ๊ะ`,
    shuffle: shuffleHint,
    reveal: allFlipped ? 'ไพ่พูดแล้ว… มาฟังคำทำนายกันเถอะ' : n === 10 ? 'แตะไพ่ทีละใบตามลำดับ หรือเปิดทั้งหมดพร้อมกันก็ได้จ้ะ' : 'แตะไพ่เพื่อเปิดดวงชะตา'
  };
  const hint = S.toast || hints[s];
  onoff($('hint'), !!hint);
  $('hint').classList.toggle('toast', !!S.toast);
  if (hint) $('hintText').textContent = hint;

  // greet
  onoff($('greet'), s === 'greet');
  setHTML($('greetLine'), `<span class="lineIn line" data-l="${S.line}">${esc(S.lines[S.line] || '')}</span>`);
  $('greetHint').textContent = S.line < S.lines.length - 1 ? 'แตะเพื่อไปต่อ' : D.met ? 'แตะเพื่อเข้าร้าน' : 'แตะเพื่อแนะนำน้อง';

  // pet sheet
  onoff($('petSheet'), s === 'pet');
  $('petTitle').textContent = D.met ? 'น้อง ๆ ในบ้าน' : 'น้องคือใครเอ่ย?';
  setHTML($('petTabs'), D.met ? petTabsHTML(true) : '');
  setHTML($('petGrid'), PETS.map((k) => `<button class="opt pet-opt${p.pet === k.k ? ' sel' : ''}" data-act="pet" data-arg="${k.k}" aria-pressed="${p.pet === k.k}">${petHTML(k.k, 64)}<span>${k.th}</span></button>`).join(''));
  $('petCta').textContent = D.met ? 'บันทึก' : 'เข้าไปในร้าน';
  $('petClose').hidden = !D.met;
  $('removeBtn').style.display = D.met && D.pets.length > 1 ? '' : 'none';
  $('removeBtn').textContent = S.confirmRemove ? `แตะอีกครั้งเพื่อลบน้อง${dname()} และสมุดดวงของน้อง` : `ลบน้อง${dname()}ออกจากบ้าน`;
  $('resetBtn').style.display = D.met ? '' : 'none';
  $('resetBtn').textContent = S.confirmReset ? 'แตะอีกครั้งเพื่อยืนยันการล้างข้อมูล' : 'ล้างข้อมูลทั้งหมด';

  // hub
  onoff($('hub'), s === 'hub');
  onoff($('spots'), s === 'hub');
  $('journalCount').textContent = p.journal.length + ' บันทึก';
  $('albumCount').textContent = D.collected.length + '/78 ใบ';

  // mode
  onoff($('modeSheet'), s === 'mode');
  setHTML($('modePets'), petTabsHTML(false));
  $('todayShort').textContent = thDate(d, { weekday: 'short', day: 'numeric', month: 'short' }, 'วันนี้');
  $('monthLabel').textContent = thDate(d, { month: 'long', year: 'numeric' }, 'เดือนนี้');
  $('dailyBadge').textContent = readToday ? 'เปิดแล้ววันนี้ · แตะดูอีกครั้ง' : '';
  $('monthlyBadge').textContent = readMonth ? 'เปิดแล้วเดือนนี้ · แตะดูอีกครั้ง' : '';
  const hasBd = !!p.petBirthday, hasBoth = hasBd && !!D.ownerBirthday;
  $('compatSub').textContent = !hasBoth ? 'ใส่วันเกิดน้องและเจ้าของเพื่อปลดล็อก' : doneFor('compat') ? 'เปิดแล้วเดือนนี้ · แตะดูอีกครั้ง' : 'ไพ่ 3 ใบ · เดือนละครั้ง';
  $('compatBtn').classList.toggle('locked', !hasBoth);
  const bw = bdayWindow(p.petBirthday);
  $('bdaySub').textContent = !hasBd ? 'ใส่วันเกิดน้องเพื่อปลดล็อก' : doneFor('bday') ? 'เปิดแล้วปีนี้ · แตะดูอีกครั้ง'
    : bw.open ? `เปิดได้แล้ว! อีก ${bw.daysLeft} วันจะปิด` : `เปิดช่วงวันเกิดน้อง · อีก ${bw.until} วัน`;
  $('bdayBtn').classList.toggle('locked', !bw.open);
  $('bdayBtn').classList.toggle('glow', bw.open && !doneFor('bday'));
  const heartR = REWARDS.find((r) => r.id === 'heart');
  const heartOk = hasReward('heart');
  $('heartSub').textContent = !heartOk ? `รางวัลเมื่อมาเปิดไพ่รายวันครบ ${heartR.days} วัน · ตอนนี้ ${D.streak.days}/${heartR.days}` : doneFor('heart') ? 'ฟังแล้ววันนี้ · แตะดูอีกครั้ง' : 'ไพ่ 1 ใบ · น้องอยากบอกอะไรเจ้าของ · วันละครั้ง';
  $('heartBtn').classList.toggle('locked', !heartOk);
  tickCountdown();

  // shuffle
  onoff($('shuffle'), s === 'shuffle');
  const slotW = n === 1 ? 72 : 64;
  $('slots').classList.toggle('mini-spread', n === 10);
  setHTML($('slots'), n === 10
    ? SPREAD.map((q, i) => `<div class="mslot${i < S.picks.length ? ' filled pop' : ''}" style="left:${(q[0] - 28) * 0.42}px;top:${(q[1] - 46) * 0.42}px${q[2] ? ';transform:rotate(90deg)' : ''}">${i < S.picks.length ? cardHTML('back', 24) : `<span>${i + 1}</span>`}</div>`).join('')
    : Array.from({ length: n }, (_, i) =>
      `<div class="slot-col"><div class="slot" style="width:${slotW}px;height:${Math.round(slotW * 1.65)}px">${i < S.picks.length ? `<div class="pop slot-card">${cardHTML('back', slotW)}</div>` : ''}</div><span class="chip">${LBL(i)}</span></div>`).join(''));
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
    ? S.arts.map((a, k) => { const q = SPREAD[k]; return `<div class="rise flip-col spread-card${q[2] ? ' cross' : ''}" style="left:${q[0] - 28}px;top:${q[1] - 46}px;animation-delay:${k * 90}ms"><span class="pos-num">${k + 1}</span>${flipBtn(a, k, 56)}</div>`; }).join('')
    : S.arts.map((a, k) =>
    `<div class="rise flip-col" style="animation-delay:${k * 140}ms">
      <span class="chip">${LBL(k)}</span>
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
    const isSaved = p.journal.some((e) => e.id === entryId());
    saveBtn.innerHTML = !isSaved ? 'บันทึกลงสมุดดวง' : S.confirmUnsave ? 'แตะอีกครั้งเพื่อลบออกจากสมุดดวง' : ICON.check + 'บันทึกในสมุดดวงแล้ว';
    saveBtn.setAttribute('aria-pressed', isSaved);
  }
  onoff($('journal'), s === 'journal');
  setHTML($('journalBody'), s === 'journal' ? journalHTML() : '');
  onoff($('album'), s === 'album');
  setHTML($('albumBody'), s === 'album' ? albumHTML() : '');
  setHTML($('detail'), S.detail ? detailHTML(S.detail) : '');
  setHTML($('shareBox'), S.share ? shareHTML() : '');
  setHTML($('installBox'), S.install ? installHTML() : '');
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

const REPEAT_TH = {
  daily: 'วันนี้น้องเปิดไพ่ไปแล้ว นี่คือไพ่ประจำวันของน้องจ้ะ',
  heart: 'วันนี้ฟังเสียงในใจน้องไปแล้ว นี่คือไพ่ของวันนี้จ้ะ',
  monthly: 'เดือนนี้น้องเปิดไพ่ไปแล้ว นี่คือดวงประจำเดือนของน้องจ้ะ',
  compat: 'เดือนนี้ดูดวงสมพงษ์ไปแล้ว นี่คือไพ่ของเดือนนี้จ้ะ',
  bday: 'ดวงวันเกิดปีนี้เปิดไปแล้ว นี่คือไพ่วันเกิดของน้องจ้ะ'
};
function resultTitle(d) {
  return {
    daily: thDate(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, 'วันนี้'),
    heart: 'เสียงในใจน้อง · ' + thDate(d, { day: 'numeric', month: 'long' }, 'วันนี้'),
    monthly: 'ดวงประจำเดือน' + thDate(d, { month: 'long', year: 'numeric' }, ''),
    compat: 'ดวงสมพงษ์ประจำเดือน' + thDate(d, { month: 'long', year: 'numeric' }, ''),
    bday: 'ดวงวันเกิดประจำปี ' + thDate(d, { year: 'numeric' }, ''),
    celtic: 'ดวงชะตารวม 10 ใบ · ' + thDate(d, { day: 'numeric', month: 'short' }, '')
  }[S.mode];
}
const phaseHTML = (rs) => rs.map((x, k) => `<div class="lineIn phase" style="background:${x.bg};animation-delay:${k * 120}ms">${thumb(x, 56)}<div><div class="muted">${LBL(k)} · ${x.th} ${orient(x.rev)}</div><div class="mid">${x.key}</div><div class="body">${x.what}</div><div class="body soft">${x.mean}</div></div></div>`).join('');

function resultHTML() {
  const n = need();
  const p = P();
  const rs = S.arts.filter((a) => INFO[a]).map((a, i) => R(a, S.revs[i]));
  if (rs.length < n) return `<div class="res"><h2>ไพ่ยังไม่ครบ</h2><div class="body">ลองเลือกไพ่ใหม่อีกครั้งนะจ๊ะ</div><button class="btn-primary" data-act="otherMode">กลับไปเลือกแบบดูดวง</button></div>`;
  const first = rs[0], mid = rs[Math.floor(rs.length / 2)], last = rs[rs.length - 1];
  const d = new Date();
  let h2 = `คำทำนายของน้อง${esc(dname())}`;
  let body = '';
  if (S.mode === 'heart') {
    h2 = `น้อง${esc(dname())}อยากบอกว่า…`;
    body = `<div class="lineIn heart-talk">${petHTML(p.pet, 64)}<div class="bubble"><div class="quote">“${HEART[first.group][first.rev ? 1 : 0]}”</div></div></div>
      <div class="main-card" style="background:${first.bg}">${thumb(first, 80)}<div><div class="muted">${first.th} ${orient(first.rev)}</div><div class="big">${first.key}</div></div></div>
      <div class="box story"><div class="muted strong">สิ่งที่น้องกำลังรู้สึก</div><div class="body">${first.what}</div><div class="body">${first.mean}</div></div>
      ${adviceHTML('มาดามโมจิแปลให้เจ้าของ', madame(first.act))}`;
  } else if (n === 1) {
    body = `<div class="lineIn main-card" style="background:${first.bg}">${thumb(first, 96)}<div><div class="muted">${first.th} ${orient(first.rev)}</div><div class="big">${first.key}</div></div></div>
      <div class="box story"><div class="muted strong">น้องเป็นแบบนี้</div><div class="body">${first.what}</div><div class="body">${first.mean}</div></div>
      ${statsHTML(rs)}${luckyHTML(first)}
      ${adviceHTML('มาดามโมจิฝากบอกเจ้าของ', madame(first.act))}`;
  } else if (S.mode === 'compat') {
    h2 = `น้อง${esc(dname())} กับเจ้าของ`;
    const ci = compatInfo(p.petBirthday, D.ownerBirthday, rs);
    body = (ci ? `<div class="lineIn compat-box">
        <div class="compat-pair">${petHTML(p.pet, 54)}<span class="compat-heart">${ICON.hearts}</span><span class="owner-ico">${ICON.person}</span></div>
        <div class="compat-score"><b>${ci.score}%</b><span>${ci.title}</span></div>
        <div class="track"><div class="bar" style="width:${ci.score}%;background:linear-gradient(90deg,#F2A7C0,#B592E0)"></div></div>
        <div class="body">${ci.text}</div>
      </div>
      <div class="grid2">
        <div class="box sign-box"><div class="muted">น้อง${esc(dname())}</div><b>ราศี${ci.pet.name} · ธาตุ${EL_TH[ci.pet.el]}</b><div class="body soft">${ci.pet.trait}</div></div>
        <div class="box sign-box"><div class="muted">เจ้าของ</div><b>ราศี${ci.owner.name} · ธาตุ${EL_TH[ci.owner.el]}</b><div class="body soft">${ci.owner.trait}</div></div>
      </div>` : '') + phaseHTML(rs) + adviceHTML('สายใยของเจ้ากับน้องต้องการ', madame(last.act));
  } else if (S.mode === 'bday') {
    h2 = `ดวงวันเกิดน้อง${esc(dname())}`;
    const age = ageText(p.petBirthday, d);
    body = `<div class="lineIn bday-box">${ICON.cake}<div><div class="big">สุขสันต์วันเกิดน้อง${esc(dname())}${age ? ' ครบ ' + age : ''}!</div><div class="body">ข้าเปิดไพ่ย้อนดูปีที่ผ่านมา มองปีใหม่ของน้อง และขอพรให้ด้วยนะจ๊ะ · ไพ่วันเกิดอ่านแบบตั้งตรงทั้งหมด เพราะเป็นไพ่อวยพร</div></div></div>` +
      phaseHTML(rs) + luckyHTML(mid) + adviceHTML('พรวันเกิดจากมาดามโมจิ', BLESS[last.group]);
  } else if (n === 3) {
    body = `<div class="theme"><div class="muted">ธีมของเดือน</div><div class="big">${mid.key}</div></div>` +
      phaseHTML(rs) + statsHTML(rs) + luckyHTML(first) + adviceHTML('มาดามโมจิฝากบอกเจ้าของ', madame(last.act));
  } else {
    const POS = POSITIONS;
    body = `<div class="theme"><div class="muted">หัวใจของเรื่อง · ใบที่ 1 และ 2</div><div class="big">${rs[0].key}</div><div class="body">ท่ามกลางแรงที่เข้ามา: ${rs[1].key}</div></div>
      <div class="theme mint"><div class="muted">ทิศทางสุดท้าย · ใบที่ 10</div><div class="big">${rs[9].key}</div></div>
      <div class="spread-mini">${rs.map((x, k) => { const q = SPREAD[k]; return `<div class="spread-card${q[2] ? ' cross' : ''}" style="left:${q[0] - 28}px;top:${q[1] - 46}px"><span class="pos-num">${k + 1}</span>${thumb(x, 56)}</div>`; }).join('')}</div>
      <p class="note">ตามตำรา ใบที่ 2 “แรงที่ไขว้เข้ามา” อ่านแบบตั้งตรงเสมอ เพราะเป็นแรงที่เกิดขึ้นจริงตรงหน้า</p>
      ${rs.map((x, k) => `<section class="pos-block lineIn" style="animation-delay:${Math.min(k, 5) * 80}ms">
        <div class="pos-head"><span class="num" style="background:${x.bg}">${k + 1}</span><div><b>${POS[k][0]}</b><div class="muted">${POS[k][2]}</div></div></div>
        <div class="pos-card">${thumb(x, 52)}<div><div class="muted">${x.th} ${orient(x.rev)}</div><div class="mid">${x.key}</div></div></div>
        <div class="body">${POS[k][3]} ${x.what}</div>
        <div class="body soft">${x.mean}</div>
        <div class="owner-tip"><b>คำแนะนำสำหรับเจ้าของ · ${POS[k][4]}</b><div>${POS_TIP[k](x.act)}</div></div>
      </section>`).join('')}
      ${statsHTML(rs)}${luckyHTML(last)}
      ${adviceHTML('มาดามโมจิสรุปให้', madame(last.act))}
      <p class="note">ไพ่จากดวงชะตารวมไม่นับเข้าอัลบั้ม สะสมไพ่ได้จากดวงรายวันและรายเดือนนะจ๊ะ</p>`;
  }
  const monthly = S.mode === 'monthly' || S.mode === 'compat';
  const repeat = S.repeat && REPEAT_TH[S.mode] ? `<div class="notice">${REPEAT_TH[S.mode]}${S.mode === 'bday'
    ? '<div class="notice-cd">เจอกันใหม่ในวันเกิดปีหน้านะจ๊ะ</div>'
    : `<div class="notice-cd">${ICON.clock}<span>เปิดใหม่ได้ใน <b id="resultCd">${untilText(monthly ? nextMonth() : nextDay())}</b></span></div>`}</div>` : '';
  const nr = nextReward(D.streak.days);
  const streakBanner = S.streakUp ? `<div class="pop streak-banner">${ICON.flame}<span><b>${S.streakUp > 1 ? `มาหามาดามต่อเนื่อง ${S.streakUp} วัน!` : 'เริ่มนับวันแรกแล้ว! พรุ่งนี้มาต่อนะ'}</b><small>เปิดไพ่รายวันมาแล้ว ${D.streak.days} วัน${nr ? ` · อีก ${nr.days - D.streak.days} วันได้ “${nr.name}”` : ''}</small></span></div>` : '';
  const rewardBanner = S.newRewards.length ? `<button class="pop new-cards reward" data-act="goJournal">${ICON.gift}<span><b>ปลดล็อกรางวัลใหม่!</b><small>${S.newRewards.map((r) => r.name).join(' · ')} · แตะเพื่อดูในสมุดดวง</small></span></button>` : '';
  return `<div class="res">
    <button class="sheet-close" data-act="back" aria-label="ปิด">${ICON.close}</button>
    <div class="res-head"><div class="muted">${resultTitle(d)}</div>
    <h2>${h2}</h2></div>
    ${repeat}${streakBanner}${rewardBanner}
    ${S.newCards.length ? `<button class="pop new-cards" data-act="goAlbum"><svg class="shine" width="36" height="36" viewBox="0 0 36 36" aria-hidden="true"><path d="M18 3 Q18 18 33 18 Q18 18 18 33 Q18 18 3 18 Q18 18 18 3Z" fill="#F0B955" stroke="#6B5577" stroke-width="2" stroke-linejoin="round"/></svg><span><b>ได้ไพ่ใหม่เข้าอัลบั้ม +${S.newCards.length}</b><small>สะสมแล้ว ${D.collected.length}/78 ใบ · แตะเพื่อดูอัลบั้ม</small></span></button>` : ''}
    ${body}
    ${installNudgeHTML()}
    <button class="btn-share" data-act="share">${ICON.share}<span><b>แชร์ดวงเป็นรูป</b><small>ขนาดพอดีสตอรี่ IG และ LINE</small></span></button>
    <button class="btn-primary" data-act="save" id="saveBtn"></button>
    <div class="grid2"><button class="btn-outline" data-act="otherMode">ดูดวงแบบอื่น</button><button class="btn-outline" data-act="hub">กลับไปในร้าน</button></div>
    <p class="note">คำทำนายเพื่อความบันเทิง หากน้องมีอาการผิดปกติควรปรึกษาสัตวแพทย์</p>
  </div>`;
}

/* ------------------------------------------------------------------ background music */
// On by default. Browsers only allow sound after a tap, so it starts on the first tap in the game
// (usually the shop door). The choice is remembered, and the music pauses while the app is hidden.
const bgm = document.getElementById('bgm');
bgm.volume = 0.25;
const musicOn = () => D.music !== false;
let heard = false; // has the player tapped anything yet
function syncMusic() {
  const play = musicOn() && heard && !document.hidden;
  if (play && bgm.paused) bgm.play().catch(() => {});
  if (!play && !bgm.paused) bgm.pause();
  document.querySelectorAll('.music-btn').forEach((b) => {
    b.innerHTML = musicOn() ? ICON.soundOn : ICON.soundOff;
    b.classList.toggle('off', !musicOn());
    b.setAttribute('aria-pressed', String(musicOn()));
    b.title = musicOn() ? 'ปิดเพลง' : 'เปิดเพลง';
  });
}
stage.addEventListener('pointerdown', () => { if (!heard) { heard = true; syncMusic(); } }, { capture: true });
document.addEventListener('keydown', () => { if (!heard) { heard = true; syncMusic(); } });
document.addEventListener('visibilitychange', syncMusic);
syncMusic();

/* ------------------------------------------------------------------ install (PWA) */
// shown under a finished reading, at most once every 3 days after "ไว้ทีหลัง"
function installNudgeHTML() {
  const k = installKind();
  if (!k) return '';
  if (D.installSnooze && (new Date(todayKey()) - new Date(D.installSnooze)) / 86400000 < 3) return '';
  return `<div class="install-card">${ICON.phone}<span><b>เก็บร้านไว้บนหน้าจอมือถือ</b><small>เปิดหามาดามได้ในแตะเดียว เล่นได้แม้ไม่มีเน็ต และข้อมูลของน้องปลอดภัยกว่าเดิม</small></span>
    <div class="install-acts"><button class="btn-primary small" data-act="install">ติดตั้ง</button><button class="link-btn" data-act="installLater">ไว้ทีหลัง</button></div></div>`;
}
function installHTML() {
  const k = S.install;
  let body;
  if (k === 'ios') {
    body = `<h2>ติดตั้งร้านไว้บนหน้าจอ</h2>
      <ol class="steps">
        <li><span class="step-n">1</span><div>แตะปุ่ม <b>แชร์</b> ${ICON.share} ของ Safari <small>(แถบล่างของจอ · ถ้าใช้ Chrome อยู่มุมขวาบน)</small></div></li>
        <li><span class="step-n">2</span><div>เลื่อนลงแล้วเลือก <b>“เพิ่มไปยังหน้าจอโฮม”</b></div></li>
        <li><span class="step-n">3</span><div>แตะ <b>“เพิ่ม”</b> มุมขวาบน แล้วเปิดร้านจากไอคอนมาดามโมจิได้เลย</div></li>
      </ol>
      <p class="note">เปิดจากไอคอนบนหน้าจอเสมอนะ ข้อมูลของน้องจะไม่ถูก Safari ลบเมื่อไม่ได้เข้าหลายวัน</p>`;
  } else if (isLine) {
    body = `<h2>เปิดในเบราว์เซอร์ก่อนนะ</h2>
      <div class="body">ในแอป LINE ติดตั้งร้านไม่ได้ ต้องเปิดใน Safari หรือ Chrome ก่อน แล้วค่อยเพิ่มไว้บนหน้าจอ</div>
      ${D.met ? '<div class="notice">ข้อมูลที่เล่นในแอป LINE จะไม่ย้ายตามไปที่เบราว์เซอร์ ในเบราว์เซอร์จะเริ่มต้นใหม่จ้ะ</div>' : ''}
      <button class="btn-primary" data-act="openBrowser">เปิดในเบราว์เซอร์</button>`;
  } else {
    body = `<h2>เปิดในเบราว์เซอร์ก่อนนะ</h2>
      <div class="body">แอปนี้ติดตั้งร้านไม่ได้ แตะเมนู <b>⋯</b> มุมขวาบน แล้วเลือก <b>“เปิดในเบราว์เซอร์”</b> จากนั้นค่อยเพิ่มร้านไว้บนหน้าจอ</div>
      ${D.met ? '<div class="notice">ข้อมูลที่เล่นในแอปนี้จะไม่ย้ายตามไปที่เบราว์เซอร์ ในเบราว์เซอร์จะเริ่มต้นใหม่จ้ะ</div>' : ''}`;
  }
  return `<div class="modal install-modal" role="dialog" aria-modal="true" aria-label="ติดตั้งร้านไว้บนหน้าจอ">
    <button class="modal-bg" data-act="installClose" aria-label="ปิด"></button>
    <div class="modal-box install-box"><img class="install-ico" src="./icons/icon-192.png" alt="" width="84" height="84">${body}<button class="link-btn" data-act="installClose">ปิด</button></div>
  </div>`;
}

/* ------------------------------------------------------------------ share image */
function shareOpts() {
  const rs = S.arts.map((a, i) => R(a, S.revs[i]));
  const p = P(), name = dname(), d = new Date();
  let cards, headline, lines;
  if (S.mode === 'celtic') {
    cards = [{ art: rs[0].art, rev: rs[0].rev, label: 'หัวใจของเรื่อง' }, { art: rs[9].art, rev: rs[9].rev, label: 'ทิศทางสุดท้าย' }];
    headline = rs[9].key; lines = [`หัวใจของเรื่อง: ${rs[0].key}`, rs[9].mean];
  } else if (rs.length === 3) {
    cards = rs.map((x, i) => ({ art: x.art, rev: x.rev, label: LBL(i) }));
    if (S.mode === 'compat') {
      const ci = compatInfo(p.petBirthday, D.ownerBirthday, rs);
      headline = ci ? `เข้ากัน ${ci.score}% · ${ci.title}` : rs[2].key;
      lines = ci ? [ci.text] : rs.map((x, i) => `${LBL(i)}: ${x.key}`);
    } else if (S.mode === 'bday') {
      const age = ageText(p.petBirthday, d);
      headline = `สุขสันต์วันเกิด${age ? 'ครบ ' + age : ''}!`; lines = [BLESS[rs[2].group], `ปีใหม่ของน้อง: ${rs[1].key}`];
    } else {
      headline = `ธีมของเดือน: ${rs[1].key}`; lines = rs.map((x, i) => `${LBL(i)}: ${x.key}`);
    }
  } else {
    const x = rs[0];
    cards = [{ art: x.art, rev: x.rev, label: x.th + (x.rev ? ' · กลับหัว' : '') }];
    if (S.mode === 'heart') { headline = `“${HEART[x.group][x.rev ? 1 : 0]}”`; lines = [x.key]; }
    else { headline = x.key; lines = [x.what, `สีมงคล ${x.color} · ของนำโชค ${x.item}`]; }
  }
  const title = { daily: 'ดวงรายวัน', monthly: 'ดวงรายเดือน', celtic: 'ดวงชะตารวม', compat: 'ดวงสมพงษ์', bday: 'ดวงวันเกิด', heart: 'เสียงในใจ' }[S.mode] + `ของน้อง${name}`;
  return {
    title, cards, headline, lines, petKind: p.pet, petName: name, backdrop: interiorPortrait,
    date: thDate(d, { day: 'numeric', month: 'long', year: 'numeric' }, todayKey()),
    footer: /^https?:$/.test(location.protocol) && !/claude/.test(location.host) ? location.host : 'ดูดวงไพ่ยิปซีให้น้องเจ้าตัวเล็ก'
  };
}
const shareName = () => `moonpaw-${S.mode}-${todayKey()}.png`;
function shareHTML() {
  const sh = S.share;
  const inner = sh.busy ? `<div class="share-wait">${ICON.spark}<b>มาดามกำลังวาดรูปให้…</b></div>`
    : sh.error ? '<div class="share-wait"><b>วาดรูปไม่สำเร็จ ลองอีกครั้งนะจ๊ะ</b></div>'
    : `<img class="share-img" src="${sh.url}" alt="รูปคำทำนายสำหรับแชร์">
      <div class="grid2 share-actions"><button class="btn-primary small" data-act="shareSend">${ICON.share}แชร์</button><button class="btn-outline" data-act="shareSave">${ICON.dl} บันทึกรูป</button></div>
      <p class="note">ขนาด 1080×1920 พอดีสตอรี่ IG และ LINE</p>`;
  return `<div class="modal share-modal" role="dialog" aria-modal="true" aria-label="แชร์ดวงเป็นรูป">
    <button class="modal-bg" data-act="shareClose" aria-label="ปิด"></button>
    <div class="modal-box share-box">${inner}<button class="link-btn" data-act="shareClose">ปิด</button></div>
  </div>`;
}

/* ------------------------------------------------------------------ journal + rewards */
function rewardsHTML() {
  const st = D.streak, live = liveStreak(), nr = nextReward(st.days);
  const prev = REWARDS.filter((r) => r.days <= st.days).pop();
  const pct = nr ? Math.round((st.days - prev.days) / (nr.days - prev.days) * 100) : 100;
  const list = REWARDS.map((r) => {
    const ok = st.days >= r.days;
    const pic = r.type === 'back' ? `<span class="rw-pic">${cardHTML('back', 30, r.id)}</span>`
      : `<span class="rw-pic ico">${r.type === 'deco' ? ICON.spark : ICON.bubble}</span>`;
    let act;
    if (!ok) act = `<span class="rw-lock">${r.days} วัน</span>`;
    else if (r.type === 'back') act = D.back === r.id ? '<span class="rw-on">ใช้อยู่</span>' : `<button class="rw-btn" data-act="useBack" data-arg="${r.id}">ใช้ลายนี้</button>`;
    else if (r.type === 'deco') { const on = D.deco.includes(r.id); act = `<button class="rw-btn${on ? ' on' : ''}" data-act="toggleDeco" data-arg="${r.id}" aria-pressed="${on}">${on ? 'เปิดอยู่' : 'เปิดใช้'}</button>`; }
    else act = `<button class="rw-btn" data-act="heart">เปิดดวง</button>`;
    return `<div class="rw-item${ok ? '' : ' locked'}">${pic}<div class="rw-txt"><b>${r.name}</b><small>${ok ? r.desc : `ปลดล็อกเมื่อเปิดไพ่รายวันครบ ${r.days} วัน`}</small></div>${act}</div>`;
  }).join('');
  return `<div class="box streak-box">
      <div class="row">${ICON.flame}<div><div class="big">${live ? `ต่อเนื่อง ${live} วัน` : 'เริ่มนับวันใหม่ได้เลย'}</div><div class="muted">ดีที่สุด ${st.best} วัน · เปิดไพ่รายวันรวม ${st.days} วัน</div></div></div>
      ${nr ? `<div class="muted">อีก ${nr.days - st.days} วันจะได้ “${nr.name}”</div><div class="track"><div class="bar" style="width:${pct}%;background:#F0B955"></div></div>` : '<div class="muted">ปลดล็อกรางวัลครบทุกอย่างแล้ว เก่งมากจ้ะ!</div>'}
    </div>
    <div class="box rewards"><div class="mid">ของรางวัลจากมาดาม</div><div class="muted">นับจากวันที่เปิดไพ่รายวัน (น้องตัวไหนก็ได้) ขาดไปบางวันรางวัลก็ไม่หายนะ</div>${list}</div>`;
}

function journalHTML() {
  const p = P();
  const d = new Date();
  const y = d.getFullYear(), m = d.getMonth(), today = d.getDate();
  const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
  const marked = {};
  p.journal.forEach((e) => { if (e.month === m && e.year === y && (e.mk === 'daily' || e.mode === 'รายวัน')) marked[e.day] = true; });
  let cal = '';
  for (let i = 0; i < first; i++) cal += '<span></span>';
  for (let dd = 1; dd <= days; dd++) cal += `<span class="day${dd === today ? ' today' : ''}${marked[dd] ? ' marked' : ''}">${dd}</span>`;
  const tabs = petTabsHTML(false);
  return `<div class="sheet-body">
    <button class="sheet-close" data-act="back" aria-label="ปิด">${ICON.close}</button>
    <div class="handle"></div>
    <div class="row between sheet-head"><h2>สมุดดวงของน้อง${esc(dname())}</h2><span class="chip pink">${p.journal.length} บันทึก</span></div>
    ${tabs ? `<div class="pet-tabs">${tabs}</div>` : ''}
    ${rewardsHTML()}
    <div class="box"><div class="mid">${thDate(d, { month: 'long', year: 'numeric' }, '')}</div>
      <div class="cal">${['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((w) => `<b>${w}</b>`).join('')}${cal}</div></div>
    ${p.journal.length ? p.journal.map((e) => `<div class="entry" style="background:${e.bg}"><div class="entry-cards">${e.cards.slice(0, 3).map((c, i) => `<button class="card-btn" data-act="open" data-arg="${c}" aria-label="ดูความหมาย">${face(c, 40, e.revs && e.revs[i])}</button>`).join('')}${e.cards.length > 3 ? `<span class="more">+${e.cards.length - 3}</span>` : ''}</div><div><div class="muted">${e.date} · ${e.mode}</div><div class="mid">${e.key}</div></div></div>`).join('')
      : `<div class="empty"><svg width="84" height="64" viewBox="0 0 84 64" aria-hidden="true"><path d="M8 12 Q24 4 42 12 V58 Q24 50 8 58 Z" fill="#F7B6C4" stroke="#6B5577" stroke-width="2.5" stroke-linejoin="round"/><path d="M76 12 Q60 4 42 12 V58 Q60 50 76 58 Z" fill="#FFF6EA" stroke="#6B5577" stroke-width="2.5" stroke-linejoin="round"/></svg><b>สมุดยังว่างอยู่เลย</b><div class="body">ดูดวงเมื่อไหร่ คำทำนายจะถูกบันทึกไว้ที่นี่ให้อัตโนมัติจ้ะ</div><button class="btn-primary small" data-act="goRead">ไปหามาดามโมจิ</button></div>`}
  </div>`;
}

function albumHTML() {
  const TABS = [['major', 'เมเจอร์'], ['cups', 'ถ้วย'], ['wands', 'ไม้เท้า'], ['swords', 'ดาบ'], ['pentacles', 'เหรียญ']];
  const items = (t) => t === 'major'
    ? MAJOR.map((r) => ({ num: r[0], name: r[1], art: r[2] }))
    : RANK_TH.map((rt, i) => ({ num: RANK_NUM[i], name: i < 10 ? (i === 0 ? 'เอซ' : rt) + SUIT_TH[t] : rt, art: t + (i + 1) }));
  const has = (a) => D.collected.includes(a);
  return `<div class="sheet-body">
    <button class="sheet-close" data-act="back" aria-label="ปิด">${ICON.close}</button>
    <div class="handle"></div>
    <h2 class="sheet-head">อัลบั้มไพ่สะสม</h2>
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
  } else if (/^https?:$/.test(location.protocol) && !document.querySelector('script[src]')) { // only the single-file build can be saved as one page
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

// new visitors arriving from a LINE link go straight to the phone's real browser, where the
// game can be installed and its data kept; returning LINE players are left where their data is
if (isLine && !D.met && !askedExternal()) openExternal();
initInstall((ev) => {
  if (ev === 'installed') S.toast = S.step === 'street' ? '' : 'ติดตั้งร้านไว้บนหน้าจอแล้ว! เปิดหามาดามจากไอคอนได้เลยจ้ะ';
  S.install = null;
  render();
});
if (D.met) persistStorage();
