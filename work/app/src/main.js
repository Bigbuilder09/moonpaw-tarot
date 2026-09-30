import './soulmysty.css';
import './app.css';
import { initMochiMotion } from './mochi-motion.js';
import exterior from './assets/shop-exterior.webp';
import exteriorPortrait from './assets/exterior-portrait.webp';
import interior from './assets/parlour-landscape.webp';
import interiorPortrait from './assets/parlour-portrait.webp';
import { cardHTML, petHTML, setBack } from './card.js';
import { ARTS, INFO, PETS, LINES } from './data.js';
import * as store from './store.js';
import { ICON } from './icons.js';
import { isBirthday, bdayWindow, BDAY_WINDOW, REWARDS } from './extras.js';
import * as sfx from './sfx.js';
import { initInstall, installKind, promptInstall, openExternal, askedExternal, isLine, persistStorage } from './install.js';
import { D, S, persist, later, todayKey, monthKey, thDate, esc, shuffle, NEED, need, REV_CHANCE, MODE_TH, LBL, R, face, SPREAD, P, nameOf, dname, MAX_PETS, ADD_PET_LOCKED, availablePets, periodKey, doneFor, celticUntil, hasReward, liveStreak, markDay, newlyUnlocked, $, untilText, nextDay, nextMonth, loadContent } from './state.js';
import { greetingLines } from './views/greeting.js';
import { petTabsHTML } from './views/common.js';
import { resultHTML } from './views/result.js';
import { installHTML } from './views/install-ui.js';
import { shareOpts, shareName, shareHTML } from './views/share-ui.js';
import { journalHTML, calMonth, firstMonth } from './views/journal.js';
import { albumHTML, meaningHTML, detailHTML } from './views/album.js';

// repair older saves: a once-per-period reading that was opened always belongs in the album
D.pets.forEach((p) => Object.entries(p.done).filter(([m]) => m !== 'celtic').forEach(([, r]) => (r.arts || []).forEach((a) => { if (!D.collected.includes(a)) D.collected.push(a); })));
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
  <img id="streetArt" class="painted-street" src="${exterior}" alt="ร้านไพ่ SOULMYSTY แสงโคมอุ่นในยามค่ำ" fetchpriority="high">
  <button class="door-btn" data-act="door" aria-label="เปิดประตูเข้าร้าน">
    <span class="door-glow"></span>
    <span id="doorL" class="door-l"><i class="dp dp1"></i><i class="dp dp2"></i></span>
    <span id="doorR" class="door-r"><i class="dp dp1"></i><i class="dp dp2"></i><i class="knob"></i></span>
  </button>

</div>
</div>
  <div id="streetTitle" class="street-title">
    <div class="eyebrow">SOULMYSTY TAROT PARLOUR</div>
    <h1>ดูดวงไพ่ยิปซี<br>ให้น้องเจ้าตัวเล็ก</h1>
    <p>ร้านเปิดแล้ว… มาดามโมจิรออยู่ข้างใน</p>
    <div class="shop-name">ร้านไพ่ SOULMYSTY <span>PET TAROT</span></div>
  </div>
