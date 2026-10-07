# LiftBoard — Dashboard Tool Build Spec (SPEC.md)

## What LiftBoard is

A dashboard of every lift you track, on one screen, showing where you're at the moment you open it. It is built around one loop, used mid-workout, on a phone:

1. Open the app between sets.
2. Filter the board to today's lifts with a tag — Push, Legs, however you organise things.
3. Glance at the lift you're about to do: what you lifted last time, and whether it's trending up (↗), a record (🔥), or going stale (❄️).
4. Tap it. The log sheet opens with last session's sets already filled in.
5. Adjust them to what you actually did today, and tap Log Session.

That is the whole product. Everything in this spec either serves that loop or stays out of its way.

LiftBoard is a **scoreboard**, not a workout tracker: no workouts, routines, timers, or "start workout" button.

It is one tool in a personal tools dashboard — a static site on GitHub Pages that shows a grid of small HTML/CSS/JS tools. It follows the dashboard's conventions for file layout, metadata, and persistence, described below. LiftBoard itself has no account, no server, and no analytics, and makes no network requests of its own: all saving goes through the dashboard's shared `persist.js` module.

### Non-goals

Out of scope, and not to be built even partially. If a design question can be answered with "we don't do that," answer it that way.

- No accounts, login, or server of LiftBoard's own, and no storage other than the dashboard's `persist.js`
- No analytics, trackers, cookies, ads, or third-party requests — including fonts or scripts from CDNs
- No build step, bundler, transpiler, framework, or npm runtime dependencies
- No service worker, web app manifest, or install flow — those belong to the dashboard, not to a tool
- No multi-lift workouts, routines, programs, templates, rest timers, RPE, or tempo
- No set-level history — only the most recent session's sets are kept
- No tracking of the person's body weight, measurements, photos, or nutrition
- No notifications, social features, or payments

### Platform

A folder tool in the dashboard, at **`tools/liftboard/`**, entered through `tools/liftboard/index.html`. HTML, CSS, and JavaScript ES modules, loaded directly by the browser with no build step. **Mobile-first**: designed for a phone in portrait, with a slightly wider centered layout on desktop. It targets current Safari on iOS 17+, and current Chrome, Firefox, and Edge.

### Dashboard metadata

The dashboard reads four tags from `<head>` to list the tool in its grid. They're required, exactly as written:

```html
<title>LiftBoard</title>
<meta name="description" content="Log lifts and see your PRs at a glance">
<meta name="icon" content="chart">
<meta name="tags" content="fitness, tracker, chart">
```

`icon` must be one of the dashboard's closed set (checklist, flow, timer, palette, calculator, chart, compass, type, grid, ruler, clock, folder). `chart` fits a progress tracker best. Never invent a new icon key.

The dashboard's icon key is separate from LiftBoard's own icons (see Icons → Browser and Home Screen icons). The dashboard reads only `<title>` and the `<meta name>` tags, so the `<link rel="icon">` tags don't change how it lists the tool.

## Persistence

All saving goes through the dashboard's shared module, and nothing else. There's no `localStorage`, `sessionStorage`, IndexedDB, or cookies anywhere in LiftBoard.

```js
// app.js — a dynamic import, so a failed load can be caught and explained
const { syncedState } = await import('../../shared/persist.js');   // ../../ because LiftBoard is a folder tool
const persist = await syncedState('liftboard');
const store = createStore(persist);
// persist.get(key) / persist.set(key, value) / persist.onStatus(fn)
```

