// Madame's greeting lines for a returning visitor.
import { INFO } from '../data.js';
import { isBirthday, daysToBirthday, ageText, nextReward } from '../extras.js';
import { D, todayKey, yesterdayKey, P, nameOf, dname, availablePets, doneFor } from '../state.js';

// Lines Madame says when a known visitor walks back in.
export function greetingLines() {
  const p = P(), name = dname(), now = new Date(), h = now.getHours();
  const tod = h < 11 ? 'อรุณสวัสดิ์' : h < 17 ? 'สวัสดียามบ่าย' : 'ค่ำนี้ดาวสวยเชียว';
  const hello = [
    `เมี้ยว~ ${tod}จ้ะ น้อง${name} กลับมาหาข้าอีกแล้ว`,
    `${tod}จ้ะ ข้ารู้อยู่แล้วว่าวันนี้น้อง${name}ต้องแวะมา ลูกแก้วกระซิบบอก`,
    `อ้าว น้อง${name} มาแล้ว! ${tod}จ้ะ เข้ามานั่งก่อน`,
    p.pet === 'dog' ? `${tod}จ้ะ ได้ยินเสียงหางน้อง${name}กระดิกมาแต่ไกลเลย` : `${tod}จ้ะ น้อง${name} ย่องมาเงียบ ๆ แบบแมวแท้ ข้าก็ยังรู้นะ`
  ];
  const lines = [hello[now.getDate() % hello.length]];
  const extra = [];
  // birthdays come first
  if (isBirthday(p.petBirthday, now)) {
    const age = ageText(p.petBirthday, now);
    extra.push(`วันนี้วันเกิดน้อง${name}! สุขสันต์วันเกิด${age ? 'ครบ ' + age : ''}จ้ะ ขอให้น้องแข็งแรง มีความสุขมาก ๆ นะ`);
  } else {
    const dd = daysToBirthday(p.petBirthday, now);
    if (dd > 0 && dd <= 7) extra.push(`อีก ${dd} วันก็วันเกิดน้อง${name}แล้วนะ เตรียมของขวัญไว้หรือยังจ๊ะ`);
  }
  availablePets().filter((q) => q.id !== p.id && isBirthday(q.petBirthday, now)).forEach((q) => extra.push(`วันนี้วันเกิดน้อง${nameOf(q)}ด้วยนะ! อย่าลืมกอดน้องแน่น ๆ ล่ะ`));
  if (isBirthday(D.ownerBirthday, now)) extra.push('แล้ววันนี้ก็เป็นวันเกิดของเจ้าด้วยนี่! ขอให้เจ้ากับน้องมีความสุขมาก ๆ นะจ๊ะ');
  // yesterday's card
  const y = p.journal.find((e) => e.mk === 'daily' && e.id.endsWith(yesterdayKey()));
  if (y && INFO[y.cards[0]]) extra.push(`เมื่อวานน้องได้${INFO[y.cards[0]].th} “${y.key}” เป็นอย่างที่ไพ่บอกไหมจ๊ะ`);
  // streak
  const st = D.streak;
  if (st.last === todayKey()) extra.push(`วันนี้เปิดไพ่ไปแล้ว มาหาข้าต่อเนื่อง ${st.count} วันเลยนะ เก่งมาก`);
  else if (st.last === yesterdayKey() && st.count > 1) extra.push(`มาหาข้าติดกัน ${st.count} วันแล้ว วันนี้เปิดไพ่ต่อเป็นวันที่ ${st.count + 1} กันเถอะ`);
  else if (st.last === yesterdayKey()) extra.push('เมื่อวานก็มาหาข้า วันนี้เปิดไพ่อีกครั้งจะได้นับเป็น 2 วันติดกันเลยนะ');
  else if (st.days > 0) extra.push('หายไปหลายวันเลย ข้าคิดถึงนะ วันนี้มาเริ่มนับวันใหม่กันจ้ะ');
  const nr = nextReward(st.days);
  if (nr && st.last !== todayKey()) extra.push(`อีก ${nr.days - st.days} วันจะได้ “${nr.name}” นะ`);
  // other pets still waiting
  const waiting = availablePets().filter((q) => q.id !== p.id && !doneFor('daily', q)).map(nameOf);
  if (waiting.length) extra.push(`วันนี้น้อง${waiting.slice(0, 2).join(' กับน้อง')} ยังไม่ได้เปิดไพ่เลยนะ`);
  return lines.concat(extra.slice(0, 3));
}
