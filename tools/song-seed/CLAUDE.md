# Song Seed — Rules for Claude Code

Read this file, SPEC.md and PLAN.md before every session. Also read DESIGN.md and tokens.css if DESIGN.md exists. **SPEC.md decides what to build. DESIGN.md decides how it looks.** If they disagree, follow SPEC and tell me.

## How we work
- **One PLAN step per session.** Don't start the next step, and don't fix unrelated things on the way. If you notice a problem, list it at the end instead.
- Before changing anything, tell me in two or three lines what you'll create or change.
- **Never run git commands that change the repo** (`add`, `commit`, `push`, `checkout`, `reset`, `stash`…). Read-only commands (`status`, `diff`, `log`) are fine.
- Finish every step with: files changed, test results, a short "how to check it" list, anything you were unsure about, and a suggested commit message in this form:
  `Song Seed: <step id> — <short title>`
- If something isn't covered by SPEC.md, ask instead of guessing. Keep it simple: the fewest features that do the job.

## Stack
- Vanilla HTML/CSS/JS with ES modules. No frameworks, no build step, no npm dependencies.
- Audio uses the Web Audio API directly (`audio.js`). Don't add Tone.js or any other library without asking. If a library is needed, prefer the vetted list in the repo context (Lucide for icons).
- Preview: run `python3 -m http.server` from the **repo root** and open `localhost:8000/tools/song-seed/`. Opening the file directly doesn't work (modules and `persist.js` need a server).

## Code rules
- **Pure modules stay pure.** `theory.js`, `loop.js`, `randomize.js`, `idea.js`, `library.js`, `midi.js`, `strum-editor.js`, `midi-import.js`, `my-library.js`, `progression-editor.js`, `groove-editor.js` and `data/*` must not touch the DOM, `window`, `localStorage` or audio. They must run in Node.
- **Randomness is injectable.** Functions that roll take an `rng` argument (default `Math.random`) so tests can pass `seededRng(n)`.
- **No mutation of the idea.** Every change makes a new idea object and goes through `setIdea()` in `app.js`, which handles history, the URL, `song-seed:last` and rendering.
- **Time is bars and steps, never seconds.** Only `audio.js` turns steps into seconds. Don't hard-code `16` steps per bar; use `meterInfo(meter)`.
- **Chords stay Roman numerals** everywhere except the display and audio. Colour is applied by `colorize()` at compile time, never written into stored numerals.
- **The idea shape is a contract** (SPEC §2). If you change it: bump `IDEA_VERSION`, migrate old ideas inside `validateIdea()`, and add a test that loads an old idea. Old share links and favourites must keep working.
- **Library data:** ids follow `(groove|strum|prog)_words_NN` and match the Logic pack filenames. Never rename an existing id (saved favourites point at it). New patterns must pass `tests/data.test.js`.
- No `confirm()`, `prompt()` or `alert()`. Use in-page UI (the two-tap delete, the toast).
- Build DOM with `textContent` / `createElement` for anything that comes from data or a link. Only static markup and the icon SVGs may use `innerHTML`.

## Styling rules
- Every colour, size, font, radius, shadow and timing comes from `tokens.css`. **Don't add raw values to `style.css`** except `0`, `1px` borders, percentages and layout numbers like grid spans. If a value is missing, add a token. (A few small raw sizes remain from v1; they move to tokens in the design step.)
- Light and dark both work (dark overrides live in `tokens.css`). Reduced motion is handled at token level.
- Tap targets are at least 44px. The page works at 360px wide with no sideways page scroll (the timeline scrolls inside its own box).
- Never rely on colour alone. Drum hits use shape and size as well; mute chips also strike through.

## Storage rules
- Synced data goes through `shared/persist.js` (`syncedState('song-seed')`, then `store.get` / `store.set`). The import is wrapped in try/catch with a localStorage fallback, and the indicator shows **Synced**, **Syncing…** (a write in flight) or **This device**. Today `favorites`, `strums` (My strums), `grooves` (My grooves) and `progressions` (My progressions) are synced, in the same doc.
- Per-device conveniences (last idea, locks, prefs) stay in localStorage under `song-seed:*`, with every read and write in try/catch.
- Persisted ids come from content or time, never array indexes.
- Don't sync anything that could grow without limit without splitting it (Firestore docs cap at 1 MB).

## Testing
- Run `npm test` (or `node --test`) inside `tools/song-seed/`. All tests must pass before a step is done.
- Add tests for any new pure logic. Use seeded rngs, and loop many rolls for anything random.
- For UI changes, give me a manual "how to check it" list, and check light, dark and 360px yourself if you can run a browser.
