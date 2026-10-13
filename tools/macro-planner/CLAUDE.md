# CLAUDE.md — Macro Planner

Rules for working on this tool. Read this file, then `SPEC.md`, before every task. For any step that touches the UI, read `DESIGN.md` too.

## Source of truth

- **`SPEC.md`** defines what the app does. If a task isn't covered by it, stop and ask. Don't add features, settings or options that aren't in the spec, even small ones.
- **`PLAN.md`** defines the build order. Work on one step at a time, only the step you were given.
- **`DESIGN.md` + `tokens.css`** define how it looks. Both are final: don't change existing tokens or rules. Use tokens only, never hard-coded values. If you need a value that has no token, add one to `tokens.css` as `DESIGN.md` says, and call it out in your end-of-step summary.
- **DESIGN.md describes how things look, not what to build.** If it describes something SPEC.md doesn't include (e.g. the daily and stacked bar charts in DESIGN §7), don't build it.
- If two of these conflict, stop and ask. Don't resolve it silently.

## Where this lives

This tool sits in `tools/macro-planner/` inside my tools dashboard repo (static site on GitHub Pages). A build script reads the `<title>` and three `<meta>` tags in `index.html` (`description`, `icon`, `tags`) to make the dashboard card. Don't remove or rename them. `icon` must stay one of the dashboard's existing keys.

Never edit files outside `tools/macro-planner/`, except `shared/persist.js` when a step explicitly says so.

## Stack

- Vanilla HTML, CSS, JS with ES modules. No frameworks, no TypeScript, no bundler, no npm dependencies.
- No CDN scripts. Fonts load from the Google Fonts `<link>` in `tokens.css`'s header comment. Nothing else loads from a CDN.
- Charts and rings are hand-written SVG.
- UI icons are Lucide SVGs inlined in `js/icons.js`. Food and meal emoji render from the bundled Fluent SVGs through `js/emoji.js` (SPEC §5.1). No icon fonts. Native emoji only appear as the fallback for a missing SVG.
- All imports use relative paths with the `.js` extension.
- The app must run by serving the repo root with any static server (e.g. `python3 -m http.server`) and opening `/tools/macro-planner/`.

## Code rules

- **Keep logic pure and separate from the DOM.** Math lives in `js/calc.js`, persistence in `js/store.js`, retention in `js/purge.js`. These files must never touch `document` or `window`, so they can be tested in Node.
- **Store metric, display either.** All weights, heights and food quantities are stored in metric. Convert only at the display layer.
- **Snapshot rule.** A log entry stores its own label, emoji and numbers at the moment it's logged. Nothing that edits or deletes a food or meal may change a past day. This is the most important data rule in the app.
- **Meal totals are computed, never stored.**
- **Never invent nutrition values.** Every number in `data/foods.json` must come from USDA FoodData Central with its `fdcId` recorded. If you can't source a value, leave the food out and tell me.
- **Emoji are data, stored as the character.** A food or meal's `emoji` field holds one Unicode emoji character, never an image path.
- **Build UI from the shared components** in `js/ui/` (step 0.3). Don't make one-off buttons, inputs or sheets in a view.
- **Never use `confirm()`, `prompt()` or `alert()`.** Use the shared sheets.
- **Stable ids.** Use `crypto.randomUUID()` for user-created records. Never use array indexes as ids or persistence keys.
- Small files. If a file passes ~300 lines, say so and suggest a split rather than doing it unasked.
- Plain, descriptive names. Brief comments only where the *why* isn't obvious.

## Storage

- All persistence goes through the adapter in `js/store.js` (`load`, `save`, `remove`, `list`). Views never call `localStorage` or `persist.js` directly.
- `config.js` exports `MODE = 'personal' | 'public'`.
  - **personal:** wraps `../../shared/persist.js`, falls back to localStorage if the import fails, shows the sync indicator.
  - **public:** localStorage only. **Must not import `persist.js`, and must not show any passphrase or sync UI.** Treat a violation of this as a bug.
- Doc ids: `macro-planner` for the core doc, `macro-planner-log-YYYY-MM` for monthly logs. Don't change these without asking — they're live data keys.
- Never write code that deletes or overwrites user data without a confirm sheet in the UI, except the retention purge described in the spec.

## Testing

- Use Node's built-in runner: `node --test tools/macro-planner/tests/`. No test libraries.
- Every pure function in `calc.js`, `store.js` and `purge.js` gets tests. Use a tiny in-memory fake for localStorage.
- Run the tests before saying a step is done, and report the result. Don't mark a step done with failing tests.
- UI is checked by hand. At the end of each UI step, give me a short "how to check it" list (what to click, what should happen), including light and dark.

## Git

- All work happens on `main`. Don't create or switch branches.
- Never run git commands that change the repo: no add, commit, push, branch, checkout, merge, stash, reset or rebase. Read-only commands (status, diff, log) are fine.
- At the end of each step, suggest a commit message in the format `Macro Planner: <step id> — <short title>` for me to use.

## Working style

- **One PLAN.md step per task.** Finish it, then stop. Don't start the next step.
- At the start of a step, say in two or three lines what you're going to change.
- At the end, give me: files changed, the diff, test results, how to check it, anything you were unsure about, and the suggested commit message. New files are untracked, so `git diff` skips them. Show those in full or list them with `git status`.
- I review the diff, commit and push it myself.
- If a step turns out bigger than expected, stop and propose splitting it rather than pushing through.
- If something in SPEC.md looks wrong once you're in the code, flag it. Don't quietly work around it.

## Out of scope

Anything listed in SPEC.md §7 or §8. If I ask for one of those mid-build, remind me it's out of scope for v1 and confirm before doing it.
