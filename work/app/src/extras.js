// Content and rules for the retention features: streak rewards, birthday + compatibility
// readings, the "heart" reading and Madame Mochi's returning-visitor greeting helpers.

/* ---------------------------------------------------------------- dates */
const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const parseDate = (s) => { const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(s || ''); return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null; };
const DAY = 86400000;
const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Is `birthday` (YYYY-MM-DD) today? */
export function isBirthday(birthday, now = new Date()) {
  const b = parseDate(birthday);
  return !!b && b.m === now.getMonth() && b.d === now.getDate();
}
/** Whole days until the next birthday (0 = today). */
export function daysToBirthday(birthday, now = new Date()) {
  const b = parseDate(birthday);
  if (!b) return -1;
  const t = midnight(now);
  let next = new Date(t.getFullYear(), b.m, b.d);
  if (next < t) next = new Date(t.getFullYear() + 1, b.m, b.d);
  return Math.round((next - t) / DAY);
}
/** Age the pet turns on its most recent birthday, e.g. "3 ขวบ" or "5 เดือน". */
export function ageText(birthday, now = new Date()) {
  const b = parseDate(birthday);
  if (!b) return '';
  let months = (now.getFullYear() - b.y) * 12 + now.getMonth() - b.m - (now.getDate() < b.d ? 1 : 0);
  if (months < 0) return '';
  if (months < 12) return months < 1 ? 'เพิ่งเกิด' : months + ' เดือน';
  return Math.floor(months / 12) + ' ขวบ';
}
/** The birthday reading opens on the birthday and stays open for BDAY_WINDOW days after it. */
export const BDAY_WINDOW = 30;
export function bdayWindow(birthday, now = new Date()) {
  const b = parseDate(birthday);
  if (!b) return { open: false, until: -1 };
  const t = midnight(now);
  for (const y of [t.getFullYear(), t.getFullYear() - 1]) {
    const occ = new Date(y, b.m, b.d);
    const diff = Math.round((t - occ) / DAY);
    if (diff >= 0 && diff <= BDAY_WINDOW) return { open: true, year: String(y), daysLeft: BDAY_WINDOW - diff };
  }
  return { open: false, until: daysToBirthday(birthday, now) };
}

/* ---------------------------------------------------------------- zodiac + compatibility */
// [Thai sign name, element, last day of the sign in its closing month] listed from January
const SIGNS = [
  ['มังกร', 'earth', 19], ['กุมภ์', 'air', 18], ['มีน', 'water', 20], ['เมษ', 'fire', 19],
  ['พฤษภ', 'earth', 20], ['เมถุน', 'air', 20], ['กรกฎ', 'water', 22], ['สิงห์', 'fire', 22],
  ['กันย์', 'earth', 22], ['ตุลย์', 'air', 22], ['พิจิก', 'water', 21], ['ธนู', 'fire', 21]
];
export const EL_TH = { fire: 'ไฟ', earth: 'ดิน', air: 'ลม', water: 'น้ำ' };
const EL_PET = {
  fire: 'ร่าเริง กล้าหาญ พลังเหลือล้น', earth: 'ใจเย็น รักความสบาย ติดบ้าน',
  air: 'ขี้สงสัย ช่างสังเกต ชอบของใหม่', water: 'อ่อนโยน ขี้อ้อน อ่านใจเก่ง'
};
const EL_OWNER = {
  fire: 'กระตือรือร้น ชอบพาน้องไปลุย', earth: 'มั่นคง ดูแลน้องสม่ำเสมอ',
  air: 'ช่างคุย ชอบเล่นกับน้องแบบสร้างสรรค์', water: 'อ่อนไหว ใส่ใจความรู้สึกน้อง'
};
export function signOf(birthday) {
  const b = parseDate(birthday);
  if (!b) return null;
  const i = b.d <= SIGNS[b.m][2] ? b.m : (b.m + 1) % 12;
  return { name: SIGNS[i][0], el: SIGNS[i][1] };
}
const LEVELS = {
  same: [90, 'ใจตรงกันแบบไม่ต้องพูด', 'ธาตุเดียวกันทำให้เจ้ากับน้องเข้าใจกันง่าย จังหวะชีวิตคล้ายกัน แค่อยู่ด้วยกันก็อุ่นใจ'],
  comp: [88, 'เติมเต็มกันและกัน', 'ธาตุของเจ้ากับน้องหนุนกันพอดี คนหนึ่งให้ อีกคนรับ กลายเป็นคู่ที่ขาดกันไม่ได้'],
  learn: [80, 'ค่อย ๆ เรียนรู้กัน', 'จังหวะของเจ้ากับน้องต่างกันนิดหน่อย ถ้าใจเย็นและคอยสังเกตน้อง ความผูกพันจะแน่นขึ้นทุกวัน'],
  opp: [76, 'ต่างขั้วแต่ดึงดูด', 'นิสัยต่างกันคนละขั้ว แต่นั่นทำให้น้องพาเรื่องใหม่ ๆ มาให้เจ้าเสมอ และเจ้าก็เป็นที่พึ่งของน้อง']
};
const PAIR = { 'fire|air': 'comp', 'earth|water': 'comp', 'fire|earth': 'learn', 'air|water': 'learn', 'fire|water': 'opp', 'earth|air': 'opp' };
/** Compatibility between a pet and its owner from both birthdays plus the three cards drawn. */
export function compatInfo(petBd, ownerBd, rs) {
  const p = signOf(petBd), o = signOf(ownerBd);
  if (!p || !o) return null;
  const lv = p.el === o.el ? 'same' : PAIR[`${p.el}|${o.el}`] || PAIR[`${o.el}|${p.el}`];
  const [base, title, text] = LEVELS[lv];
  const seed = [...(petBd + ownerBd)].reduce((t, c) => t + c.charCodeAt(0), 0) % 5;
  const score = Math.max(60, Math.min(99, base + seed + rs.reduce((t, x) => t + (x.rev ? -2 : 3), 0)));
  return {
    pet: Object.assign({ trait: EL_PET[p.el] }, p), owner: Object.assign({ trait: EL_OWNER[o.el] }, o),
    level: lv, title, text, score
  };
}

