// Google Analytics events. gtag is set up in index.html; if it is blocked (ad blocker, offline) nothing happens.
export function track(name, params) {
  try { if (typeof window.gtag === 'function') window.gtag('event', name, params || {}); } catch (e) { /* ignore */ }
}
