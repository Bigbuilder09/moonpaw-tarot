// Card album and the card meaning / detail modals.
import { cardHTML } from '../card.js';
import { INFO, MAJOR, SUIT_TH, RANK_TH, RANK_NUM } from '../data.js';
import { ICON } from '../icons.js';
import { D, S, R, orient, MEANING } from '../state.js';

export function albumHTML() {
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
      ? `<div class="album-item"><button class="card-btn opt pop" data-act="openAlbum" data-arg="${r.art}" aria-label="ดูความหมาย ${r.name}">${cardHTML(r.art, 72)}</button><span>${r.num} · ${r.name}</span></div>`
      : `<div class="album-item locked"><div class="locked-card">${cardHTML('back', 72)}${ICON.lock}</div><span>${r.num} · ???</span></div>`).join('')}</div>
  </div>`;
}

// Album: the card's general meaning, the same for every pet (readings stay in the reading screens)
export function meaningHTML(key) {
  const x = INFO[key], m = MEANING[key];
  if (!x || !m) return detailHTML(key);
  const side = (rev) => `<div class="box stack meaning-side" style="background:${x.bg}">
        <div class="row between"><b>${(rev ? x.rv : x.up).key}</b>${orient(rev)}</div>
        <div>${m[rev ? 2 : 1]}</div>
      </div>`;
  return `<div class="modal lineIn" role="dialog" aria-modal="true" aria-label="${x.th}">
    <button class="modal-bg" data-act="close" aria-label="ปิด"></button>
    <div class="modal-box">
      <div class="pop" style="transform:rotate(-2deg)">${cardHTML(key, 150)}</div>
      <div class="center"><div class="muted">${x.en}</div><div class="big">${x.th}</div></div>
      <div class="meaning-intro">${ICON.spark}<span>${m[0]}</span></div>
      ${side(false)}${side(true)}
      <p class="note meaning-note">นี่คือความหมายทั่วไปของไพ่ใบนี้จ้ะ คำทำนายสำหรับน้องจะได้ตอนเปิดไพ่ดูดวง</p>
      <button class="btn-primary small" data-act="close">ปิด</button>
    </div>
  </div>`;
}

export function detailHTML(key) {
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
