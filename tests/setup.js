// Test setup: install browser globals (localStorage, document) before
// app.js is required. Each test file should require this first.

class MemoryStorage {
  constructor() { this.store = new Map(); }
  getItem(k) { return this.store.has(k) ? this.store.get(k) : null; }
  setItem(k, v) { this.store.set(k, String(v)); }
  removeItem(k) { this.store.delete(k); }
  clear() { this.store.clear(); }
}

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = new MemoryStorage();
}

// Minimal document stub: $() and $$() in app.js do querySelector calls during
// init() and renderHome(). The `if (typeof window !== 'undefined') init();`
// guard at the bottom of app.js skips that path entirely under bun:test, so
// we only need the bare minimum.
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    querySelector: () => null,
    querySelectorAll: () => [],
  };
}

// `window` is the trigger for init(). We deliberately leave it undefined so
// app.js skips browser bootstrap.

// Deterministic Math.random for fuzz testing. Tests can override per-case.
const _origRandom = Math.random;
globalThis._setRandom = (v) => { Math.random = () => v; };
globalThis._restoreRandom = () => { Math.random = _origRandom; };

// Helper to reset SRS state between tests.
globalThis._resetSrsState = (mod) => {
  localStorage.clear();
  mod._setP({});
};

module.exports = {};
