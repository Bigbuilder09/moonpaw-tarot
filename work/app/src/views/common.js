// Small HTML pieces shared by several screens.
import { petHTML } from '../card.js';
import { ICON } from '../icons.js';
import { D, esc, face, nameOf, MAX_PETS, ADD_PET_LOCKED, availablePets, doneFor } from '../state.js';

// the household row: one chip per pet (+ add button in the pet sheet)
export function petTabsHTML(withAdd) {
  if (!withAdd && availablePets().length < 2) return '';
  return availablePets().map((p) => {
    const sel = p.id === D.activeId;
    const dot = !withAdd && !doneFor('daily', p) ? '<i class="wait-dot" title="ยังไม่ได้เปิดไพ่วันนี้"></i>' : '';
    return `<button class="pet-tab${sel ? ' sel' : ''}" data-act="switchPet" data-arg="${p.id}" aria-pressed="${sel}">${petHTML(p.pet, 26)}<span>${esc(nameOf(p))}</span>${dot}</button>`;
  }).join('') + (withAdd && D.met && (ADD_PET_LOCKED || D.pets.length < MAX_PETS) ? (ADD_PET_LOCKED
      ? `<button class="pet-tab add locked" data-act="addPet" aria-label="เพิ่มน้อง (ล็อกอยู่ ใช้ได้ 1 ตัวในตอนนี้)">${ICON.lock}<span>เพิ่มน้อง · ล็อก</span></button>`
      : `<button class="pet-tab add" data-act="addPet">${ICON.plus}<span>เพิ่มน้อง</span></button>`) : '');
}

export const STATS = [['พลังงาน', '#F0B955'], ['ความขี้อ้อน', '#EE9FB4'], ['ความซน', '#9C86D4']];

export function statsHTML(rs) {
  const avg = [0, 1, 2].map((j) => Math.round(rs.reduce((t, x) => t + x.stats[j], 0) / rs.length));
  return `<div class="box"><div class="mid">ค่าพลังของน้อง</div>
      ${STATS.map((st, j) => `<div class="stat"><span>${st[0]}</span><div class="track"><div class="bar" style="width:${avg[j]}%;background:${st[1]}"></div></div><em>${avg[j]}</em></div>`).join('')}
    </div>`;
}

export const luckyHTML = (x) => `<div class="grid2">
      <div class="box"><div class="muted">สีมงคล</div><div class="row"><span class="swatch" style="background:${x.hex}"></span><b>${x.color}</b></div></div>
      <div class="box"><div class="muted">ของนำโชค</div><div class="row">${ICON.gift}<b>${x.item}</b></div></div>
    </div>`;

export const adviceHTML = (label, text) => `<div class="advice">${ICON.mochi}<div><div class="muted strong">${label}</div><div class="quote">“${text}”</div></div></div>`;

export const thumb = (x, w) => `<button class="card-btn" data-act="open" data-arg="${x.art}" aria-label="ดูความหมาย ${x.th}">${face(x.art, w, x.rev)}</button>`;
