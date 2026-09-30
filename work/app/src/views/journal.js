// Journal sheet: streak, rewards, calendar and saved readings.
import { cardHTML } from '../card.js';
import { ICON } from '../icons.js';
import { REWARDS, nextReward } from '../extras.js';
import { D, thDate, esc, face, P, dname, liveStreak } from '../state.js';
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

export function journalHTML() {
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
