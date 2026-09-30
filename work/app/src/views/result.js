// The reading result sheet.
import { petHTML } from '../card.js';
import { INFO, POSITIONS } from '../data.js';
import { ICON } from '../icons.js';
import { ageText, compatInfo, EL_TH, BLESS, HEART, nextReward } from '../extras.js';
import { D, S, thDate, esc, need, LBL, R, madame, POS_TIP, orient, SPREAD, P, dname, celticUntil, untilText, nextDay, nextMonth } from '../state.js';
import { statsHTML, luckyHTML, adviceHTML, thumb } from './common.js';
import { installNudgeHTML } from './install-ui.js';

export const REPEAT_TH = {
  daily: 'วันนี้น้องเปิดไพ่ไปแล้ว นี่คือไพ่ประจำวันของน้องจ้ะ',
  heart: 'วันนี้ฟังเสียงในใจน้องไปแล้ว นี่คือไพ่ของวันนี้จ้ะ',
  monthly: 'เดือนนี้น้องเปิดไพ่ไปแล้ว นี่คือดวงประจำเดือนของน้องจ้ะ',
  compat: 'เดือนนี้ดูดวงสมพงษ์ไปแล้ว นี่คือไพ่ของเดือนนี้จ้ะ',
  bday: 'ดวงวันเกิดปีนี้เปิดไปแล้ว นี่คือไพ่วันเกิดของน้องจ้ะ',
  celtic: 'ดวงชะตารวมเปิดได้ทุก 24 ชั่วโมง นี่คือไพ่ 10 ใบชุดล่าสุดของน้องจ้ะ'
};

export function resultTitle(d) {
  return {
    daily: thDate(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, 'วันนี้'),
    heart: 'เสียงในใจน้อง · ' + thDate(d, { day: 'numeric', month: 'long' }, 'วันนี้'),
    monthly: 'ดวงประจำเดือน' + thDate(d, { month: 'long', year: 'numeric' }, ''),
    compat: 'ดวงสมพงษ์ประจำเดือน' + thDate(d, { month: 'long', year: 'numeric' }, ''),
    bday: 'ดวงวันเกิดประจำปี ' + thDate(d, { year: 'numeric' }, ''),
    celtic: 'ดวงชะตารวม 10 ใบ · ' + thDate(d, { day: 'numeric', month: 'short' }, '')
  }[S.mode];
}

export const phaseHTML = (rs) => rs.map((x, k) => `<div class="lineIn phase" style="background:${x.bg};animation-delay:${k * 120}ms">${thumb(x, 56)}<div><div class="muted">${LBL(k)} · ${x.th} ${orient(x.rev)}</div><div class="mid">${x.key}</div><div class="body">${x.what}</div><div class="body soft">${x.mean}</div></div></div>`).join('');

export function resultHTML() {
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
    : `<div class="notice-cd">${ICON.clock}<span>เปิดใหม่ได้ใน <b id="resultCd">${untilText(monthly ? nextMonth() : S.mode === 'celtic' ? celticUntil() : nextDay())}</b></span></div>`}</div>` : '';
  const nr = nextReward(D.streak.days);
  const streakBanner = S.streakUp ? `<div class="pop streak-banner">${ICON.flame}<span><b>${S.streakUp > 1 ? `มาหามาดามต่อเนื่อง ${S.streakUp} วัน!` : 'เริ่มนับวันแรกแล้ว! พรุ่งนี้มาต่อนะ'}</b><small>เปิดไพ่รายวันมาแล้ว ${D.streak.days} วัน${nr ? ` · อีก ${nr.days - D.streak.days} วันได้ “${nr.name}”` : ''}</small></span></div>` : '';
  const rewardBanner = S.newRewards.length ? `<button class="pop new-cards reward" data-act="goJournal">${ICON.gift}<span><b>ปลดล็อกรางวัลใหม่!</b><small>${S.newRewards.map((r) => r.name).join(' · ')} · แตะเพื่อดูในสมุดดวง</small></span></button>` : '';
  return `<div class="res">
    <button class="sheet-close" data-act="back" aria-label="ปิด">${ICON.close}</button>
    <div class="res-head"><div class="muted">${resultTitle(d)}</div>
    <h2>${h2}</h2></div>
    ${repeat}${streakBanner}
    ${body}
    ${rewardBanner}
    ${installNudgeHTML()}
    <button class="btn-share" data-act="share"><span class="share-ico" aria-hidden="true">${ICON.sharePic}<i>♥</i></span><span class="share-txt"><b>แชร์ดวงเป็นรูป</b><small>ส่งต่อคำทำนายของเจ้าตัวเล็ก ♡</small><span class="share-tags" aria-hidden="true">IG STORY <i>✦</i> LINE</span></span><span class="share-go" aria-hidden="true">↗</span></button>
    <p class="note saved-note">${ICON.check}<span>บันทึกลงสมุดดวงให้อัตโนมัติแล้วจ้ะ</span></p>
    <div class="grid2"><button class="btn-outline" data-act="otherMode">ดูดวงแบบอื่น</button><button class="btn-outline" data-act="hub">กลับไปในร้าน</button></div>
    <p class="note">คำทำนายเพื่อความบันเทิง หากน้องมีอาการผิดปกติควรปรึกษาสัตวแพทย์</p>
  </div>`;
}