/* ---------------------------------------------------------------- birthday blessing + heart reading */
export const BLESS = {
  major: 'ขอให้ปีใหม่ของน้องเต็มไปด้วยเรื่องดี ๆ ครั้งใหญ่ และความสุขที่ไม่คาดฝัน',
  wands: 'ขอให้น้องแข็งแรง ร่าเริง มีแรงวิ่งเล่นได้ทั้งปี',
  cups: 'ขอให้น้องได้รับความรักล้นใจ และมีคนกอดทุกวัน',
  swords: 'ขอให้น้องใจสงบ ปลอดภัย ผ่านทุกเรื่องไปได้อย่างสบายใจ',
  pentacles: 'ขอให้น้องกินอิ่ม นอนหลับ สุขภาพดี มีของอร่อยไม่ขาด'
};
// what the pet would say, by card group × [upright, reversed]
export const HEART = {
  major: ['เรารู้สึกว่าช่วงนี้มีอะไรพิเศษเกิดขึ้น อยู่ข้าง ๆ เราแบบนี้ต่อไปนะ', 'ช่วงนี้เรางง ๆ กับอะไรหลายอย่าง ค่อย ๆ ไปด้วยกันนะ ไม่ต้องรีบ'],
  wands: ['เรามีพลังเต็มเปี่ยม! พาเราไปเล่น ไปวิ่ง ไปลองอะไรใหม่ ๆ กันเถอะ', 'เราอยู่ไม่สุขเลย ช่วยหาอะไรสนุก ๆ ให้เราทำหน่อยได้ไหม'],
  cups: ['เรารักเจ้าของที่สุดในโลก กอดเราอีกทีได้ไหม', 'วันนี้ใจเราบางนิดหน่อย แค่นั่งเงียบ ๆ ข้างเราก็พอแล้ว'],
  swords: ['เรากำลังสังเกตทุกอย่างรอบตัว ขอมุมสงบ ๆ ให้เราได้พักหน่อยนะ', 'มีบางอย่างทำให้เรากังวล ช่วยปลอบเราหน่อยนะ'],
  pentacles: ['เรามีความสุขกับบ้านหลังนี้ ขอบคุณที่ดูแลเราดีขนาดนี้', 'ช่วยเช็คข้าว น้ำ และที่นอนของเราหน่อยนะ เราอยากสบายกว่านี้อีกนิด']
};

/* ---------------------------------------------------------------- streak rewards
   Unlocked by the total number of days with a daily reading, so missing a day never
   takes a reward away; the running streak is shown alongside for motivation. */
export const REWARDS = [
  { id: 'classic', days: 0, type: 'back', name: 'หลังไพ่ลายดั้งเดิม', desc: 'ลายไพ่ประจำร้าน' },
  { id: 'sakura', days: 3, type: 'back', name: 'หลังไพ่ซากุระชมพู', desc: 'มาครบ 3 วัน' },
  { id: 'gold', days: 7, type: 'back', name: 'หลังไพ่จันทร์ทอง', desc: 'มาครบ 7 วัน' },
  { id: 'heart', days: 10, type: 'reading', name: 'ดวงเสียงในใจน้อง', desc: 'ไพ่ 1 ใบ บอกว่าน้องอยากพูดอะไรกับเจ้าของ เปิดได้วันละครั้ง' },
  { id: 'stars', days: 14, type: 'deco', name: 'ดาวระยิบในร้าน', desc: 'ประดับดาวกะพริบทั่วห้องมาดาม' },
  { id: 'petals', days: 21, type: 'deco', name: 'กลีบดอกไม้โปรยปราย', desc: 'กลีบดอกไม้ชมพูร่วงเบา ๆ ในร้าน' },
  { id: 'night', days: 30, type: 'back', name: 'หลังไพ่ราตรีมรกต', desc: 'มาครบ 30 วัน' }
];
export const nextReward = (days) => REWARDS.find((r) => r.days > days) || null;
