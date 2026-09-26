import { CARD_INFO, BACK, FRAME, TOP, ART, PETS } from './art.js';

const svg = (inner, w, h) =>
  `<svg viewBox="0 0 200 330" width="${w}" height="${h}" style="position:absolute;left:0;top:0" aria-hidden="true">${inner}</svg>`;

/* ---------------------------------------------------------------- card backs
   Reward card backs are recolours of the original design. Each variant gets its own
   SVG ids so different backs can sit on the same page (the rewards list shows them all). */
const BACK_COLORS = {
  classic: {},
  sakura: { '#BCAEE6': '#F2B3C6', '#E4DAF7': '#FBE1EA', '#B993DA': '#E6879F', '#F3B9C9': '#F7A8BE', '#FFD877': '#FFE7A0' },
  gold: { '#BCAEE6': '#4A3877', '#E4DAF7': '#7A66AE', '#B993DA': '#E3B04B', '#F3B9C9': '#EFC46A', '#F8EEDC': '#F6E4B8', '#E2CFB4': '#D9B46A' },
  night: { '#BCAEE6': '#2E6C66', '#E4DAF7': '#5FA497', '#B993DA': '#3E8B7E', '#F3B9C9': '#9ED7C6', '#FFD877': '#FFF0B3' }
};
export const BACK_KEYS = Object.keys(BACK_COLORS);
const backCache = {};
function backSVG(v) {
  if (!BACK_COLORS[v]) v = 'classic';
  if (!backCache[v]) {
    let s = v === 'classic' ? BACK : BACK.replaceAll('bk-', `bk${v}-`);
    for (const [from, to] of Object.entries(BACK_COLORS[v])) s = s.replaceAll(from, to);
    backCache[v] = s;
  }
  return backCache[v];
}
let currentBack = 'classic';
export function setBack(v) { currentBack = BACK_COLORS[v] ? v : 'classic'; }

function fillFront(key) {
  const [num, title, tone, bg] = CARD_INFO[key];
  const numSize = num.length > 3 ? 8 : num.length > 2 ? 9.5 : 11;
  const titleSize = title.length > 15 ? 10 : title.length > 11 ? 11.5 : 14;
  const fill = (s) =>
    s.replaceAll('{{tone}}', tone).replaceAll('{{bg}}', bg).replaceAll('{{num}}', num)
      .replaceAll('{{numSize}}', numSize).replaceAll('{{title}}', title).replaceAll('{{titleSize}}', titleSize);
  return [fill(FRAME), ART[key], fill(TOP)];
}

/** Returns the HTML for one tarot card, `w` px wide (height = w × 1.65). `back` picks a card-back design. */
export function cardHTML(key, w, back) {
  const h = Math.round(w * 1.65);
  const box = (inner) => `<div class="card" style="position:relative;width:${w}px;height:${h}px">${inner}</div>`;
  if (key === 'back' || !CARD_INFO[key]) return box(svg(backSVG(back || currentBack), w, h));
  return box(fillFront(key).map((p) => svg(p, w, h)).join(''));
}

/** A standalone SVG document of one card face, for drawing onto a canvas. */
export function cardSVG(key) {
  const inner = key === 'back' || !CARD_INFO[key] ? backSVG(currentBack) : fillFront(key).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 330" width="400" height="660">${inner}</svg>`;
}

/** Returns the HTML for a pet face icon, `s` px square. */
export function petHTML(kind, s) {
  return `<svg viewBox="0 0 64 64" width="${s}" height="${s}" aria-hidden="true">${PETS[kind] || PETS.cat}</svg>`;
}
export function petSVG(kind) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="256" height="256">${PETS[kind] || PETS.cat}</svg>`;
}
