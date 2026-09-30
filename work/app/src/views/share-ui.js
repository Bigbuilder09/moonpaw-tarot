// Share-as-image: options for the picture and the share modal.
import interiorPortrait from '../assets/parlour-portrait.webp';
import { ICON } from '../icons.js';
import { ageText, compatInfo, BLESS, HEART } from '../extras.js';
import { D, S, todayKey, thDate, LBL, R, P, dname } from '../state.js';

export function shareOpts() {
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

export const shareName = () => `soulmysty-${S.mode}-${todayKey()}.png`;

export function shareHTML() {
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
