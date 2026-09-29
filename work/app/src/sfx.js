// Sound effects made in the browser with Web Audio — no extra audio files.
// riffle(): the deck being shuffled and fanned out · flip(): a card turning over.
// They follow the same speaker button as the music (see main.js).

let ctx = null;
let noise = null;
let enabled = () => true;

export function setSfxEnabled(fn) { enabled = fn; }

// Browsers only allow audio after a tap, so the context is created/resumed on the first tap.
function unlock() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      const len = Math.floor(ctx.sampleRate * 0.5);
      noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) { /* no audio available */ }
}
['pointerdown', 'keydown', 'touchstart'].forEach((ev) => document.addEventListener(ev, unlock, { capture: true, passive: true }));

const ready = () => ctx && noise && ctx.state === 'running' && enabled() && !document.hidden;

// one short burst of filtered noise
function burst(t, { dur = 0.02, freq = 3000, q = 1.2, type = 'bandpass', gain = 0.3, attack = 0.002, sweepTo = 0 }) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(ctx.destination);
  src.start(t, Math.random() * 0.4, dur + 0.05);
}

// a soft, high bell — the little bit of magic
function chime(t, freq, gain = 0.05, dur = 0.9) {
  [1, 2.01].forEach((m, i) => {
    const o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = freq * m;
    const g = ctx.createGain();
    const v = i ? gain * 0.35 : gain;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.05);
  });
}

// cards riffling together: a quick run of paper clicks that speeds up then settles, and a soft tap at the end
export function riffle() {
  if (!ready()) return;
  const t0 = ctx.currentTime + 0.01;
  const n = 26;
  let t = t0;
  for (let i = 0; i < n; i++) {
    const p = i / (n - 1);
    const gap = 0.034 - 0.02 * Math.sin(Math.PI * p); // fast in the middle
    burst(t, { dur: 0.018 + Math.random() * 0.01, freq: 2600 + Math.random() * 1800, q: 1.4, gain: 0.16 + 0.12 * Math.sin(Math.PI * p) });
    t += gap + Math.random() * 0.006;
  }
  burst(t + 0.02, { dur: 0.09, freq: 420, type: 'lowpass', q: 0.7, gain: 0.35, attack: 0.004 });
  burst(t + 0.02, { dur: 0.04, freq: 1800, q: 1, gain: 0.12 });
}

const NOTES = [1318.5, 1568, 1760, 2093, 2349.3]; // E6 G6 A6 C7 D7
// a card turning over: a short swish of air, a light snap, and a faint chime
export function flip() {
  if (!ready()) return;
  const t = ctx.currentTime + 0.01;
  burst(t, { dur: 0.16, freq: 700, sweepTo: 3200, q: 0.9, gain: 0.22, attack: 0.03 });
  burst(t + 0.15, { dur: 0.025, freq: 3400, q: 1.5, gain: 0.2 });
  chime(t + 0.17, NOTES[Math.floor(Math.random() * NOTES.length)]);
}
