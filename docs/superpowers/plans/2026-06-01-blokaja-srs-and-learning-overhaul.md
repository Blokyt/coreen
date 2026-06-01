# Blokaja SRS & Learning Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the flashcard scheduler (the "same cards loop / no new cards" bug), fix data/coherence issues, add learning features (configurable direction, hints, typing, audio, session feedback), polish settings, expand quality tooling, and ship a build with the correct icon.

**Architecture:** Vanilla JS single file (`app.js`), no bundler. The fix replaces the mutable "deck array + splice duplicates + occasional re-sort" scheduling with a **pure `pickNext()` selector** that chooses the highest live-priority eligible card each call (so card `due` times and the daily cap are respected, suspended cards are filtered, and no duplicate entries ever accumulate). SRS math (`srsAgain/Hard/Good/Easy`, fuzz, ease) is already well-tested and unchanged. Data lives in canonical `data/course_data.json` (root), synced to `www/` by `rebuild-apk.py`. Quality is gated by `check_quality.py` + `bun test`.

**Tech Stack:** Vanilla JS, Capacitor 8 (Android), bun (tests + package manager), `@capacitor-community/text-to-speech` (native TTS), `@capacitor/assets` (icon generation), Python (quality scripts), Firefox/Brave MCP (browser verification).

---

## Root cause (confirmed by reproduction `tests/repro_deck.js`)

Over 300 simulated answers (unlimited mode, 30 cards): deck grew 30→200 (170 duplicate refs), only 2 re-sorts, 143 back-to-back repeats, avg 6/30 distinct cards per 20-card window, top-5 cards = 73% of shows. Cause: `answer()` does `deck.splice(reinsert,0,it)` on every Again/Hard-non-review and never removes entries; `fi` advances 1/answer while the deck also grows 1/lapse, so `fi` never reaches `deck.length` and the only re-sort/priority path (`showCard` wrap) starves. New cards at their initial positions are never reached → "no new cards in unlimited mode". Both reported symptoms share this single root cause.

---

## Phase roadmap

- **Phase 1 — Scheduler refactor** (this plan, full detail below). Fixes: same-cards loop, no-new-cards, suspended re-entry, NaN sort, priority inversion, soft daily cap. *Crown jewel, do first.*
- **Phase 2 — Native TTS** (`@capacitor-community/text-to-speech`) + listening option; web fallback.
- **Phase 3 — Romanization toggle (Q1a) + hint button (O3)** (reveal romanization without flipping).
- **Phase 4 — Review direction (O1: KR→FR / FR→KR / mixte) + typing mode (O2, optional input, `lang="ko"`, romanization fallback, lenient check).**
- **Phase 5 — Learning bundle:** examples/notes on back, end-of-session summary, "due today" + streak on home, keyboard shortcuts (1-4, Space).
- **Phase 6 — Settings visual polish** (toggle switch, sections) + integrate new settings.
- **Phase 7 — Data corrections** (factual errors, ~43 missing accents, romanization conflicts, Hangeul RR alignment, W006 descriptions). Parallelizable via sub-agents.
- **Phase 8 — Quality tooling**: expand `check_quality.py` (accent dictionary, romanization-conflict detector, french-equals-romanization, whitespace/typo, hangeul validity) + new standalone scripts + more unit tests.
- **Phase 9 — Icon regen (`@capacitor/assets`) + debug APK build + Firefox MCP verification.**

Phases 2-6 are mostly independent UI features on `app.js`; 7-8 are independent and sub-agent-friendly; 9 is last. Later phases are expanded to full TDD task detail just-in-time when reached.

---

## Phase 1 — Scheduler refactor (full detail)

**Files:**
- Modify: `app.js` (srsPriority not-yet-due branch; add `pickNext` + `RECENT_GUARD`; rewrite `startFc`/`showCard`/`answer`/`undoLastAnswer`/`suspendCard`; split render out of `showCard`; export `pickNext`).
- Test: `tests/scheduler.test.js` (new).
- Reference: `tests/repro_deck.js` (kept as documentation of the original bug).

### Design

```js
const RECENT_GUARD = 8; // don't repeat a card within the last N shows (when deck > N)

// Pure selector. Reads module P + settings via srsPriority/refreshNewLimit.
// items: array of {id, _c, ...} (the unique working set). recent: ids shown recently (oldest..newest).
// Returns the item to show next, or null if nothing is eligible.
function pickNext(items, recent) {
  refreshNewLimit();
  const elig = items.filter(it => srsPriority(it) > -Infinity); // drops suspended + over-cap new
  if (!elig.length) return null;
  const guard = new Set(recent.slice(-RECENT_GUARD));
  let pool = elig.filter(it => !guard.has(it.id));
  if (!pool.length) pool = elig; // tiny deck: relax the guard
  let best = pool[0], bestP = srsPriority(best);
  for (let i = 1; i < pool.length; i++) {
    const p = srsPriority(pool[i]);
    if (p > bestP) { best = pool[i]; bestP = p; continue; }
    if (p === bestP) {
      const da = P[best.id]?.due || 0, db = P[pool[i].id]?.due || 0;
      if (db < da || (db === da && pool[i].id < best.id)) best = pool[i];
    }
  }
  return best;
}
```

