# LiftBoard — working rules for Claude

You are building LiftBoard, a mobile-first tool in a personal tools dashboard, for someone who does not read JavaScript. The full specification is `SPEC.md` in this folder. Read all of it before writing any code, and treat it as the source of truth — over the mockups in `design/`, and over your own defaults.

## The product in one line

A dashboard of lifts: open it mid-workout, filter by tag, see last session and whether it's trending up (↗), a record (🔥) or stale (❄️), tap, adjust the prefilled sets, log. Everything serves that loop.

## Where this lives

This folder is `tools/liftboard/` inside the dashboard repo. It must follow the dashboard's conventions:
- `index.html` carries the four dashboard `<meta>` tags from SPEC.md → Dashboard metadata.
- All persistence goes through `../../shared/persist.js` (`syncedState('liftboard')`, then `get`/`set`/`onStatus`). `app.js` imports it (dynamically, so a failed load can be caught) and hands it to `createStore`; nothing else imports it. Its real behavior is written up in SPEC.md → Persistence. Never edit it — it isn't LiftBoard's.
- Serve the dashboard root to run it: `python3 -m http.server 8000 --directory ../..`, then open `/tools/liftboard/`.

## How to work

- Build one phase at a time, in the order in SPEC.md → Build phases. Finish a phase, then stop.
- A phase is finished only when `node --test "tests/*.test.js"` passes, the page loads with no console errors, and you've listed its acceptance checks for me to try. Never report a phase done because the code looks right.
- Work on the `liftboard` branch. After I confirm the checks pass, commit as `LiftBoard: Phase 3 — Card grid` and push the branch as a backup. Never commit a phase that failed. Only ever stage files inside `tools/liftboard/`; leave other tools' uncommitted changes alone. The branch merges into `main` in Phase 7.
- Change only what the current phase needs. Don't refactor earlier phases, and don't touch anything outside this folder.
- If the spec is ambiguous, contradictory, or seems wrong — or `persist.js` doesn't behave as SPEC.md assumes — stop and ask. Don't guess.
- Explain what you did in plain language: tell me what to look at, not how the code works.

## Hard rules (the reasons are in SPEC.md)

- Vanilla HTML, CSS and ES modules. No framework, no build step, no bundler, no TypeScript, no npm runtime dependencies.
- No `localStorage`, `sessionStorage`, IndexedDB or cookies, and no local fallback storage. `store.js` is the only file that calls `persist.js`'s `get`, `set` or `onStatus`.
- Show *Loading…* while `persist.js` loads, and the *couldn't connect* message if its import fails. Load saved state before first render; save on every change; show save state with the sync dot (`persist.js`'s `set` never reports failure).
- No network requests of LiftBoard's own: no CDNs, no Google Fonts links, no analytics. Fonts and icons are self-hosted or inlined. (`persist.js`'s Firebase traffic is the dashboard's, not LiftBoard's.)
- No service worker, manifest, or install flow.
- `derive.js` is pure: no DOM, no storage. It's where every derived number comes from.
- Never store anything that can be calculated. The PR, ↗, 🔥 and ❄️ are computed from `sessions` every time.
- Every record has a stable id — never an array index, never a name. Lifts and tags: `crypto.randomUUID()`. Sessions: `s-` plus 8 random characters, unique within their lift.
- Only `store.logSession` creates sessions or writes `lastSets` (import aside). Only session delete and `pruneHistory` remove sessions.
- Never overwrite saved data that failed to load or validate.
- Every color, font and font size comes from `tokens.css`. No hex values, font names or raw font sizes anywhere else. Spacing and radii are plain values in `style.css`.
- Stored weights and e1RMs are kg rounded to 2 decimals. Scores within 0.01 are ties. A log row left as prefilled keeps its original kg.
- Insert user-typed text with `textContent`, never `innerHTML`.
- Relative paths only. Every input's font size is at least 16px.
- Keep every JS file under about 250 lines.
- Don't build anything listed as deferred.