<div id="streetCta" class="panel on street-cta"><button class="btn-primary pulse" data-act="door">${ICON.paw} เข้าร้านดูดวง</button><button id="installBtn" class="dl-btn install-btn" data-act="install" hidden>${ICON.phone} ติดตั้งร้านไว้บนหน้าจอ</button></div>

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
<audio id="bgm" loop preload="none" src="./bgm-fairy-tale.mp3"></audio>

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
  <label for="petBirthday" class="field">วันเกิดน้อง <small class="field-sub">(optional)</small>
    <input id="petBirthday" type="date" autocomplete="off">
  </label>
  <label for="ownerBirthday" class="field">วันเกิดเจ้าของ <small class="field-sub">(optional) · ใช้กับน้องทุกตัว</small>
    <input id="ownerBirthday" type="date" autocomplete="off">
  </label>
  <p class="note bd-note">${ICON.cake}ใส่วันเกิดไว้ แล้วมาดามจะอวยพรให้ในวันเกิดนะ · “ดวงสมพงษ์” และ “ดวงวันเกิด” เปิดให้เร็ว ๆ นี้</p>
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
    <span class="celtic-text"><b>ดวงชะตารวม 10 ใบ</b><small>ผัง Celtic Cross ดูลึกทุกด้าน ตั้งแต่รากฐาน ใจกลาง จนถึงผลลัพธ์ · เปิดได้ทุก 24 ชั่วโมง (ไม่นับเข้าอัลบั้มไพ่)</small><span id="celticBadge" class="badge"></span><span class="countdown" id="celticCd"></span></span>
  </button>
  <div class="grid2">
    <button class="opt mode-row compat" data-act="compat" id="compatBtn"><span class="mode-ico">${ICON.hearts}</span><span class="mode-txt"><b>ดวงสมพงษ์</b><small id="compatSub"></small><span class="soon-tag">Coming soon</span></span></button>
    <button class="opt mode-row bday" data-act="bday" id="bdayBtn"><span class="mode-ico">${ICON.cake}</span><span class="mode-txt"><b>ดวงวันเกิด</b><small id="bdaySub"></small><span class="soon-tag">Coming soon</span></span></button>
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
  if (cd) cd.textContent = S.mode === 'monthly' || S.mode === 'compat' ? mTxt : S.mode === 'celtic' ? untilText(celticUntil()) : dTxt;
  const readCeltic = !!doneFor('celtic');
  $('celticCd').innerHTML = readCeltic ? cdHTML(untilText(celticUntil())) : '';
  $('celticBadge').textContent = readCeltic ? 'เปิดแล้ว · แตะดูอีกครั้ง' : '';
}
setInterval(tickCountdown, 1000);

/* ------------------------------------------------------------------ Madame remembers */

