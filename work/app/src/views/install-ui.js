// "Install on your home screen" nudge and instructions.
import { ICON } from '../icons.js';
import { installKind, isLine } from '../install.js';
import { D, S, todayKey } from '../state.js';

// shown under a finished reading, at most once every 3 days after "ไว้ทีหลัง"
export function installNudgeHTML() {
  const k = installKind();
  if (!k) return '';
  if (D.installSnooze && (new Date(todayKey()) - new Date(D.installSnooze)) / 86400000 < 3) return '';
  return `<div class="install-card">${ICON.phone}<span><b>เก็บร้านไว้บนหน้าจอมือถือ</b><small>เปิดหามาดามได้ในแตะเดียว เล่นได้แม้ไม่มีเน็ต และข้อมูลของน้องปลอดภัยกว่าเดิม</small></span>
    <div class="install-acts"><button class="btn-primary small" data-act="install">ติดตั้ง</button><button class="link-btn" data-act="installLater">ไว้ทีหลัง</button></div></div>`;
}

export function installHTML() {
  const k = S.install;
  let body;
  if (k === 'ios') {
    body = `<h2>ติดตั้งร้านไว้บนหน้าจอ</h2>
      <ol class="steps">
        <li><span class="step-n">1</span><div>แตะปุ่ม <b>แชร์</b> ${ICON.share} ของ Safari <small>(แถบล่างของจอ · ถ้าใช้ Chrome อยู่มุมขวาบน)</small></div></li>
        <li><span class="step-n">2</span><div>เลื่อนลงแล้วเลือก <b>“เพิ่มไปยังหน้าจอโฮม”</b></div></li>
        <li><span class="step-n">3</span><div>แตะ <b>“เพิ่ม”</b> มุมขวาบน แล้วเปิดร้านจากไอคอนมาดามโมจิได้เลย</div></li>
      </ol>
      <p class="note">เปิดจากไอคอนบนหน้าจอเสมอนะ ข้อมูลของน้องจะไม่ถูก Safari ลบเมื่อไม่ได้เข้าหลายวัน</p>`;
  } else if (isLine) {
    body = `<h2>เปิดในเบราว์เซอร์ก่อนนะ</h2>
      <div class="body">ในแอป LINE ติดตั้งร้านไม่ได้ ต้องเปิดใน Safari หรือ Chrome ก่อน แล้วค่อยเพิ่มไว้บนหน้าจอ</div>
      ${D.met ? '<div class="notice">ข้อมูลที่เล่นในแอป LINE จะไม่ย้ายตามไปที่เบราว์เซอร์ ในเบราว์เซอร์จะเริ่มต้นใหม่จ้ะ</div>' : ''}
      <button class="btn-primary" data-act="openBrowser">เปิดในเบราว์เซอร์</button>`;
  } else {
    body = `<h2>เปิดในเบราว์เซอร์ก่อนนะ</h2>
      <div class="body">แอปนี้ติดตั้งร้านไม่ได้ แตะเมนู <b>⋯</b> มุมขวาบน แล้วเลือก <b>“เปิดในเบราว์เซอร์”</b> จากนั้นค่อยเพิ่มร้านไว้บนหน้าจอ</div>
      ${D.met ? '<div class="notice">ข้อมูลที่เล่นในแอปนี้จะไม่ย้ายตามไปที่เบราว์เซอร์ ในเบราว์เซอร์จะเริ่มต้นใหม่จ้ะ</div>' : ''}`;
  }
  return `<div class="modal install-modal" role="dialog" aria-modal="true" aria-label="ติดตั้งร้านไว้บนหน้าจอ">
    <button class="modal-bg" data-act="installClose" aria-label="ปิด"></button>
    <div class="modal-box install-box"><img class="install-ico" src="./icons/icon-192.png" alt="" width="84" height="84">${body}<button class="link-btn" data-act="installClose">ปิด</button></div>
  </div>`;
}
