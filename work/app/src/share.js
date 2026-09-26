// Draws a 1080×1920 story image (fits Instagram / LINE stories) of a reading.
import { cardSVG, petSVG } from './card.js';

const W = 1080, H = 1920;

const loadImg = (src) => new Promise((ok, fail) => {
  const im = new Image();
  im.onload = () => ok(im);
  im.onerror = fail;
  im.src = src;
});
const svgImg = (svg) => loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));

async function fontsReady() {
  if (!document.fonts || !document.fonts.load) return;
  const wait = Promise.all([
    document.fonts.load("700 60px 'Mali'", 'กขค'),
    document.fonts.load("600 40px 'Mali'", 'กขค'),
    document.fonts.load("400 34px 'IBM Plex Sans Thai Looped'", 'กขค'),
    document.fonts.load("400 26px 'Young Serif'", 'MOON')
  ]).catch(() => {});
  await Promise.race([wait, new Promise((r) => setTimeout(r, 1500))]);
}

// Thai has no spaces between words: break on word segments where the browser supports it.
function pieces(text) {
  try {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      return [...new Intl.Segmenter('th', { granularity: 'word' }).segment(text)].map((s) => s.segment);
    }
  } catch (e) { /* fall through */ }
  return [...text];
}
function wrap(ctx, text, maxW) {
  const lines = [];
  let line = '';
  for (const p of pieces(String(text))) {
    if (line && ctx.measureText(line + p).width > maxW) { lines.push(line.trim()); line = p.trimStart(); }
    else line += p;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}
function clampLines(ctx, lines, max) {
  if (lines.length <= max) return lines;
  if (max <= 0) return [];
  const out = lines.slice(0, max);
  const last = out[max - 1];
  out[max - 1] = last.slice(0, Math.max(1, last.length - 2)) + '…';
  return out;
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * opts: { title, date, cards: [{ art, rev, label }], headline, lines: [string], petKind, petName, backdrop }
 * Resolves to a PNG Blob.
 */
export async function makeShareImage(opts) {
  await fontsReady();
  const [cardImgs, pet] = await Promise.all([
    Promise.all(opts.cards.map((c) => svgImg(cardSVG(c.art)))),
    svgImg(petSVG(opts.petKind)).catch(() => null)
  ]);
  let backdrop = null;
  if (opts.backdrop) backdrop = await loadImg(opts.backdrop).catch(() => null);
  try {
    return await draw(opts, cardImgs, pet, backdrop);
  } catch (e) {
    if (!backdrop) throw e;
    return draw(opts, cardImgs, pet, null); // a tainted backdrop (e.g. opened from a local folder) — draw without it
  }
}

function draw(opts, cardImgs, pet, backdrop) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  // backdrop: the painted parlour, darkened, or a plain gradient
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#4A2F63'); g.addColorStop(1, '#221633');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (backdrop) {
    const s = Math.max(W / backdrop.width, H / backdrop.height);
    const bw = backdrop.width * s, bh = backdrop.height * s;
    ctx.drawImage(backdrop, (W - bw) / 2, (H - bh) / 2, bw, bh);
  }
  const ov = ctx.createLinearGradient(0, 0, 0, H);
  ov.addColorStop(0, 'rgba(38,22,56,.78)'); ov.addColorStop(.45, 'rgba(38,22,56,.55)'); ov.addColorStop(1, 'rgba(30,16,44,.9)');
  ctx.fillStyle = ov; ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  // header
  ctx.fillStyle = '#E9C88F';
  ctx.font = "400 28px 'Young Serif', Georgia, serif";
  if ('letterSpacing' in ctx) ctx.letterSpacing = '8px';
  ctx.fillText('MOONPAW TAROT PARLOUR', W / 2, 118);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.fillStyle = '#FFF1DA';
  ctx.font = "700 64px 'Mali', cursive";
  const titleLines = clampLines(ctx, wrap(ctx, opts.title, 920), 2);
  let y = 205;
  titleLines.forEach((l) => { ctx.fillText(l, W / 2, y); y += 78; });
  ctx.fillStyle = '#EADAF0';
  ctx.font = "400 34px 'IBM Plex Sans Thai Looped', sans-serif";
  ctx.fillText(opts.date || '', W / 2, y - 12);

  // measure the text panel first, then give the cards whatever height is left
  const px = 70, pw = W - 140;
  ctx.font = "700 52px 'Mali', cursive";
  const head = clampLines(ctx, wrap(ctx, opts.headline || '', pw - 100), 3);
  ctx.font = "400 34px 'IBM Plex Sans Thai Looped', sans-serif";
  const body = [];
  (opts.lines || []).forEach((t, i) => { if (i) body.push(''); body.push(...wrap(ctx, t, pw - 110)); });
  const lh = 52;
  const bodyLines = clampLines(ctx, body, 9);
  const bodyH = bodyLines.reduce((t, l) => t + (l ? lh : lh * 0.5), 0);
  const panelH = 180 + head.length * 66 + 14 + bodyH + 40;
  const footerTop = H - 140;

  const n = cardImgs.length;
  const labelH = opts.cards.some((c) => c.label) ? 90 : 20;
  const maxW = n === 1 ? 470 : n === 2 ? 380 : 300;
  const gap = n === 1 ? 0 : 40;
  const cardRoom = footerTop - 60 - panelH - 110 - labelH - (y + 30);
  const cw = Math.max(200, Math.min(maxW, Math.floor(cardRoom / 1.65)));
  const ch = Math.round(cw * 1.65);
  // centre the cards + panel block between the header and the footer
  const blockH = ch + labelH + 110 + panelH;
  const top = y + 30 + Math.max(0, (footerTop - 40 - (y + 30) - blockH) / 2);
  const x0 = (W - (n * cw + (n - 1) * gap)) / 2;
  cardImgs.forEach((im, i) => {
    const c = opts.cards[i];
    const x = x0 + i * (cw + gap);
    const tilt = n === 1 ? -0.035 : (i - (n - 1) / 2) * 0.05;
    ctx.save();
    ctx.translate(x + cw / 2, top + ch / 2);
    ctx.rotate(tilt + (c.rev ? Math.PI : 0));
    ctx.shadowColor = 'rgba(255,220,150,.45)'; ctx.shadowBlur = 60;
    ctx.drawImage(im, -cw / 2, -ch / 2, cw, ch);
    ctx.restore();
    if (c.label) {
      ctx.font = "600 30px 'Mali', cursive";
      const tw = ctx.measureText(c.label).width + 40;
      ctx.fillStyle = 'rgba(255,246,232,.94)';
      roundRect(ctx, x + cw / 2 - tw / 2, top + ch + 26, tw, 50, 25); ctx.fill();
      ctx.fillStyle = '#5B3F78';
      ctx.fillText(c.label, x + cw / 2, top + ch + 62);
    }
  });

  // text panel
  const pTop = top + ch + labelH + 110;
  ctx.fillStyle = 'rgba(255,248,238,.96)';
  roundRect(ctx, px, pTop, pw, panelH, 48); ctx.fill();
  // pet badge on the panel edge
  ctx.fillStyle = '#FFF4E2';
  ctx.beginPath(); ctx.arc(W / 2, pTop, 62, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 5; ctx.strokeStyle = '#D9B46A'; ctx.stroke();
  if (pet) ctx.drawImage(pet, W / 2 - 46, pTop - 46, 92, 92);
  ctx.fillStyle = '#7A5A98';
  ctx.font = "600 32px 'Mali', cursive";
  ctx.fillText('น้อง' + opts.petName, W / 2, pTop + 108);

  let ty = pTop + 180;
  ctx.fillStyle = '#43305A';
  ctx.font = "700 52px 'Mali', cursive";
  head.forEach((l) => { ctx.fillText(l, W / 2, ty); ty += 66; });
  ty += 14;
  ctx.fillStyle = '#5E4B72';
  ctx.font = "400 34px 'IBM Plex Sans Thai Looped', sans-serif";
  bodyLines.forEach((l) => { if (l) ctx.fillText(l, W / 2, ty); ty += l ? lh : lh * 0.5; });

  // footer
  ctx.fillStyle = '#F1D5A2';
  ctx.font = "700 36px 'Mali', cursive";
  ctx.fillText('ร้านไพ่เหมียวจันทร์', W / 2, H - 84);
  ctx.fillStyle = '#D9C6E6';
  ctx.font = "400 26px 'IBM Plex Sans Thai Looped', sans-serif";
  ctx.fillText(opts.footer || 'ดูดวงไพ่ยิปซีให้น้องเจ้าตัวเล็ก', W / 2, H - 40);

  return new Promise((ok, fail) => {
    try { cv.toBlob((b) => (b ? ok(b) : fail(new Error('blob'))), 'image/png'); } catch (e) { fail(e); }
  });
}
