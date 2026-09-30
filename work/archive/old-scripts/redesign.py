from pathlib import Path
p=Path('work/app/src/main.js')
s=p.read_text(encoding='utf-8')
s=s.replace("import interior from './assets/shop-interior.png';", "import interior from './assets/parlour-landscape.png';\nimport interiorPortrait from './assets/parlour-portrait.png';")
s=s.replace("import mochi from './assets/madame-mochi.png';\n",'')
s=s.replace('<img class="painted-room" src="${interior}" alt="" fetchpriority="high"><img class="madame-mochi" src="${mochi}" alt="มาดามโมจิ แมวหมอดูในผ้าคลุมดาวสีม่วง">','<img id="roomArt" class="painted-room" src="${interior}" alt="มาดามโมจิอยู่หลังโต๊ะ สมุดดวงทางซ้าย ลูกแก้วตรงกลาง และอัลบั้มไพ่ทางขวา" fetchpriority="high">')
s=s.replace('style="left:133px;top:456px"','class-placeholder="read"').replace('style="left:0;top:392px"','class-placeholder="journal"').replace('style="left:266px;top:392px"','class-placeholder="album"')
s=s.replace('class="spot" data-act="goRead" class-placeholder="read"','class="spot spot-read" data-act="goRead"').replace('class="spot" data-act="goJournal" class-placeholder="journal"','class="spot spot-journal" data-act="goJournal"').replace('class="spot" data-act="goAlbum" class-placeholder="album"','class="spot spot-album" data-act="goAlbum"')
s=s.replace('  <img class="welcome-mochi" src="${mochi}" alt="">\n','')
a=s.index('  <div class="street-title">');b=s.index('\n</div>\n</div>\n<div id="streetCta"',a)
title=s[a:b]
s=s[:a]+s[b:]
s=s.replace('<div id="streetCta"',title.replace('class="street-title"','id="streetTitle" class="street-title"')+'\n<div id="streetCta"',1)
s=s.replace("  $('street').classList.toggle('gone', s !== 'street');", "  stage.dataset.step = s;\n  $('streetTitle').hidden = s !== 'street';\n  $('street').classList.toggle('gone', s !== 'street');")
a=s.index('  const s = Math.max(H / 844, W / 1590);');b=s.index('\n  const k =',a)
s=s[:a]+'''  const portrait = W / H < 0.9 && S.step !== 'street';
  stage.classList.toggle('portrait-scene', portrait);
  const sceneW = portrait ? 1024 : 1536, sceneH = portrait ? 1536 : 1024;
  const side = wide && SIDE_STEPS.includes(S.step);
  const top = S.step === 'street' ? (H < 560 ? 108 : 156) : 78;
  const bottom = S.step === 'street' ? 108 : 100;
  const availableW = Math.max(240, W - (side ? 490 : 24));
  const availableH = Math.max(150, H - top - bottom);
  const scale = Math.min(availableW / sceneW, availableH / sceneH);
  const x = (side ? availableW : W) / 2 - sceneW * scale / 2;
  const y = top + (availableH - sceneH * scale) / 2;
  $('world').style.width = `${sceneW}px`;
  $('world').style.height = `${sceneH}px`;
  $('world').style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  stage.style.setProperty('--scene-scale', scale);
  const roomSource = portrait ? interiorPortrait : interior;
  if ($('roomArt').getAttribute('src') !== roomSource) $('roomArt').src = roomSource;
  stage.style.setProperty('--backdrop', `url("${S.step === 'street' ? exterior : roomSource}")`);''' +s[b:]
p.write_text(s,encoding='utf-8')
p=Path('work/app/src/app.css');s=p.read_text(encoding='utf-8');s=s[:s.index('/* Painted Moonpaw scenery;')];p.write_text(s,encoding='utf-8')
