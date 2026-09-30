// Journal sheet: streak, rewards, calendar and saved readings.
import { cardHTML } from '../card.js';
import { ICON } from '../icons.js';
import { REWARDS, nextReward } from '../extras.js';
import { D, S, thDate, esc, face, P, dname, liveStreak } from '../state.js';
import { petTabsHTML } from './common.js';

export function rewardsHTML() {
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

// Calendar month on screen: S.calY / S.calM (defaults to this month). Tapping a day with a
// reading shows only that day's entries (S.calDay); every entry opens the full reading.
const WEEK = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
export const calMonth = () => {
  const now = new Date();
  return S.calY == null ? { y: now.getFullYear(), m: now.getMonth() } : { y: S.calY, m: S.calM };
};
/** The earliest month that has a journal entry (the calendar can't go back further). */
export function firstMonth(p = P()) {
  const now = new Date();
  return p.journal.reduce((best, e) => (e.year * 12 + e.month < best.y * 12 + best.m ? { y: e.year, m: e.month } : best),
    { y: now.getFullYear(), m: now.getMonth() });
}

function entryHTML(e) {
  const shown = e.cards.slice(0, 3);
  return `<button class="entry" style="background:${e.bg}" data-act="viewEntry" data-arg="${esc(e.id)}" aria-label="เปิดคำทำนาย ${esc(e.mode)} ${esc(e.date)}">
    <span class="entry-cards">${shown.map((c, i) => face(c, 40, e.revs && e.revs[i])).join('')}${e.cards.length > 3 ? `<span class="more">+${e.cards.length - 3}</span>` : ''}</span>
    <span class="entry-txt"><span class="muted">${e.date} · ${e.mode}</span><span class="mid">${e.key}</span><span class="entry-open">ดูคำทำนายเต็ม ${e.cards.length > 1 ? `· ไพ่ ${e.cards.length} ใบ ` : ''}›</span></span>
  </button>`;
}

export function journalHTML() {
  const p = P();
  const now = new Date();
  const { y, m } = calMonth();
  const isNow = y === now.getFullYear() && m === now.getMonth();
  const f = firstMonth(p);
  const canPrev = y * 12 + m > f.y * 12 + f.m;
  const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
  const inMonth = p.journal.filter((e) => e.year === y && e.month === m);
  const marked = {};
  inMonth.forEach((e) => { marked[e.day] = (marked[e.day] || 0) + 1; });
  const sel = S.calDay && marked[S.calDay] ? S.calDay : 0;
  let cal = '';
  for (let i = 0; i < first; i++) cal += '<span></span>';
  for (let dd = 1; dd <= days; dd++) {
    const cls = `day${isNow && dd === now.getDate() ? ' today' : ''}${marked[dd] ? ' marked' : ''}${dd === sel ? ' sel' : ''}`;
    cal += marked[dd]
      ? `<button class="${cls}" data-act="calDay" data-arg="${dd}" aria-pressed="${dd === sel}" aria-label="วันที่ ${dd} มี ${marked[dd]} บันทึก">${dd}</button>`
      : `<span class="${cls}">${dd}</span>`;
  }
  const list = sel ? inMonth.filter((e) => e.day === sel) : inMonth;
  const monthName = thDate(new Date(y, m, 1), { month: 'long', year: 'numeric' }, `${m + 1}/${y}`);
  const tabs = petTabsHTML(false);
  const listHead = sel
    ? `<div class="row between list-head"><b>วันที่ ${sel} ${monthName}</b><button class="link-btn" data-act="calDay" data-arg="0">ดูทั้งเดือน</button></div>`
    : `<div class="list-head"><b>บันทึกเดือน${monthName}</b> <span class="muted">${inMonth.length} รายการ</span></div>`;
  return `<div class="sheet-body">
    <button class="sheet-close" data-act="back" aria-label="ปิด">${ICON.close}</button>
    <div class="handle"></div>
    <div class="row between sheet-head"><h2>สมุดดวงของน้อง${esc(dname())}</h2><span class="chip pink">${p.journal.length} บันทึก</span></div>
    ${tabs ? `<div class="pet-tabs">${tabs}</div>` : ''}
    ${rewardsHTML()}
    <div class="box">
      <div class="cal-head">
        <button class="cal-nav" data-act="calPrev" aria-label="เดือนก่อน"${canPrev ? '' : ' disabled'}>${ICON.back}</button>
        <div class="mid">${monthName}</div>
        <button class="cal-nav next" data-act="calNext" aria-label="เดือนถัดไป"${isNow ? ' disabled' : ''}>${ICON.back}</button>
      </div>
      <div class="cal">${WEEK.map((w) => `<b>${w}</b>`).join('')}${cal}</div>
      ${inMonth.length ? '<div class="muted cal-tip">แตะวันที่มีจุด เพื่อดูเฉพาะวันนั้น</div>' : ''}
    </div>
    ${p.journal.length ? listHead + (list.length ? list.map(entryHTML).join('') : '<div class="empty small"><div class="body">เดือนนี้ยังไม่มีบันทึกจ้ะ ลองกดลูกศรย้อนไปเดือนก่อนดูนะ</div></div>')
      : `<div class="empty"><svg width="84" height="64" viewBox="0 0 84 64" aria-hidden="true"><path d="M8 12 Q24 4 42 12 V58 Q24 50 8 58 Z" fill="#F7B6C4" stroke="#6B5577" stroke-width="2.5" stroke-linejoin="round"/><path d="M76 12 Q60 4 42 12 V58 Q60 50 76 58 Z" fill="#FFF6EA" stroke="#6B5577" stroke-width="2.5" stroke-linejoin="round"/></svg><b>สมุดยังว่างอยู่เลย</b><div class="body">ดูดวงเมื่อไหร่ คำทำนายจะถูกบันทึกไว้ที่นี่ให้อัตโนมัติจ้ะ</div><button class="btn-primary small" data-act="goRead">ไปหามาดามโมจิ</button></div>`}
  </div>`;
}
