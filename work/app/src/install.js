// "Add to home screen" (PWA) support and persistent storage.
// Works when the game is served from a web address (https or localhost); opened as a
// local file it simply stays hidden.
const ua = navigator.userAgent;
export const isLine = /\bLine\//i.test(ua);
export const inApp = isLine || /FBAN|FBAV|Instagram|TikTok|musical_ly|Messenger/i.test(ua);
export const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const web = /^https?:$/.test(location.protocol);

export const standalone = () =>
  (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

let deferred = null;       // Chrome / Edge / Android install prompt, kept until the player asks for it
let onChange = () => {};

export function initInstall(cb) {
  onChange = cb;
  if (!web) return;
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; onChange('ready'); });
  window.addEventListener('appinstalled', () => { deferred = null; persistStorage(); onChange('installed'); });
}

/** What the game can offer right now: 'prompt' (one-tap install), 'ios' (show the steps),
 *  'inapp' (inside LINE / IG / FB — must open a real browser first) or null (nothing to offer). */
export function installKind() {
  if (!web || standalone()) return null;
  if (inApp) return 'inapp';
  if (deferred) return 'prompt';
  if (isIOS) return 'ios';
  return null;
}

export async function promptInstall() {
  if (!deferred) return false;
  const ev = deferred;
  deferred = null;
  ev.prompt();
  const r = await ev.userChoice.catch(() => null);
  onChange('prompted');
  return !!r && r.outcome === 'accepted';
}

/** LINE's in-app browser can hand the page to the phone's real browser. */
export function openExternal() {
  if (!isLine) return false;
  const u = new URL(location.href);
  u.searchParams.set('openExternalBrowser', '1');
  location.href = u.toString();
  return true;
}
export const askedExternal = () => new URLSearchParams(location.search).has('openExternalBrowser');

/** Ask the browser not to clear this game's data when space runs low or the site sits unused. */
export async function persistStorage() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch (e) { /* not supported */ }
  return false;
}