- The tool's docId is **`liftboard`**.
- **`app.js` imports `persist.js` and hands it to `createStore`;** it does nothing else with it. `store.js` is the only file that calls `get`, `set` or `onStatus`. (The import has to sit in `app.js`: the dashboard's `build-index.mjs` only looks for it in top-level scripts when deciding a tool is synced.)
- **Load before first render.** While `persist.js` loads, the page shows a plain *Loading…* message, in the default colors. Once `syncedState` resolves, `app.js` reads every key, applies the saved accent, and only then builds the first view, so the board never shows empty and then pops data in.
- **LiftBoard needs a connection to open.** `persist.js` loads Firebase from Google at import time. If that import fails — no signal and no cached copy — the page shows *"LiftBoard couldn't connect. Try again when you have signal."* There's no local fallback storage.
- **Save on every change.** Each store operation writes the key or keys it changed, immediately.

### How `persist.js` behaves (confirmed in Phase 0)

- `get(key)` returns the saved value, or `undefined` when there isn't one. It returns the module's own object, not a copy, so `store.js` deep-copies (`structuredClone`) what it loads.
- `set(key, value)` returns nothing and never throws. It saves on the device at once, then writes to Firestore in the background, and swallows any error.
- Values can be any JSON data, except that Firestore rejects `undefined` values and arrays nested directly in arrays. LiftBoard's data has neither; never store `undefined`.
- There's no way to list keys, which is why the key names below are fixed.
- `onStatus(fn)` reports `'synced'`, `'saved-locally'` (a write is in flight) or `'offline'` (the last cloud write or load failed). It's the only save signal there is.
- The first save in a browser may show a native passphrase prompt. That's `persist.js`'s, not LiftBoard's.
- All four keys live in one Firestore document, which is capped at 1 MiB. See History retention.

### Sync status

A small **sync dot** in the Board header, beside the wordmark, driven by `store.onSyncStatus` (a pass-through of `persist.onStatus`):

| Status | Dot | Label |
| --- | --- | --- |
| `synced` | 8px filled circle, `--text-tertiary` | none |
| `saved-locally` | 8px hollow circle, 1.5px `--text-tertiary` stroke | none |
| `offline` | 8px filled circle, `--text-primary` | the word *Offline*, `.t-subtitle` |

The dot has `role="status"` and visually hidden text (*Synced*, *Saving…*, *Offline — saved on this device*), so screen readers hear the change. There's no other save message.

### Keys

The data is split across four fixed keys, named for their purpose, so changing a setting never rewrites the lifts:

| Key | Value |
| --- | --- |
| `schemaVersion` | `2` |
| `settings` | unit, accent, retention, sort, selected filter tags |
| `tags` | the array of tags |
| `lifts` | the array of lifts, each with its `lastSets` and `sessions` |

Every record inside those values has a **stable id**, generated once and stored with it — never an array index, and never derived from a name, since lifts can be renamed or share a name. Reordering, renaming or deleting can't scramble saved data.

## The data model

The four keys hold this, shown together:

```json
{
  "schemaVersion": 2,
  "settings": {
    "unit": "lb",
    "accent": "cobalt",
    "retention": "1y",
    "sort": "custom",
    "filterTagIds": []
  },
  "tags": [
    { "id": "t-1f3a…", "name": "Push", "sortOrder": 0 }
  ],
  "lifts": [
    {
      "id": "l-9c2e…",
      "name": "Bench Press",
      "pattern": "horizontalPush",
      "equipment": "barbell",
      "notes": "",
      "sortOrder": 0,
      "createdAt": "2026-09-01T17:02:11.000Z",
      "tagIds": ["t-1f3a…"],
      "lastSets": [
        { "weightKg": 102.06, "reps": 5 },
        { "weightKg": 102.06, "reps": 5 },
        { "weightKg": 102.06, "reps": 4 }
      ],
      "sessions": [
        { "id": "s-44b0k2qx", "date": "2026-09-07T18:31:00.000Z", "bestE1RMKg": 116.42, "topWeightKg": 99.79,  "topReps": 5 },
        { "id": "s-7d19mz3a", "date": "2026-09-14T18:12:00.000Z", "bestE1RMKg": 119.07, "topWeightKg": 102.06, "topReps": 5 }
      ]
    }
  ]
}
```

### Rules

- **A lift is one record, updated in place.** Logging a session does exactly two things: **replaces** `lastSets` with the sets just typed, and **appends** one summary to `sessions`. That's the whole write path.
- **`lastSets` exists only to prefill the next log sheet.** `sessions` is what the card, the flame, the arrow, and the chart are computed from.
- **Never store anything that can be calculated.** There is no stored PR, last-logged date, trend, or badge. They're derived from `sessions` every time. A session summary is computed once, at logging time, and is the source of truth afterward because the sets it came from are gone.
- **Everything links by id, never by name.** Lift and tag ids are `crypto.randomUUID()` with a one-letter prefix (`l-`, `t-`). Session ids are slimmer: `s-` plus 8 random lowercase letters and digits from `crypto.getRandomValues`, unique within their lift (regenerated on the rare collision). Lifts reference tags through `tagIds`. Renaming a lift or tag can't break anything, and duplicate lift names are allowed.
- **All weights are stored in kilograms, rounded to 2 decimals.** That applies to `lastSets` weights and to a session's `topWeightKg` and `bestE1RMKg`. The unit setting only changes display and input conversion. 1 lb = 0.45359237 kg.
- **All dates are ISO-8601 strings from `toISOString()`**, which sort correctly as plain strings.
- **`schemaVersion` says what shape the data is in.** `store.js` reads the four keys into one in-memory document and runs `migrate(doc)`, which upgrades older data step by step on load and saves the upgrade at once. Any later change to the shape adds a step — and any field added later gets a default in `migrate`, so older data always loads. Data with no `schemaVersion` counts as version 1.
- **Version 2 replaced `isBodyweight` with `equipment`.** The 1 → 2 step gives each lift equipment from its name and old flag (`equipmentFromLegacy` in `library.js`): the library's equipment for that name, ignoring case and outer spaces, when it agrees with the flag on "bodyweight or not"; otherwise `bodyweight` if the flag was on, and `other` if not. The flag is then dropped. A LiftBoard still on version 1 refuses version 2 data (*newer than this LiftBoard understands*) rather than overwriting it.

### One store module

`store.js` is the only file that talks to `persist.js`. It's created with the persist object passed in — `createStore(persist)` — so the tests can hand it a fake. It loads the four keys into one in-memory document, migrates and validates it, seeds tags when there's no data yet, and exposes named operations:

`addLift`, `updateLift`, `deleteLift`, `moveLift`, `logSession`, `deleteSession`, `addTag`, `renameTag`, `deleteTag`, `moveTag`, `setLiftTags`, `setSetting`, `exportDoc`, `importDoc`, `deleteAll`, `pruneHistory` — plus `subscribe` for views and `onSyncStatus` for the sync dot.

Each operation changes the in-memory document, writes the keys it touched through `persist.set`, then notifies subscribers. Views subscribe and re-render. No view mutates the document directly, and no view imports `persist.js`.

If a saved value is present but malformed — the wrong type, or missing required fields — don't overwrite it. Show a message saying LiftBoard's saved data couldn't be read, and don't save anything until the page is reloaded, so a bug can never erase real data.

## Derived stats

All the math lives in `derive.js` as pure functions. The file has no DOM access, no storage access, and no `Date.now()` calls except as default arguments, so it can be unit-tested in Node.

```js
export const STALE_AFTER_DAYS = 21;

/** Scores within this of each other count as equal, so unit-conversion noise
 *  can never earn an arrow or a flame. */
export const SCORE_EPSILON = 0.01;

/** True when score a is really better than score b. The 1e-9 absorbs float
 *  error, so a difference of exactly 0.01 still counts as equal. */
export const beats = (a, b) => a - b > SCORE_EPSILON + 1e-9;

/** Every stored weight and e1RM is rounded to 2 decimals. */
export const round2 = n => Math.round(n * 100) / 100;

/** Epley estimate. Exact for a true single, since Epley overshoots ~3% at one rep. */
export const e1rm = (weightKg, reps) =>
  reps > 1 ? weightKg * (1 + reps / 30) : weightKg;

/** Boils a session's sets down to its summary (store.js adds the id). */
export function summarizeSession(sets, date = new Date()) {
  const top = sets.reduce((a, b) =>
    b.weightKg > a.weightKg || (b.weightKg === a.weightKg && b.reps > a.reps) ? b : a);
  return {
    date: date.toISOString(),
    bestE1RMKg: round2(Math.max(...sets.map(s => e1rm(s.weightKg, s.reps)))),
    topWeightKg: round2(top.weightKg),
    topReps: top.reps,
  };
}

/** Sessions oldest first. Always read through this. */
export const history = lift =>
  [...lift.sessions].sort((a, b) => a.date.localeCompare(b.date));

export const latest = lift => history(lift).at(-1) ?? null;

/** A session is "loaded" when its best set carried weight. On a normal lift every
 *  session is loaded, so the rules below collapse to one code path. */
export const isLoaded = s => s.topWeightKg > 0;

/** How good a session was, judged only against sessions of its own kind. */
export const score = s => (isLoaded(s) ? s.bestE1RMKg : s.topReps);

const sameKind = (sessions, s) => sessions.filter(x => isLoaded(x) === isLoaded(s));

/** The record (best) session of one kind. Earliest wins ties, including
 *  near-ties within SCORE_EPSILON. */
export function recordSession(lift, loaded) {
  let best = null;
  for (const s of history(lift)) {
    if (isLoaded(s) !== loaded) continue;
    if (!best || beats(score(s), score(best))) best = s;
  }
  return best;
}

/** Best session of the same kind as the latest — what the card calls the PR. */
export function comparablePR(lift) {
  const l = latest(lift);
  return l ? recordSession(lift, isLoaded(l)) : null;
}

export function previousComparable(lift) {
  const l = latest(lift);
  if (!l) return null;
  return sameKind(history(lift), l).at(-2) ?? null;
}

/** ↗ — the latest session beat the previous one of its kind. */
export function isTrendingUp(lift) {
  const l = latest(lift), p = previousComparable(lift);
  return Boolean(l && p && beats(score(l), score(p)));
}

/** 🔥 — the latest session beat every earlier session of its kind. */
export function latestIsPR(lift) {
  const l = latest(lift);
  if (!l) return false;
  const earlier = sameKind(history(lift), l).slice(0, -1);
  return earlier.length > 0 && earlier.every(e => beats(score(l), score(e)));
}

/** Whether the card appends "· PR …". It's left off when the PR and the latest
 *  session look the same on screen. `figure` maps a session to what's shown for
 *  it (format.js passes the rounded e1RM in the display unit, the reps, or the
 *  "BW+20 × 5" text); the default is the rounded score. */
export function showsPR(lift, figure = s => Math.round(score(s))) {
  const l = latest(lift), pr = comparablePR(lift);
  return Boolean(l && pr && figure(pr) !== figure(l));
}

/** Whole calendar days between two dates, in local time. */
export function daysSince(iso, now = new Date()) {
  const a = new Date(iso); a.setHours(0, 0, 0, 0);
  const b = new Date(now); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86_400_000);
}

/** The card's corner badge. First matching rule wins. */
export function badge(lift, now = new Date()) {
  const l = latest(lift);
  if (!l) return 'neverLogged';
  if (daysSince(l.date, now) >= STALE_AFTER_DAYS) return 'stale';   // ❄️
  if (latestIsPR(lift)) return 'newPR';                               // 🔥
  return 'none';
}
```

The top set and the best-e1RM set can be different sets. After 235 × 1 then 215 × 8, the top set is 235 × 1 but the best e1RM (272) comes from the 215 × 8. That's intended: the hero shows the heaviest thing lifted, the e1RM line shows the best effort.

### What the card shows

| Card element | Example | Source |
| --- | --- | --- |
| Hero | `225 × 5` | latest session's `topWeightKg` × `topReps`, with no unit |
| e1RM line | `e1RM 263 ↗ · PR 281` | latest `bestE1RMKg`, then ↗ if `isTrendingUp`, then `· PR` + `comparablePR`'s e1RM when `showsPR` |
| Date line | `5 days ago` | latest date: `Today`, `Yesterday`, else `N days ago` |
| Corner | ❄️ or 🔥 | `badge()` |

- **No unit on the hero.** The unit is one global setting, so every number on the board is in it; repeating `lb` on each card costs width the hero doesn't have.
- The `· PR 281` part is **left off when the PR would read the same as the latest session**, judged by the rounded figure shown on screen (`showsPR`). That covers the latest session being the PR, tying it, and a near-tie that rounds to the same number. The flame already says so, and `e1RM 263 · PR 263` would repeat itself.
- **Never logged:** the hero reads `Not logged yet`, and the e1RM and date lines are hidden.
- **Better means better by more than 0.01** (`SCORE_EPSILON`). Anything closer is a tie, so logging the same weight again never shows ↗ or 🔥.
- **Arrow versus flame:** ↗ means better than the previous session of its kind, shown only going up. 🔥 means better than every earlier session of its kind. A flame nearly always comes with an arrow.
- **The badge:** ❄️ at 21+ days since the latest session, checked before 🔥, because a record set six weeks ago is still a stale lift. A lift's first session is trivially a record, so it never gets the flame.

### Equipment, bodyweight and band

Every lift has an `equipment`, one of: `barbell`, `dumbbell`, `machine`, `cable`, `bodyweight`, `kettlebell`, `band`, `other`. It's picked in the Lift Editor, prefilled by the library, and drawn as the lift's icon. Two kinds change how weight works (`allowsNoWeight` in `library.js`); every other kind needs a weight above 0.

**Bodyweight.** The weight field means **added load**; empty or 0 means plain bodyweight. The app doesn't know what anyone weighs, so it can't tell whether 20 pull-ups beats 8 with 15 lb added. It keeps them as two separate records and never compares them. A session with no added weight is judged on reps; one with added weight is judged on the e1RM of the added load. The arrow, the flame and the PR only ever compare a session against earlier sessions of the same kind — which is exactly what `score` and `sameKind` above do.

**Band.** A weight of 0 (or empty) is allowed too, and scored the same way: no-weight sessions on reps, weighted ones on e1RM, never compared. Unlike bodyweight, a weighted band session reads like any other lift.

| Lift | Latest session | Hero | Second line |
| --- | --- | --- | --- |
| Bodyweight | No added weight | `BW × 12` | `PR 20 reps` |
| Bodyweight | Added weight | `BW+15 × 8` | `PR BW+20 × 5` |
| Band | No weight | `Band × 15` | `PR 20 reps` |
| Band | Weight | `20 × 15` | `e1RM 30 · PR 35` |

The arrow sits on the second line as usual, and the `PR …` part follows the same omit rule. If neither applies, the line is hidden. **No e1RM figure is printed for a bodyweight lift**, since an estimate that ignores body weight would be misleading, **or for any session with no weight** (`showsE1RM` in `format.js`). A mixed session — a few bodyweight sets, then a few with a plate — counts as loaded.

## History retention

Settings has **Keep history**: *6 months*, *1 year* (the default), or *2 years*, stored in `settings.retention` as `"6m"`, `"1y"` or `"2y"`. There's no *Forever*. It's the only long-term-data control in the app, and it's what keeps LiftBoard's data inside the 1 MiB Firestore document `persist.js` saves it to: two years of summaries is a small fraction of that, so there's no storage meter.

Sessions older than the window are deleted, except two per lift that are always kept, whatever their age:

- **The latest session**, so the hero, the date line and ❄️ stay right for a lift not done in a while.
- **The record session of each kind** — one on a normal lift, up to two on a bodyweight or band lift — so the PR and 🔥 stay honest instead of quietly resetting.

`lastSets` is never touched by pruning.

```js
/** Pure: returns the sessions to keep and how many would go. */
export function pruneSessions(lift, months, now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - months);
  const keep = new Set(
    [latest(lift), recordSession(lift, true), recordSession(lift, false)]
      .filter(Boolean).map(s => s.id));
  const kept = lift.sessions.filter(s => new Date(s.date) >= cutoff || keep.has(s.id));
  return { kept, removed: lift.sessions.length - kept.length };
}
```

`store.pruneHistory()` applies it to every lift. It runs at startup, after an import, and when the setting changes. Switching to a shorter window first counts what would go and asks — *"Delete 214 sessions older than 1 year? Each lift's latest session and records are kept."* — and changes nothing if cancelled.

## Screens

The app is one HTML page with three tabs — **Board**, **Stats**, **Settings** — switched by the URL hash (`#board`, `#stats`, `#stats/<liftId>`, `#settings`, `#settings/lifts`, `#settings/tags`). Everything else opens as a sheet. Hash routing needs no server configuration and works on any static host.

### App shell

- **Loading:** a plain centered *Loading…* until the store is ready, or the *couldn't connect* message if `persist.js` fails to import (see Persistence).
- A fixed bottom **tab bar** with three tabs, each an icon above a label. It floats above the page; the active tab is marked with an accent dot. It respects the bottom safe area.
- The page scrolls; the tab bar doesn't.
- **Redraw on return.** When the page becomes visible again (`visibilitychange`), the router redraws the current tab, so anything that depends on today — the Board's date, `Today` / `5 days ago`, ❄️ — is right when the app is reopened the next morning without a reload.
- **Sheets** are `<dialog>` elements opened with `showModal()`. On phones they slide up from the bottom, full width, rounded top corners, at most 92% of the viewport height (`dvh`), scrolling inside. On desktop they're centered, 520px wide. Escape and a backdrop tap close them, subject to the discard rule where it applies.
- **Confirmations and text prompts** use one small reusable dialog module — `confirmDialog(message, actionLabel, {destructive})` and `promptDialog(title, initialValue)`, both returning Promises. Never use the browser's native `confirm()`, `alert()`, or `prompt()`.

### 1. Board

1. **Header**, scrolling with the page:
   - Left: the logo mark (see Icons → Logo mark), then the wordmark **LiftBoard**, then the sync dot (see Persistence → Sync status).
   - Right: two round icon buttons, both 48px. **Sort** is a native `<select>` made invisible and laid over the button, so phones show their own picker; its options are *Custom order*, *Recently logged*, *Name*, and *Best e1RM*. In every sort, never-logged lifts go last. *Best e1RM* ranks a bodyweight lift by its added-load record and a band lift by its weighted record; a lift with only no-weight sessions goes after the lifts that have an e1RM. **Add** (`+`) opens the Add Lift sheet.
   - Below: today's date, e.g. `Wednesday, Oct 4` (long weekday, short month, day), from `Intl.DateTimeFormat` in the device's locale (`boardDate` in `format.js`). It stays current because the app redraws when it comes back into view (see App shell).
   - Then a subtitle, `6 lifts`, plus ` · 2 🔥` when any lift has the flame.
2. **Filter chips**: a horizontal scrolling row, with *All* first and selected by default. Tapping a tag toggles it; several selected tags mean *lifts having any of them*; tapping *All* clears the selection. The row is always shown.
3. **Card grid**: two columns.
4. **Empty states**: with no lifts at all, the header plus a centered message, *No lifts yet*, and an *Add your first lift* button. With lifts but none matching the filter, *No lifts match these tags*.

The sort choice and the selected filters persist in settings.

**The lift card.** A `<button>` element, top to bottom:

1. The equipment icon on the left, the corner badge on the right.
2. The lift name.
3. The hero.
4. The e1RM line.
5. The date line.

Tags never appear on cards. **Tapping a card opens the Log Session sheet.** There's no long-press menu on the web; editing and deleting a lift live in the Lift Editor, which is reachable from the log sheet and from Settings → Lifts.

### 2. Log Session sheet

Top to bottom:

1. **Title row** — `Log Bench Press`, an **Edit** text button that opens the Lift Editor, and a round close (×) button.
2. **Tags row** — `Tags` on the left, the lift's tag chips and a chevron on the right. Tapping opens the tag picker. Tag changes save immediately, even if the session is then discarded.
3. **Date row** — `Date` on the left, `Today, Sep 22` on the right. Read-only: a session is always logged as now.
4. **Sets header** — `SETS · 3` on the left (a live count), and `Last: Sep 14` on the right: the date of the latest remaining session (nothing for a first session). After that session is deleted, the prefilled `lastSets` can come from a session that's gone; that's accepted.
5. **Column labels** — `SET`, `WEIGHT (LB)` (or `KG`), `REPS`. On a bodyweight lift the middle label reads `ADDED (LB)`. On a bodyweight or band lift an empty weight field shows the placeholder `BW` or `Band`.
6. **Set rows** — the set number, a weight field, a reps field, and a remove button. Each field has a − button on its left and a + button on its right (see Steppers).
7. **Add set** — full width, secondary button. Appends a copy of the last row.
8. **Log Session** — full width, accent fill.

**Prefill.** Rows start as a copy of `lastSets`, converted to the display unit and rounded to one decimal place, so 225 lb reappears as 225. A lift's first session starts with one empty row.

**Fields.** Use `<input type="text">` with `inputmode="decimal"` for weight and `inputmode="numeric"` for reps, not `type="number"`, which behaves inconsistently across mobile browsers. Every input's font size must be **at least 16px**, or iOS Safari zooms the page when it's focused.

**Steppers.** The − and + buttons beside each field change it by one step; typing works as before.

- Weight steps by **5 lb or 2.5 kg**, following the unit setting; reps step by **1**. The step sizes live in one place, `WEIGHT_STEP` and `REPS_STEP` in `log-rows.js`.
- A tap adds the step to whatever is there, with no snapping to multiples (`102.5` + 5 = `107.5`), and rounds to one decimal so float noise never shows.
- Reps stay within 1–100. Weight can't go below 0 on a bodyweight or band lift, and can't go below one step on any other lift, which needs a weight above 0.
- An empty field counts as 0, so + puts one step in the weight field and `1` in the reps field. If a field can't be read (`abc`, `-5`, `5.5` reps), both its buttons do nothing.
- A tap that would leave the value where it is, or move it the wrong way, does nothing: − on an empty reps field doesn't jump up to 1, and − on a 3 lb barbell doesn't raise it to 5. − on reps above 100 brings them back to 100.
- Stepping is editing: it counts for the discard confirmation, and a stepped weight is converted from what it now says rather than keeping the prefilled kg. Stepping back to exactly the prefilled text is the same as typing it back: unchanged.
- The rules are pure functions in `log-rows.js` (`stepValue`, `stepWeight`, `stepReps`), tested in `tests/log-rows.test.js`.
- Each button is a real `<button>` with a 44px hit area and an `aria-label` such as *Increase weight, set 2* (*added weight* on a bodyweight lift).

**Validation.**

- On a bodyweight or band lift an empty weight means 0. On every other lift, weight must be greater than 0. A negative or unparseable weight is always invalid, and a comma is accepted as a decimal point.
- Reps must be a whole number from 1 to 100.
- Log Session is disabled while any row is invalid. Invalid fields get a 1.5px `--danger` border, not red text.
- The remove button is disabled when only one row is left.

**Logging.** Log Session converts each row to kg, calls `store.logSession(liftId, sets)`, and `store.logSession` rounds each weight to 2 decimals. **A row left exactly as prefilled keeps its original `weightKg` from `lastSets`** instead of being converted back from the rounded display value, so repeating last session never drifts the stored weight. Then the sheet closes and plays a short, subtle pop on the card (respecting `prefers-reduced-motion`). The board re-renders from the store.

**Discarding.** If any row differs from its prefilled value, then closing by the × button, Escape, or a backdrop tap asks *Discard this session?* first. An untouched sheet closes without asking. (Listen for the dialog's `cancel` event and call `preventDefault()` when a confirmation is needed.)

### 3. Lift Editor sheet

Used for creating a custom lift and for editing one:

- **Name** — a text field. Save is disabled when it's empty or whitespace.
- **Equipment** — a grid of the eight equipment types, each shown with its icon and name. A custom lift starts as *Other*.
- **Movement pattern** — a grid of the nine patterns, names only. It has no icon: it's kept for a future Stats chart.
- **Tags** — a list of toggleable tag chips, plus a *New tag* field.
- **Notes** — a multi-line text area.
- **Delete Lift** — shown only when editing. Destructive, and its confirmation names what goes: *"Delete Bench Press and its 34 logged sessions?"*

### 4. Add Lift sheet

A search field above a list:

- First row: **Create custom lift**, which opens an empty Lift Editor.
- Below: the built-in library, grouped under equipment headings (in the picker's order; equipment with no library lifts has no heading), each row showing the equipment icon and name. Picking one opens the Lift Editor prefilled with that name, pattern, and equipment. The new lift starts untagged, and the library never creates tags.

### 5. Stats

**Stats list** (`#stats`) — every lift, each row showing the name and its latest hero. Tapping a lift opens its detail.

**Lift detail** (`#stats/<id>`) has a back button to the list.

- **Metric toggle** (a segmented control): *Est. 1RM* or *Top weight*. On a bodyweight lift these become *Reps* (plain sessions only) and *Added load* (loaded sessions only, plotting `bestE1RMKg`). A band lift offers *Reps* (no-weight sessions) and *Est. 1RM* (weighted sessions), the same two lines. It opens on whichever kind the latest session was.
- **Range toggle**: *3M*, *6M*, *1Y*, *All*.
- **Summary figures**: **Current** (the latest session), **Best** (the max in range), and **Change** (latest minus oldest in range, with an up or down arrow).
- **The chart card** — see Visual design.
- A small note beneath it: *Estimates use the Epley formula and are least reliable above 10 reps.*
- **Sessions** — every session, newest first, as `Sep 14 · 225 × 5 · e1RM 263` (on a bodyweight lift, `Sep 14 · BW × 12` or `Sep 14 · BW+15 × 8`; on a band lift with no weight, `Sep 14 · Band × 15`). Each row has a delete button with a confirmation. Past sessions can be deleted but not edited, since their sets are gone.
- With fewer than two sessions of the shown kind, show *Log at least two sessions to see a chart* in place of the chart. The Sessions list still shows.

### 6. Settings

A single page of grouped rows:

- **Units** — Pounds or Kilograms (a segmented control).
- **Accent** — three swatches: Cobalt, Brick, Ink.
- **Keep history** — 6 months, 1 year (default), 2 years.
- **Lifts →** (`#settings/lifts`) — every lift with ▲/▼ buttons to reorder (writing `sortOrder`), tapping a lift opens the Lift Editor.
- **Tags →** (`#settings/tags`) — every tag with ▲/▼ to reorder, rename (via `promptDialog`), and delete. Deleting confirms, naming how many lifts use it, and never deletes a lift. An *Add tag* button sits at the bottom.
- **Data** — *Export* (downloads the export file), *Import* (a file picker; replaces everything after a confirmation naming how many lifts will be removed), and *Delete all data* (destructive, confirmed), which resets LiftBoard to a fresh start: default settings, the five seeded tags, no lifts.
- **About** — the version, one line explaining the Epley estimate, and the icon credits: *Icons: Lucide (ISC License) and Atlas Icons (MIT License).*

Settings → Lifts and Settings → Tags are one level deep, with a back button. Nothing goes deeper.

**Debug mode.** When the URL has `?debug`, Settings → Data also shows **Load sample data**, which replaces everything with the sample data after a confirmation. Without `?debug` the button doesn't exist.

## Visual design

LiftBoard follows the dashboard's design system, **"Quiet dark, loud numbers"**: `design/DESIGN.md` (rules and component recipes), `design/tokens.css` (every value), `design/reference/` (markup patterns and images). Read DESIGN.md before any visual change. It controls appearance only; this spec still controls structure, features, content and behavior. This section records only what's specific to LiftBoard.

### The one rule

Every color, radius, spacing step, font and font size is a token in `design/tokens.css`. **No other file contains a hex color, a font family name, a raw font size or a raw radius.** If something is missing, add a token first. The one exception is `<meta name="theme-color">` in `index.html`, which can't read a CSS variable; it matches `--ink`.

- `design/tokens.css` — the values, plus the base page styles. It imports `design/fonts.css`.
- `type.css` — LiftBoard's text styles (`.t-*` classes) and accent themes, built only from tokens.
- `style.css` — layout and components, built only from tokens. Plain px values there are component dimensions from DESIGN.md (icon boxes, border widths).

**Dark only.** There is no light theme. `color-scheme: dark`.

### Accent

Settings → Accent keeps its three choices, each one of DESIGN.md's tested accents. `data-accent` on `<html>` picks it, applied once at startup (after saved settings load, before the app is revealed) and again on every change:

| Setting | Token | Color |
| --- | --- | --- |
| Cobalt (default) | `--accent-blue` | blue |
| Brick | `--accent-orange` | orange |
| Ink | `--accent-light` | off-white |

`--on-accent` (ink) works on all three. The accent marks only: the primary action on each screen (Board's Add button, Log Session, Save / Add Lift, Add Lift's *Create custom lift* tile), the selected filter or tag chip, the active tab's dot, selected tiles and switches, the trend arrow ↗, the chart's latest point and callout, and the focus ring.

### Fonts

Self-hosted from `@fontsource` (OFL; licenses in `fonts/Geist-OFL.txt` and `fonts/GeistMono-OFL.txt`), declared in `design/fonts.css`. **Never link to `fonts.googleapis.com`**: LiftBoard makes no third-party requests.

| Slot | Token | Family | Weights |
| --- | --- | --- | --- |
| UI | `--font-sans` | Geist (latin only; fontsource ships no latin-ext) | 400, 500, 600, 700 |
| Numbers | `--font-mono` | Geist Mono (latin + latin-ext) | 400, 500, 600 |
| Wordmark | `--font-brand` | not chosen yet; falls back to Geist | — |

Swapping a family: replace its files in `fonts/`, edit its block in `design/fonts.css`, and change the matching `--font-*` token. `--mono-advance` (the mono face's character width in em) changes with the mono font.

### Type scale

Sizes are DESIGN.md's tokens (Title 28, Heading 19, Body 16, Small 14, Caption 13, Label 12, stat 38), plus one of LiftBoard's own: `--fs-wordmark` (24), used only by the Board header's wordmark and logo mark. It's its own token so the header can grow without changing every heading. At 24 the logo's thin arrow stays solid on 1× screens, and the header still fits a 375px phone with *Offline* showing. Every number is in `--font-mono`. Every input's font size is at least 16px.

| Class | Font | Weight | Size | Color | Notes |
| --- | --- | --- | --- | --- | --- |
| `.t-wordmark` | brand | 600 | wordmark (24) | text | placeholder until the wordmark font is chosen |
| `.t-subtitle` | sans | 400 | caption | muted | |
| `.t-lift-name` | sans | 500 | small | text | up to 2 lines |
| `.t-hero` | mono | 500 | up to stat-sm | text | one line, never cut off; shrinks to fit (below) |
| `.t-e1rm` | mono | 400 | caption | text-2 | |
| `.t-date` | sans | 400 | caption | muted | tabular numerals |
| `.t-chip` | sans | 500 | small | per chip state | |
| `.t-chip-small` | sans | 600 | label | per tag | log-sheet tags |
| `.t-sheet-title` | sans | 600 | title | text | page and sheet titles |
| `.t-row-label` | sans | 500 | body | text | |
| `.t-row-value` | mono | 500 | body | text | |
| `.t-section`, `.t-column` | sans | 500 | label | muted | uppercase eyebrow, `--ls-label` |
| `.t-field` | mono | 500 | body | text | centered |
| `.t-button` | sans | 600 | body | per button | secondary buttons 500 |
| `.t-chart-title` | sans | 600 | heading | text | |
| `.t-chart-callout` | mono | 500 | small | accent | |
| `.t-axis` | mono | 400 | label | muted | |
| `.t-badge` | sans | 400 | heading | — | the card's ❄️ / 🔥 |

**The hero shrinks to fit.** A card is a size container (`container-type: inline-size`). The view sets `--hero-chars` on the hero to its character count, and `.t-hero` sizes itself as `min(--fs-stat-sm, 100cqi ÷ (--hero-chars × --mono-advance))`. There's deliberately no lower bound, because a floor is what would let a number get cut off.

### Layout

- **Mobile first.** `--gutter` (20px) side padding, safe-area insets top and bottom.
- **Desktop:** from 700px, content sits in a centered 640px column. The grid stays two columns.
- **Very narrow screens** (under 340px): the grid becomes one column.
- 4-pt spacing tokens: 16px card padding, 12px between cards, 8px between chips, 32px between sections. Every tappable element is at least 44 × 44px.

### Components

Each follows its DESIGN.md recipe. LiftBoard's mapping:

- **Lift card** — compact card: `--surface`, 1px `--line-soft`, `--r-md`, 16px padding. Equipment icon (24px, `--text-2`) on the left and the ❄️ / 🔥 emoji on the right, then the name, the hero, the e1RM line and the date. The trend arrow is an icon the size of the e1RM text, in `--accent`; the `· PR 281` run is `--text-muted`. Pressed: `--raised`.
- **Board header** — the logo mark (whichever variant `HEADER_LOGO` picks; see Icons → Logo mark), 1em of the wordmark's size (`--fs-wordmark`, 24px), the wordmark, the sync dot; on the right, Sort and Add as 48px round icon buttons, the same size: Sort `--raised`, Add accent (the accent fill, not a bigger size, marks Add as the primary action). Below them, today's date in `.t-section` (the same style as `.eyebrow` in `tokens.css`, shown uppercase), then the subtitle.
- **Sync dot** — 8px. Synced: `--success`. Saving: a `--text-muted` ring. Offline: `--warning`, with the word *Offline*.
- **Filter and tag chips** — 36px pill with a 44px hit area, 1px `--line` border, `--text-2`. Selected: `--accent` fill and border, `--on-accent` label.
- **Buttons** — pills, 52px. Primary: accent. Secondary (Add set, Export, Import, Cancel, *Add your first lift*): `--raised`. Destructive: `--danger-bg` fill, `--danger` label. Quiet (Edit, Rename, ‹ Back): transparent, `--text-2`. Disabled: `--raised` fill, `--text-faint` label.
- **Fields** — 52px, `--r-sm`, 1px `--line` border; `--surface` on the page, `--raised` in sheets and dialogs. Focus: 1.5px accent border. Invalid set fields: 1.5px `--danger` border.
- **Lists** (Stats, Settings, Add Lift library, Lifts, Tags, Sessions) — rows grouped in one card with 1px dividers, a 40px `--raised` icon tile where there's an icon, and a `--text-faint` chevron.
- **Sheets** — `--surface`, `--r-xl` top corners, `--scrim` backdrop, 44px round close button. Dialogs: `--surface`, `--r-xl`.
- **Set rows** — columns of 20px, 5fr, 4fr, 44px with 4px gaps (weight gets a little more room than reps); set numbers `--text-muted`. The remove button's hit area reaches 12px into the right gutter, so its icon still lines up with the gutter. Rows 8px apart.
- **Set fields** — one 52px box per field (`--raised`, 1px `--line`, `--r-sm`) holding a 44px − button, the number, and a 44px + button. The buttons are transparent with `--text-2` icons and a `--pressed` circle while pressed. The number takes whatever width the buttons leave. The box, not the input, shows focus (1.5px accent) and invalid (1.5px `--danger`) borders. At 375px wide, `1102.5` and `100` just fit; on narrower screens the longest values scroll inside their field.
- **Segmented controls, switch, empty states, floating tab bar** — exactly as in DESIGN.md. The tab bar's inactive labels are `--text-muted` (not `--text-faint`) so they meet 4.5:1.
- **Equipment and pattern tiles, accent swatches** — `--raised` / `--surface` tiles; selected has a 1.5px accent border. Equipment tiles show a 28px icon above the name; pattern tiles show the name only, at least 52px tall.
- **Current / Best / Change** — three small cards: eyebrow label, mono value at heading size, muted unit.

### Chart card

The chart is **hand-drawn in inline SVG**, in `chart.js` — no charting library. The card is `--surface`, 1px `--line-soft`, `--r-lg`, 20px padding. The title is the lift name; the subtitle is the metric and range, e.g. *Estimated 1RM · last 6 months*.

- **Line:** straight segments, 2px `--text-2`, round caps and joins.
- **Points:** 8px circles filled `--surface` with a 2px `--text-2` stroke. The latest point is 12px, filled `--accent`, with its value called out above it, right-aligned, in `.t-chart-callout`.
- **Gridlines:** four evenly spaced horizontal lines, 1px `--line`. No y-axis labels, axis lines, or vertical gridlines — the callout carries the number.
- **X labels:** month abbreviations at month boundaries within the range, in `.t-axis`.
- **Y domain:** padded around the data's min and max; it doesn't start at zero. X is scaled by date, not by index.
- 8px of inner horizontal padding, so the end points aren't clipped.
- The SVG uses `viewBox` and scales to its container width.
- `role="img"` with an `aria-label` summarizing it, e.g. *"Estimated 1RM, 6 months, from 229 to 263 pounds."*

### Icons

All inline SVG strings in `icons.js` — nothing loaded from a CDN, a webfont or a package at runtime. Every icon draws in `currentColor`, so tokens color it; the two-tone logo is the one exception, colored by class (see Logo mark). The licenses sit in `icons.js` beside the icons they cover, and Settings → About credits both sets.

- **UI icons:** [Lucide](https://lucide.dev) (ISC), copied from `lucide-static` 1.48.0, matching DESIGN.md's 2px rounded stroke: plus, minus, arrow-up-down (sort), x, circle-minus, chevron-right, chevron-left, chevron-up, chevron-down, arrow-up-right (the trend), trash-2, search, and the three tab icons (layout-grid, chart-line, settings). Feather's license covers the ones derived from it.
- **Equipment icons:** [Atlas Icons](https://atlasicons.vectopus.com) (MIT), bold weight, redrawn from their published outlines onto Lucide's 24×24 grid so they sit with the Lucide icons: each fills Lucide's 20px drawing area (the wide barbell may use the full 24px width), and a thin outline stroke in the same color, sized per icon, brings each up to Lucide's ~2px line weight. They're filled shapes, not strokes.

  | Equipment | Atlas icon |
  | --- | --- |
  | Barbell | `at-weights-gym` |
  | Dumbbell | `at-dumbbell-gym` |
  | Machine | `at-weight-lifting` |
  | Cable | `at-weights-chair` |
  | Bodyweight | `at-lifting-bars` |
  | Kettlebell | `at-kg-weight` |
  | Band | `at-tape-measure` |
  | Other | `at-muscle-gain` |

  `equipmentIcon(equipment)` draws them wherever a lift's icon shows: cards, the Add Lift library, the Stats list, Settings → Lifts, and the Lift Editor's equipment picker. Unknown equipment gets the *Other* icon. Each is one string in `EQUIPMENT_PATHS`, so other art can replace any one with a single string (filled, on a 24×24 grid). `tests/icons.test.js` checks every equipment type has its own icon. Movement patterns have no icons.
- **Logo mark:** LiftBoard's own mark, a 2×2 grid of rounded squares with the top-right one an arrow pointing up and right. The source is `brand/logo-mark.svg` (filled, black, on a 96×96 grid); its path is inlined in `icons.js`, where `logoMark()` returns it as one SVG string with `fill="currentColor"`, so it takes the accent and follows Settings → Accent. An `<img>` couldn't be recolored. To change the mark, export a new `brand/logo-mark.svg` and paste its path into `logoMark()`. The mark appears only in the Board header, sized in em so it scales with the wordmark. In `--accent` it's an exception to DESIGN.md's rule that the accent is never decoration. `tests/brand.test.js` checks it has no hex colors.

  The mark has two variants, both kept in `icons.js`. The header uses the one named by `HEADER_LOGO` in `icons.js`; switching is a one-word change there and nothing else.

  | Variant | `HEADER_LOGO` | Source | Color |
  | --- | --- | --- | --- |
  | Original | `'original'` | `brand/logo-mark.svg` → `logoMark()` | the whole mark in `--accent` (`fill="currentColor"`) |
  | Two-tone (**active**, an experiment) | `'two-tone'` | `brand/logo-mark-two-tone.svg` → `logoMarkTwoTone()` | squares in `--text`, the arrow in `--accent`, set in `style.css` on `.logo-squares` and `.logo-arrow`; the paths have no fills of their own |

  The two-tone is the original drawing split into two paths. With the Ink accent its arrow and squares are the same color, so it looks like the original. `tests/brand.test.js` checks both variants have no hex colors, that the two-tone keeps both classes, and that `HEADER_LOGO` names one of the two.
- **Browser and Home Screen icons:** fixed files in `brand/`, linked from `<head>` with relative paths. They're a white mark on a black square and don't follow the accent.

  | File | Used for |
  | --- | --- |
  | `brand/favicon.svg` | browser tab, where SVG favicons work |
  | `brand/favicon-32.png`, `brand/favicon-48.png` | browser tab, everywhere else |
  | `brand/apple-touch-icon.png` | the iOS Home Screen (180×180, opaque) |

  They're only browser icons. There's still no manifest, service worker or install prompt. `tests/brand.test.js` checks every file `<head>` points to exists.
- **Emoji:** ❄️ and 🔥 stay as emoji for now, an approved exception to DESIGN.md's no-emoji rule.

## The built-in library

A static array in `library.js`. Library entries aren't stored; they only prefill the Lift Editor. `EQUIPMENT`'s order is the Lift Editor's picker order and Add Lift's grouping.

```js
export const PATTERNS = {
  squat: 'Squat', hinge: 'Hinge', lunge: 'Lunge',
  horizontalPush: 'Horizontal Push', verticalPush: 'Vertical Push',
  horizontalPull: 'Horizontal Pull', verticalPull: 'Vertical Pull',
  core: 'Core', accessory: 'Accessory',
};

/** In display order: the Lift Editor's picker and Add Lift's groups. */
export const EQUIPMENT = {
  barbell: 'Barbell', dumbbell: 'Dumbbell', machine: 'Machine', cable: 'Cable',
  bodyweight: 'Bodyweight', kettlebell: 'Kettlebell', band: 'Band', other: 'Other',
};

// [name, pattern, equipment]
export const LIBRARY = [
  ['Back Squat', 'squat', 'barbell'],               ['Front Squat', 'squat', 'barbell'],
  ['Bench Press', 'horizontalPush', 'barbell'],     ['Incline Bench Press', 'horizontalPush', 'barbell'],
  ['Overhead Press', 'verticalPush', 'barbell'],    ['Deadlift', 'hinge', 'barbell'],
  ['Romanian Deadlift', 'hinge', 'barbell'],        ['Barbell Row', 'horizontalPull', 'barbell'],
  ['Hip Thrust', 'hinge', 'barbell'],               ['Power Clean', 'hinge', 'barbell'],
  ['Barbell Curl', 'accessory', 'barbell'],

  ['Dumbbell Bench Press', 'horizontalPush', 'dumbbell'], ['Dumbbell Shoulder Press', 'verticalPush', 'dumbbell'],
  ['Dumbbell Row', 'horizontalPull', 'dumbbell'],   ['Dumbbell Fly', 'horizontalPush', 'dumbbell'],
  ['Goblet Squat', 'squat', 'dumbbell'],            ['Walking Lunge', 'lunge', 'dumbbell'],
  ['Dumbbell Curl', 'accessory', 'dumbbell'],       ['Hammer Curl', 'accessory', 'dumbbell'],
  ['Lateral Raise', 'accessory', 'dumbbell'],

  ['Leg Press', 'squat', 'machine'],                ['Chest Press Machine', 'horizontalPush', 'machine'],
  ['Leg Extension', 'accessory', 'machine'],        ['Leg Curl', 'accessory', 'machine'],
  ['Calf Raise', 'accessory', 'machine'],

  ['Lat Pulldown', 'verticalPull', 'cable'],        ['Seated Cable Row', 'horizontalPull', 'cable'],
  ['Cable Fly', 'horizontalPush', 'cable'],         ['Tricep Pushdown', 'accessory', 'cable'],

  ['Pull-Up', 'verticalPull', 'bodyweight'],        ['Chin-Up', 'verticalPull', 'bodyweight'],
  ['Push-Up', 'horizontalPush', 'bodyweight'],      ['Dip', 'verticalPush', 'bodyweight'],
  ['Inverted Row', 'horizontalPull', 'bodyweight'], ['Bulgarian Split Squat', 'lunge', 'bodyweight'],
  ['Nordic Curl', 'accessory', 'bodyweight'],       ['Plank', 'core', 'bodyweight'],
  ['Hanging Leg Raise', 'core', 'bodyweight'],
];
```

Plank is logged as reps too; for a timed hold, typing seconds into the reps field is fine.

**Seeded tags.** When the document is first created, seed five tags: Push, Pull, Legs, Upper, Lower. They're ordinary tags afterward. Tags are only ever created by the person.

## Rules that must not be improvised

### Sessions

- A session always has at least one set.
- Sessions are always dated now. There's no backdating and no editing. Two sessions on the same day are both kept, and the later one's sets become `lastSets`.
- Deleting a session needs no other handling: the PR, arrow and badge recompute on their own. `lastSets` is left as it is.
- Only `store.logSession` creates sessions or writes `lastSets` (import aside). Only session delete and `pruneHistory` remove sessions.

### Dates

Day counts run from local midnight to local midnight, as in `daysSince`, never from raw timestamps. Otherwise a session logged at 11pm reads as zero days old the next morning.

LiftBoard's dates are in English (`Sep 14`, `Today, Sep 22`), except the Board's date line, which follows the device's language and region.

### Names and tags

- Duplicate lift names are allowed.
- Tag names are unique, case-insensitively. Creating a tag that matches an existing one reuses it instead.
- A tag with no lifts still appears in the filter row and in Settings.

### Numbers

- Weights show at most one decimal place, with trailing zeros stripped: `225`, `102.5`, never `225.0`.
- Estimated 1RMs show as whole numbers: `e1RM 263`.
- Switching units converts nothing in storage.

### Import and export

- Export downloads `liftboard-YYYY-MM-DD.json`, pretty-printed. It's a portable copy, for moving data or keeping one outside the dashboard.
- The export file uses the **same shape as the LiftBoard iOS app's export**, so data can move to the native app if it's ever released:

  ```json
  {
    "schemaVersion": 1,
    "exportedAt": "2026-09-22T18:04:00Z",
    "tags": [{ "name": "Push" }],
    "lifts": [{
      "name": "Bench Press", "pattern": "horizontalPush", "equipment": "barbell", "isBodyweight": false, "notes": "",
      "tags": ["Push"],
      "lastSets": [{ "weightKg": 102.06, "reps": 5 }],
      "history": [{ "date": "2026-09-14T18:12:00.000Z", "bestE1RMKg": 119.07, "topWeightKg": 102.06, "topReps": 5 }]
    }]
  }
  ```

  The file's `schemaVersion` is the file format's own version (`FILE_VERSION` in `transfer.js`, still 1), not the saved data's. Each lift carries `equipment`, and also the iOS shape's `isBodyweight` (true only for bodyweight lifts). A file without `equipment` — from the iOS app, or from before equipment — gets it from the name and `isBodyweight`, by the same rule as the 1 → 2 migration. Tag ids become names on export and fresh ids on import, and `sessions` exports as `history`. Settings aren't included: import keeps the current settings but clears `filterTagIds`, since tag ids change. On import, `sortOrder` follows the file's order, each lift's `createdAt` is its first session's date (or the import time if it has none), and weights and e1RMs are rounded to 2 decimals.
- Import **replaces everything** after a confirmation. If `schemaVersion` is missing or newer than the app understands, refuse with a plain message rather than attempting a partial read. Validate every field on import; one bad record rejects the whole file, with a message saying which lift it was.

### Deletion

Every destructive action confirms first and states the consequence specifically — *"Delete Bench Press and its 34 logged sessions?"*, never *"Are you sure?"*. There's no undo.

## Rules for Claude Code

This app is built almost entirely by Claude Code, for someone who does not read JavaScript. Code should be boring, verifiable, and hard to half-break.

### Architecture

- **Vanilla only.** HTML, CSS, and JavaScript ES modules (`<script type="module">`). No framework, no build step, no bundler, no TypeScript, no npm runtime dependencies. The site is the files in the repo, served as-is.
- **Small libraries only if truly unavoidable** — and nothing in this spec needs one. Icons are copied in as inline SVG.
- **One store, pure derivations, dumb views.** `store.js` owns the data; `derive.js` computes; view modules render from the store and call store operations. A view never computes a PR, never touches `persist.js`, and never mutates the document.
- **Rendering:** each view is a function that builds its DOM from the current state, re-run after store changes. Use `textContent` for anything the person typed; never insert their text with `innerHTML`.
- **Relative paths everywhere** (`./app.js`, not `/app.js`). The tool lives at `tools/liftboard/` inside a site that may itself be served from a subfolder, so a leading slash would break it. The only path that leaves the folder is `../../shared/persist.js`.
- **Keep every file under about 250 lines.** Split a module before it grows past that.
- **Accessibility:** real `<button>`s for everything tappable, a `<label>` on every input, `aria-label` on icon-only buttons, visible focus rings, and `prefers-reduced-motion` respected.

### File layout

The folder convention is `index.html` with `style.css` and `app.js` beside it. LiftBoard is too big for one script, so `app.js` is the entry point and imports the modules in `js/`:

```
<dashboard repo>/
  shared/persist.js          ← the dashboard's sync module (not LiftBoard's; never edit it)
  tools/liftboard/
    CLAUDE.md                ← working rules, read automatically
    SPEC.md                  ← this document
    design/                  ← the design system: DESIGN.md, tokens.css, fonts.css, reference/
    brand/                   ← logo-mark.svg and logo-mark-two-tone.svg (both inlined in icons.js), favicons, apple-touch-icon.png
    index.html               ← with the four dashboard <meta> tags
    type.css                 ← text styles and accent themes, from tokens only
    style.css                ← reset, layout, components
    app.js                   ← entry: imports persist.js, hands it to createStore, starts the router
    fonts/                   ← .woff2 files + their OFL licenses
    js/
      store.js               ← the only file that talks to persist.js
      derive.js              ← pure math; no DOM, no storage
      format.js              ← units, weights, dates, "5 days ago"
      library.js
      icons.js
      dialogs.js             ← confirmDialog, promptDialog, sheet helpers
      chart.js
      sample-data.js
      views/  board.js, log-sheet.js, lift-editor.js, add-lift.js, stats.js, settings.js
    tests/
      derive.test.js
      store.test.js
```

The 250-line limit applies to JavaScript files; `style.css` may run longer, organised by component with a comment heading for each.

### Verify every phase

- **Unit tests** run with Node's built-in test runner, with no packages: `node --test "tests/*.test.js"`, from `tools/liftboard/`. Test `derive.js` fully: `summarizeSession` with mixed sets, `e1rm` including a single, PR ties and near-ties within 0.01, 2-decimal rounding, `showsPR`, the trend and flame, bodyweight lifts with both kinds of session, every badge, and `pruneSessions`. Test `store.js` with a fake persist object (a `Map` behind `get` and `set`): loading, seeding, `migrate`, that each operation writes only the keys it changed, that `onSyncStatus` passes `onStatus` through, that session ids are `s-` plus 8 characters and unique within their lift, that malformed data is never overwritten, and the export/import round trip.
- **Run it** by serving the **dashboard's root**, so the `../../shared/persist.js` import resolves — from `tools/liftboard/`: `python3 -m http.server 8000 --directory ../..` — then open `http://localhost:8000/tools/liftboard/`. Use the browser's device toolbar for phone sizes.
- **Before reporting a phase done:** the tests pass, the page loads with **no console errors**, and you've listed that phase's acceptance checks for me to try. Never report done because the code looks right.

### Working style

- Build one phase at a time, then stop and report.
- Work directly on **`main`**. Never create branches. Don't commit or push — I check the work and commit it myself. Only ever change files in `tools/liftboard/`; other tools' uncommitted changes are left alone.
- Change only what the current phase needs.
- If something in this spec is ambiguous or seems wrong, ask rather than guess.

## Build phases

Eight phases. Each ends with a tool that loads, works, and does something checkable by hand.

### Phase 0 — Foundations

First, read `../../shared/persist.js` and confirm how `syncedState`, `get` and `set` behave against the assumptions under Persistence. Report any difference before building.

Then: `index.html` with the four dashboard `<meta>` tags; `design/tokens.css` and `type.css` with the fonts self-hosted; `style.css`; `app.js` importing `persist.js` with the *Loading…* and *couldn't connect* states; `store.js` with load, save, migrate and seeding; `derive.js` complete, with its tests; `format.js`; the Board header's wordmark and sync dot; the tab bar and hash routing; and empty states for all three tabs.

**Acceptance:**
- `node --test "tests/*.test.js"` passes.
- The page shows the dark background, the wordmark, and three tabs that switch views and survive a reload.
- The seeded tags are still there after a reload, which proves the round trip through `persist.js`.
- The Network tab shows no requests besides persist.js's Firebase/Google traffic.
- The sync dot settles to *synced* after load.
- With Firebase blocked (DevTools → Network → block `gstatic.com`, then reload), the page shows *"LiftBoard couldn't connect. Try again when you have signal."*
- LiftBoard appears in the dashboard's grid with its title, description, and chart icon.

### Phase 1 — Creating lifts

The Add Lift sheet with search and the library, the Lift Editor (name, equipment, pattern, notes, delete), `icons.js`, and the dialog helpers.

**Acceptance:** You can add Bench Press from the library and a made-up lift. Both appear on the Board as a plain list. Reload — they're still there. Editing and deleting both work, and deleting confirms with the lift's name.

### Phase 2 — Logging

The Log Session sheet: set rows, add and remove, validation, prefill, discard confirmation, and logging. The Board list shows `225 × 5 · e1RM 263` as plain text.

**Acceptance:**
- A first log opens with one empty row.
- Log three sets at different weights; the Board shows the heaviest set and the best e1RM.
- Reopen the sheet; the rows come back as logged.
- Edit a row and tap outside the sheet; you're asked to discard.
- An empty reps field disables Log Session.
- On a phone-sized screen, focusing a field doesn't zoom the page.

### Phase 3 — The card grid

The Board header, the card grid, the hero, the e1RM line with its arrow and PR, the date line, badges, and `sample-data.js` with the `?debug` loader. The sample data includes: a never-logged lift, a stale lift, a trending lift, a lift whose latest session is a PR, and a bodyweight lift with both plain and loaded sessions.

**Acceptance:**
- Cards are two per row on a phone.
- With `?debug`, load the sample data. The stale lift shows ❄️, the PR lift 🔥, the trending lift ↗, and the never-logged lift reads "Not logged yet".
- The bodyweight lift shows `BW × 12` or `BW+15 × 8`, and never an e1RM.
- Log a session that beats a lift's last one — ↗ appears. Beat its best ever — 🔥 appears, and `· PR` disappears.

### Phase 4 — Tags, filtering, sorting

Tags in the Lift Editor and the log sheet, the filter chips, and the sort control.

**Acceptance:** Tag a lift Push and Upper. Tapping Push filters the board; Push plus Legs shows lifts with either. Each sort option reorders the grid. Filters and sort survive a reload.

### Phase 5 — Stats

The Stats list, the lift detail, metrics and ranges, the summary figures, the SVG chart, and the Sessions list with delete.

**Acceptance:**
- A sample lift with months of sessions draws a rising line, and the latest value is called out.
- Switching metric and range both redraw it.
- A bodyweight lift offers Reps and Added load, each with its own line; a band lift offers Reps and Est. 1RM.
- Deleting the latest session updates the chart and the Board card to match the session before it.
- The chart follows DESIGN.md (see Visual design → Chart card).

### Phase 6 — Settings and data

Units, accent, Keep history with pruning, the Lifts and Tags screens, export, import, delete-all, and the About text.

**Acceptance:**
- Kilograms changes every number everywhere, and switching back restores the originals exactly.
- Brick and Ink recolor everything instantly, with nothing vanishing.
- Export downloads a readable file; importing it restores the same data; importing a broken file is refused with a message.
- Keep history set to 6 months on sample data asks first and names a count, and every card still shows the same hero, PR and badge afterwards.

### Phase 7 — Polish and publish

A final pass on accessibility (labels, focus rings, reduced motion, the sync dot's announcements) and dark mode. Publishing — committing and pushing `main`, which rebuilds the dashboard index — is mine to do, not Claude's.

**Acceptance, on a real iPhone, from the published dashboard:**
- LiftBoard opens from the dashboard grid.
- The header clears the notch, and the tab bar clears the home indicator.
- A session logged on the phone is still there after closing the tab and reopening it.
- The whole core loop — filter, tap, adjust, log — works one-handed at the gym.

### If a phase goes wrong

From `tools/liftboard/`, discard the uncommitted changes (`git restore .` for edited files, and delete any new files the phase added), which returns the project to the last good phase, then run the phase again with a note about what broke.

## Decisions and deferrals

| Question | Decision | Why |
| --- | --- | --- |
| Where is data kept? | The dashboard's `persist.js`, docId `liftboard`, under four purpose-named keys | Every tool in the dashboard saves the same way |
| How is data protected? | Stable ids for every record; malformed data is never overwritten; failed saves are shown | Reordering or a bug can't scramble or erase real data |
| What's the hero? | Last session's heaviest set, with its reps | It answers "what did I lift last time?" |
| What's the PR? | The best session of the same kind as the latest; the earliest wins ties | Plain and loaded bodyweight (or band) sessions are never compared |
| How long is history kept? | 1 year by default; 6 months or 2 years if chosen; no Forever; latest and record sessions always kept | Minimal data, without PRs silently resetting |
| How does data stay under Firestore's 1 MiB document limit? | The retention window. With at most 2 years of slim session summaries (8-character session ids, 2-decimal numbers), LiftBoard stays far inside it, so there's no storage meter | `persist.js` keeps all four keys in one document |
| How are saves shown? | A sync dot in the Board header, driven by `persist.onStatus`; no "couldn't save" message | `persist.js`'s `set` never throws or rejects, so status is the only signal |
| Offline? | LiftBoard needs a connection to open, and shows a *couldn't connect* message without one. No local fallback storage | `persist.js` loads Firebase at import time |
| Known limitation: offline saves can be lost | Accepted for now; to be fixed in `persist.js` by the dashboard, not in LiftBoard | On load, `persist.js` lets the cloud copy overwrite the device copy. Sessions logged while the cloud write failed are lost the next time LiftBoard opens online |
| Near-equal scores? | Within 0.01 counts as a tie; unchanged log rows keep their original kg; "ties the PR" is judged by the rounded figure on screen | Unit conversion and rounding must never fake a ↗ or 🔥 |
| Charts? | Hand-drawn SVG | One chart type doesn't justify a library |
| Logo and browser icons? | The mark inlined in two variants, all-accent or two-tone (squares `--text`, arrow `--accent`), chosen by `HEADER_LOGO`; two-tone is active for now; fixed black-and-white favicons and Home Screen icon in `brand/` | The header mark follows the accent; browser icons can't read CSS |
| Icons? | Lucide for the UI; Atlas Icons for equipment, redrawn to Lucide's grid and line weight; copied in as inline SVG | No runtime requests; permissive licenses |
| What does a lift's icon show? | Its equipment, not its movement pattern | Equipment is what you see at the gym; a pattern can't be drawn for every exercise in it |
| Bodyweight flag? | Replaced by `equipment: "bodyweight"` in version 2; band also allows no weight | One field says both what the icon is and how weight works |
| Fonts? | Self-hosted Geist and Geist Mono; wordmark font to be chosen | No third-party requests; swapping is one file and one token |
| Long-press menus? | None; edit through the log sheet and Settings | Long-press is unreliable in mobile browsers |
| Reordering? | ▲/▼ buttons | Drag-and-drop on touch needs a library or a lot of code |
| Accents? | Cobalt, Brick, Ink, mapped to the design system's tested blue, orange and off-white | Same names as the iOS app |

### The design reference

`design/DESIGN.md` and the images in `design/reference/` control how LiftBoard looks. They're generic, though, and don't know LiftBoard's content: **for structure, features and content, this spec wins.** In particular (some of these date from the original mockups):

- Cards show last session's heaviest set, not the all-time PR, with a relative date.
- No unit on the hero or the e1RM line: `225 × 5`, `e1RM 263`, not `225 lb × 5`, `e1RM 251 lb`.
- Bodyweight lifts read `BW+45 × 5`, with no e1RM line.
- The accents are Cobalt, Brick and Ink (see Visual design → Accent).
- The header shows a sync dot, not a settings gear.
- The header has sort and add buttons, and the subtitle is live.
- There's a bottom tab bar.
- The Last hint shows only the date.
- The date row has no chevron.
- The seeded tags are LiftBoard's own.

### Explicitly deferred

- Accounts or a server of LiftBoard's own — persistence belongs to the dashboard
- A service worker, manifest, or install flow for this tool alone
- Sharing data between devices other than by export and import
- Keeping sets from any session but the latest; backdating or editing sessions
- Plate calculator, goals, projected maxes
- Comparing lifts on one chart; streaks; volume totals
- Timed holds as a separate kind of lift
- Drag-and-drop reordering
- Merge-on-import, undo
- Any payment or unlock