`srsPriority` fix (not-yet-due review branch): replace
`return Math.min(4999, -(overdue / 60000));`
with
`return -Math.min(Math.abs(overdue) / 60000, 1e7);`
so a review due sooner ranks higher (closer to 0) and all not-yet-due reviews stay far below new cards (5000). Keeps the existing priority-order test passing.

Module state: replace `let deck = [], fi = 0, flipped = false, deckFlashable = []` with `let deck = [], flipped = false, deckFlashable = [], _recent = [], _cur = null`. Remove all `fi` usage and all `deck.splice` re-insertion.

### Tasks

- [ ] **1.1 Write failing scheduler test** — `tests/scheduler.test.js`: (a) new cards all introduced (no starvation) in unlimited mode while some cards are repeatedly failed; (b) no card repeats within RECENT_GUARD when deck>guard; (c) a failed card returns within a bounded number of steps; (d) hard daily cap never introduces > limit new cards; (e) suspended never returned; (f) srsPriority: sooner-due not-yet-due review > later-due. Drive loop with `pickNext` + `srs*` on an overridden `Date.now`.
- [ ] **1.2 Run test → expect FAIL** (`pickNext is not a function`). Run: `bun test tests/scheduler.test.js`.
- [ ] **1.3 Implement** `RECENT_GUARD` + `pickNext`, fix `srsPriority`, add to `module.exports`.
- [ ] **1.4 Run test → expect PASS**, plus full `bun test tests/` stays green (36+).
- [ ] **1.5 Wire into app.js**: rewrite `startFc` (filter suspended at build; `deck=deckFlashable`; reset `_recent`/`_cur`), split `showCard` into `showCard` (pick via `pickNext`→`_cur`, push `_recent`, route null to session-end) + `renderCurrentCard` (renders `_cur`); rewrite `answer` (no splice; snapshot `_recent`/`_cur` for undo), `undoLastAnswer` (restore `_recent`/`_cur`, re-render), `suspendCard` (set flag + `showCard`); change `flip()` `deck[fi]`→`_cur`.
- [ ] **1.6 Fix suspended in counts**: exclude `P[id]?.suspended` in home/list `stateCounts` inputs (bug #6).
- [ ] **1.7 Fix "Aucun resultat" → "Aucun résultat"** (`doSearch`).
- [ ] **1.8 Verify**: `bun test tests/` green; `python check_quality.py` OK; manual serve + Firefox MCP smoke (flip, grade, new cards appear, suspended stays gone). 
- [ ] **1.9 Commit** `fix(srs): replace duplicate-accumulating deck with pure pickNext scheduler`.

---

## Phases 2-9 — task headlines (expanded just-in-time on execution)

**Phase 2 (TTS):** `bun add @capacitor-community/text-to-speech`; new `speakKr` tries `TextToSpeech.speak({lang:'ko-KR'})` (Capacitor native) and falls back to Web Speech with `voiceschanged` wait + ko-KR voice pick; setting "lire l'audio à l'affichage". Verify on device after build.

**Phase 3 (romanization toggle + hint):** setting `showRomanization` (default true); gate front-sub romanization (keep Hangeul answer). Hint button on front reveals `getRom(it)` in place, no flip; styled, `stopPropagation`.

**Phase 4 (direction + typing):** setting `direction` (`kr-fr`|`fr-kr`|`mixed`); `buildFront/Back` swap by direction; expressions normalized to obey it. Optional `<input lang="ko" inputmode="text">` per card; lenient compare (trim, lowercase, strip spaces); accepts romanization for production; typing optional (flip still works).

**Phase 5 (learning bundle):** show `it.notes`/`examples` on back when present; `showSessionDone()` summary (counts + accuracy); home "dû aujourd'hui" + streak (localStorage `blokaja4_streak`); keydown 1-4 + Space.

**Phase 6 (settings visual):** CSS toggle switch replacing raw checkboxes; grouped sections; wire new settings; keep theme tokens.

**Phase 7 (data):** sub-agents (sonnet, accents-preserved) apply corrections from the audit; `python check_quality.py` must pass; spot-verify each change.

**Phase 8 (quality tooling):** expand `check_quality.py` W004 to a broad accent dictionary; add romanization-conflict (same korean→different romanization), french==romanization, whitespace/double-space, hangeul-validity rules; new scripts as needed; add unit tests for new app logic.

**Phase 9 (icon + build):** `bun add -d @capacitor/assets`; generate from `icon-512.png` (+ adaptive); `python rebuild-apk.py` (debug APK); verify launcher icon is the new one.

---

## Self-review notes
- Spec coverage: every approved item maps to a phase (scheduler→1, son→2, romanisation→3, indice→3/O3, direction→4/O1, saisie→4/O2, audio/examples/summary/streak/shortcuts→5, settings visual→6, data→7, scripts→8, icon/build→9). FSRS intentionally excluded per user.
- No silent caps: daily cap is now a real hard cap (Phase 1) with truthful UI.
- Type consistency: `pickNext(items, recent)`, `_cur`, `_recent`, `renderCurrentCard()` used consistently across tasks.
