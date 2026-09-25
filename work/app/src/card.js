import { CARD_INFO, BACK, FRAME, TOP, ART, PETS } from './art.js';

const svg = (inner, w, h) =>
  `<svg viewBox="0 0 200 330" width="${w}" height="${h}" style="position:absolute;left:0;top:0" aria-hidden="true">${inner}</svg>`;

/** Returns the HTML for one tarot card, `w` px wide (height = w × 1.65). */
export function cardHTML(key, w) {
  const h = Math.round(w * 1.65);
  const box = (inner) => `<div class="card" style="position:relative;width:${w}px;height:${h}px">${inner}</div>`;
  if (key === 'back' || !CARD_INFO[key]) return box(svg(BACK, w, h));
  const [num, title, tone, bg] = CARD_INFO[key];
  const numSize = num.length > 3 ? 8 : num.length > 2 ? 9.5 : 11;
  const titleSize = title.length > 15 ? 10 : title.length > 11 ? 11.5 : 14;
  const fill = (s) =>
    s.replaceAll('{{tone}}', tone).replaceAll('{{bg}}', bg).replaceAll('{{num}}', num)
      .replaceAll('{{numSize}}', numSize).replaceAll('{{title}}', title).replaceAll('{{titleSize}}', titleSize);
  return box(svg(fill(FRAME), w, h) + svg(ART[key], w, h) + svg(fill(TOP), w, h));
}

/** Returns the HTML for a pet face icon, `s` px square. */
export function petHTML(kind, s) {
  return `<svg viewBox="0 0 64 64" width="${s}" height="${s}" aria-hidden="true">${PETS[kind] || PETS.cat}</svg>`;
}