/* ------------------------------------------------------------------ flow */
function go(step, extra) {
  Object.assign(S, { step, entered: false, fromResult: false, past: null, fromJournal: false, detail: null, confirmReset: false, confirmUnsave: false, confirmRemove: false, toast: '' }, extra || {});
  render();
}
function toast(msg) { S.toast = msg; render(); }
function calShift(n) {
  const { y, m } = calMonth();
  const t = new Date(y, m + n, 1), now = new Date(), f = firstMonth();
  const k = t.getFullYear() * 12 + t.getMonth();
  if (k > now.getFullYear() * 12 + now.getMonth() || k < f.y * 12 + f.m) return;
  S.calY = t.getFullYear(); S.calM = t.getMonth(); S.calDay = 0; render();
}
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
    // the door animation and the shop's content load at the same time
    Promise.all([loadContent(), new Promise((ok) => later(ok, 850))])
      .then(() => go('greet', { line: 0, lines: D.met ? greetingLines() : LINES }))
      .catch(() => { S.door = false; toast('เปิดร้านไม่สำเร็จ ลองเช็กอินเทอร์เน็ตแล้วแตะประตูอีกครั้งนะจ๊ะ'); });
  },
  next() {
    if (S.line < S.lines.length - 1) { S.line++; render(); }
    else if (D.met) go('hub', { entered: true });
    else { fillForm(); go('pet'); }
  },
  back() {
    // album / journal opened from a reading: go back to that reading
    if (S.fromResult && (S.step === 'album' || S.step === 'journal')) { go('result'); return; }
    // a saved reading opened from the journal: back to the journal, same month and day
    if (S.step === 'result' && S.fromJournal) { go('journal'); return; }
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
    if (ADD_PET_LOCKED || arg === D.activeId || !availablePets().some((p) => p.id === arg)) return;
    if (S.step === 'pet') syncForm();
    D.activeId = arg; persist();
    if (S.step === 'pet') { fillForm(); go('pet'); } else render();
  },
  addPet() {
    if (ADD_PET_LOCKED) { toast('ตอนนี้ดูแลน้องได้ 1 ตัวจ้ะ ช่องเพิ่มน้องยังล็อกอยู่'); return; }
    if (D.pets.length >= MAX_PETS) return;
    syncForm();
    const p = store.newPet();
    D.pets.push(p); D.activeId = p.id; persist();
    fillForm(); go('pet');
    later(() => $('petName').focus(), 60);
  },
  removePet() {
    if (ADD_PET_LOCKED || availablePets().length < 2) return;
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
  goJournal() {
    // opening the journal fresh starts at this month; coming back from a reading keeps the place
    if (S.step !== 'result') { S.calY = null; S.calM = null; S.calDay = 0; }
    go('journal', { fromResult: S.step === 'result' && !S.fromJournal });
  },
  // journal calendar
  calPrev() { calShift(-1); },
  calNext() { calShift(1); },
  calDay(arg) { const d = Number(arg) || 0; S.calDay = S.calDay === d ? 0 : d; render(); },
  /** Opens a saved reading in full (all cards, e.g. all ten of the big spread). */
  viewEntry(id) {
    const e = P().journal.find((x) => x.id === id);
    if (!e || !e.cards || !e.cards.length) return;
    const mode = e.mk || (e.cards.length === 10 ? 'celtic' : e.cards.length === 3 ? 'monthly' : 'daily');
    go('result', {
      mode, readingId: e.id, arts: e.cards.slice(), revs: (e.revs || []).slice(), flipped: e.cards.map((_, i) => i),
      past: e, fromJournal: true, repeat: false, newCards: [], newRewards: [], streakUp: 0
    });
    const box = $('result'); if (box) box.scrollTop = 0;
  },
  goAlbum() {
    const first = S.step === 'result' && S.newCards[0];
    const m = first && first.match(/^(cups|wands|swords|pentacles)/);
    go('album', Object.assign({ fromResult: S.step === 'result' }, first ? { albumTab: m ? m[1] : 'major' } : {}));
  },
  daily() { choose('daily'); },
  monthly() { choose('monthly'); },
  celtic() { choose('celtic'); },
  compat() { toast('ดวงสมพงษ์กำลังจะมาเร็ว ๆ นี้ รอติดตามนะจ๊ะ'); },
  bday() { toast('ดวงวันเกิดกำลังจะมาเร็ว ๆ นี้ รอติดตามนะจ๊ะ'); },
  heart() { choose('heart'); },
  pick(arg) {
    const i = Number(arg);
    if (S.step !== 'shuffle' || !S.dealt || S.sealed || S.picks.includes(i) || S.picks.length >= need()) return;
    const pos = S.picks.length;
    S.picks.push(i); S.arts.push(S.deck[i]);
    // position 2 of the ten-card spread is always read upright (per the source book);
    // birthday cards are a blessing, so they are always read upright too
    S.revs.push((S.mode === 'celtic' && pos === 1) || S.mode === 'bday' ? false : Math.random() < REV_CHANCE);
    render();
    if (S.picks.length === need()) {
      // all cards chosen: lock the table so "สับไพ่ใหม่" can't clear the picks before the reveal
      S.sealed = true; render();
      const g = S.gen;
      later(() => { if (S.step === 'shuffle' && S.gen === g) go('reveal', { flipped: [] }); }, 950);
    }
  },
  autoPick() {
    if (S.step !== 'shuffle' || !S.dealt || S.sealed) return;
    const g = S.gen;
    const count = S.mode === 'celtic' ? 78 : 9;
    const free = shuffle([...Array(count).keys()].filter((i) => !S.picks.includes(i))).slice(0, need() - S.picks.length);
    free.forEach((i, j) => later(() => { if (S.gen === g) ACT.pick(i); }, j * 140));
  },
  flipAll() {
    S.arts.forEach((_, k) => later(() => ACT.flip(k), k * 160));
  },
  reshuffle() {
    if (S.step !== 'shuffle' || S.sealed) return;
    const g = ++S.gen; // cancels any auto-pick still on its way
    S.dealt = false; S.picks = []; S.arts = []; S.revs = []; render();
    later(() => { if (S.gen === g && S.step === 'shuffle') { S.deck = shuffle(ARTS); S.dealt = true; sfx.riffle(); render(); } }, 520);
  },
  flip(arg) {
    const k = Number(arg);
    if (S.flipped.includes(k)) return;
    S.flipped.push(k);
    sfx.flip();
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
  open(arg) { S.detail = arg; S.detailAlbum = false; render(); },
  openAlbum(arg) { S.detail = arg; S.detailAlbum = true; render(); },
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
      const { makeShareImage } = await import('./share.js'); // loaded only when someone shares
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
        await navigator.share({ files: [file], title: 'ร้านไพ่ SOULMYSTY', text: `ดวงของน้อง${dname()} จากร้านไพ่ SOULMYSTY` });
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
  const done = doneFor(mode);
  const readingId = mode === 'celtic' ? (done ? done.key : `celtic-${p.id}-${Date.now()}`) : `${mode}-${p.id}-${pk}`;
  if (done) {
    go('result', { mode, readingId, arts: done.arts.slice(), revs: (done.revs || []).slice(), repeat: true, newCards: [], newRewards: [], streakUp: 0 });
    // readings are kept in the journal automatically (older saves may have removed one)
    if (!p.journal.some((e) => e.id === readingId)) { p.journal = [makeEntry()].concat(p.journal); persist(); }
    return;
  }
  go('shuffle', { mode, readingId, deck: shuffle(ARTS), picks: [], arts: [], revs: [], flipped: [], dealt: false, sealed: false, gen: S.gen + 1, repeat: false, newCards: [], newRewards: [], streakUp: 0 });
  later(() => { S.dealt = true; sfx.riffle(); render(); }, 380);
}

/** Runs once, the moment the last card of a reading is turned over: everything is saved
 *  right away, so leaving the screen early never loses the reading or its cards. */
function completeReading() {
  const p = P();
  const pk = periodKey(S.mode);
  if (pk) p.done[S.mode] = { key: pk, arts: S.arts.slice(), revs: S.revs.slice() };
  if (S.mode === 'celtic') p.done.celtic = { key: S.readingId, at: Date.now(), arts: S.arts.slice(), revs: S.revs.slice() };
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
  const place = { greet: 'ร้านไพ่ SOULMYSTY', pet: 'ร้านไพ่ SOULMYSTY', hub: 'ห้องมาดามโมจิ', journal: 'ชั้นสมุดดวง', album: 'ตู้ไพ่สะสม' }[s] || '';
  const streak = liveStreak();
  setHTML($('hudMid'), idx >= 0
    ? `<div class="dots">${ORDER.map((o, i) => `<i class="dot" style="width:${i === idx ? 22 : 8}px;background:${i <= idx ? '#7456B3' : '#D9CCEB'}"></i>`).join('')}</div>`
    : `<div class="place">${place}${s === 'hub' && streak ? `<span class="streak-mini" title="มาต่อเนื่อง ${streak} วัน">${ICON.flame}${streak}</span>` : ''}</div>`);
  setHTML($('chipFace'), petHTML(p.pet, 30));
  $('chipName').textContent = dname();

  // hint bubble
  const waiting = availablePets().filter((q) => q.id !== p.id && !doneFor('daily', q)).map(nameOf);
  const shuffleHint = {
    daily: `ตั้งจิตถึงน้อง${dname()} แล้วเลือกไพ่ 1 ใบ`,
    heart: `ตั้งใจฟังเสียงในใจน้อง${dname()} แล้วเลือกไพ่ 1 ใบ`,
    monthly: `เลือกไพ่ 3 ใบ ต้น กลาง ปลายเดือน (${S.picks.length}/3)`,
    compat: `คิดถึงช่วงเวลาดี ๆ ของเจ้ากับน้อง${dname()} แล้วเลือกไพ่ 3 ใบ (${S.picks.length}/3)`,
    bday: `อธิษฐานให้น้อง${dname()} แล้วเลือกไพ่ 3 ใบ (${S.picks.length}/3)`,
    celtic: `ตั้งคำถามเรื่องน้อง${dname()} ในใจ แล้วเลือกไพ่ 10 ใบ (${S.picks.length}/10)`
  }[S.mode];
  const hints = {
    hub: isBirthday(p.petBirthday) ? `สุขสันต์วันเกิดน้อง${dname()}! มาดามขออวยพรให้น้องมีความสุขมาก ๆ นะจ๊ะ`
      : !readToday ? `แตะจุดที่ส่องแสงในร้านได้เลย วันนี้น้อง${dname()} ยังไม่ได้ดูดวงนะ`
      : waiting.length ? `น้อง${dname()}ดูดวงวันนี้แล้ว แต่น้อง${waiting[0]}ยังไม่ได้ดูนะ แตะชื่อน้องมุมขวาบนเพื่อสลับ`
      : `ดูดวงวันนี้แล้วนะ น้อง${dname()} จะแวะดูสมุดหรืออัลบั้มก็ได้จ้ะ`,
    pet: D.met ? (ADD_PET_LOCKED ? 'แก้ข้อมูลน้องได้ที่นี่จ้ะ ตอนนี้ใช้งานได้ 1 ตัว' : 'แก้ข้อมูล สลับ หรือเพิ่มน้องในบ้านได้ที่นี่จ้ะ') : 'เจ้าตัวเล็กของเจ้าชื่ออะไร เป็นน้องอะไรเอ่ย?',
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
  $('petTitle').textContent = D.met ? 'น้องของฉัน' : 'น้องคือใครเอ่ย?';
  setHTML($('petTabs'), D.met ? petTabsHTML(true) : '');
  setHTML($('petGrid'), PETS.map((k) => `<button class="opt pet-opt${p.pet === k.k ? ' sel' : ''}" data-act="pet" data-arg="${k.k}" aria-pressed="${p.pet === k.k}">${petHTML(k.k, 64)}<span>${k.th}</span></button>`).join(''));
  $('petCta').textContent = D.met ? 'บันทึก' : 'เข้าไปในร้าน';
  $('petClose').hidden = !D.met;
  $('removeBtn').style.display = D.met && !ADD_PET_LOCKED && availablePets().length > 1 ? '' : 'none';
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
  // ดวงสมพงษ์ / ดวงวันเกิด: not ready yet — shown as "coming soon"
  $('compatSub').textContent = 'ไพ่ 3 ใบ · น้องกับเจ้าของ';
  $('bdaySub').textContent = 'ไพ่ 3 ใบ · ช่วงวันเกิดน้อง';
  ['compatBtn', 'bdayBtn'].forEach((id) => { $(id).classList.add('locked', 'soon'); $(id).classList.remove('glow'); });
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
  document.querySelectorAll('#shuffle [data-act="reshuffle"], #autoBtn').forEach((b) => { b.disabled = !!S.sealed; });
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
  setHTML($('detail'), S.detail ? (S.detailAlbum ? meaningHTML(S.detail) : detailHTML(S.detail)) : '');
  setHTML($('shareBox'), S.share ? shareHTML() : '');
  setHTML($('installBox'), S.install ? installHTML() : '');
}

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

/* ------------------------------------------------------------------ background music */
// On by default. Browsers only allow sound after a tap, so it starts on the first tap in the game
// (usually the shop door). The choice is remembered, and the music pauses while the app is hidden.
const bgm = document.getElementById('bgm');
bgm.volume = 0.25;
const musicOn = () => D.music !== false;
sfx.setSfxEnabled(musicOn); // sound effects follow the same speaker button
let heard = false; // has the player tapped anything yet
function syncMusic() {
  const play = musicOn() && heard && !document.hidden;
  if (play && bgm.paused) bgm.play().catch(() => {});
  if (!play && !bgm.paused) bgm.pause();
  document.querySelectorAll('.music-btn').forEach((b) => {
    b.innerHTML = musicOn() ? ICON.soundOn : ICON.soundOff;
    b.classList.toggle('off', !musicOn());
    b.setAttribute('aria-pressed', String(musicOn()));
    b.title = musicOn() ? 'ปิดเสียง' : 'เปิดเสียง';
  });
}
stage.addEventListener('pointerdown', () => { if (!heard) { heard = true; syncMusic(); } }, { capture: true });
document.addEventListener('keydown', () => { if (!heard) { heard = true; syncMusic(); } });
document.addEventListener('visibilitychange', syncMusic);
syncMusic();

/* ------------------------------------------------------------------ install (PWA) */

/* ------------------------------------------------------------------ share image */

/* ------------------------------------------------------------------ journal + rewards */

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
initMochiMotion($('roomArt'), $('room'));
stage.classList.add('resizing'); // first frame: place the scene without animating
render();
loadContent().catch(() => {}); // start fetching the inside of the shop right away
requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.remove('resizing')));

// new visitors arriving from a LINE link go straight to the phone's real browser, where the
// game can be installed and its data kept; returning LINE players are left where their data is
if (isLine && !D.met && !askedExternal()) openExternal();
initInstall((ev) => {
  if (ev === 'installed') S.toast = S.step === 'street' ? '' : 'ติดตั้งร้านไว้บนหน้าจอแล้ว! เปิดหามาดามจากไอคอนได้เลยจ้ะ';
  S.install = null;
  render();
});
if (D.met) persistStorage();

