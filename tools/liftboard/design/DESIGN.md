# Design System — "Quiet dark, loud numbers"

A general-purpose design language for personal tools and mobile-first web apps (trackers, planners, dashboards, utilities).
**Exact values live in `design/tokens.css`. Use tokens only — never hardcode a color, radius or font size.**
Visual references: `design/reference/*.png`. Markup patterns: `design/reference/components.html`.

This document describes *look and components*, not app structure. Keep each app's own layout, features and content; apply this system to how things look.

## Principles
1. **Dark by default.** Near-black ground, three surface steps (ink → surface → raised). Depth comes from lighter fills and hairline borders. **No drop shadows, no gradients.**
2. **One accent, rationed.** `--accent` marks exactly: the primary action, the active navigation indicator, the "current" item, and "new / notable" highlights (a badge, the latest bar in a chart). Never for decoration, links in body text, or secondary buttons.
3. **Data is the hero.** Any key value — numbers, amounts, durations, times, counts — uses `--font-mono`, weight 500, tight tracking, and is the largest thing in its card. Labels stay small and muted.
4. **Big touch, soft shapes.** Pill buttons, 20px cards, ≥44px tap targets, generous padding.
5. **Native feel.** Floating tab bar, sheets, large titles, stepper controls — mobile-first, works fine on desktop at max-width ~480px centered or in a responsive grid.

## Typography
- Sans: **Geist** (UI, headings). Mono: **Geist Mono** (all numeric data, times, codes, compact value chips).
- Scale: Display 44 · Title 28 · Heading 19 · Body 16 · Small 14 · Caption 13 · Label 12 (uppercase, +8% tracking, `--text-muted`).
- Headings weight 600 with negative tracking (see tokens). Body weight 400, color `--text-2`.
- Units (kg, min, %, $) sit beside their value: smaller, `--text-muted`, sans.

## Color usage
| Role | Token |
|---|---|
| Page | `--ink` |
| Card | `--surface` + 1px `--line-soft` |
| Inputs, rows inside cards, secondary buttons | `--raised` |
| Borders / dividers / empty tracks | `--line` |
| Headings, values | `--text` |
| Body | `--text-2` |
| Captions, labels | `--text-muted` |
| Icons (inactive), disabled | `--text-faint` (never for readable text) |
| Success / Warning / Danger | tinted bg (`--*-bg`) + solid text color; solid fill only for small dots |

Status is never conveyed by color alone — pair with a label, icon or ▲/▼.

## Shape
Radii: 8 tags · 12 inputs/rows · 16 compact cards · 20 cards · 28 sheets & tab bar · pill buttons/chips/switches.
Rows nested in a card use `--r-sm` (12) inside a `--r-lg` (20) card with 8–16 padding.

## Spacing
4-pt scale. Phone gutter 20 · card padding 16 (20 for hero) · 12 between stacked cards · 32 between sections · 8 between chips.

## Components (recipes)
- **Button — primary:** pill, height 52, padding 0 28, `--accent` fill, `--on-accent` text, weight 600. One per screen.
- **Button — strong:** as primary but `--text` fill, `--ink` text (hero moments only).
- **Button — secondary:** pill, `--raised` fill, `--text`, weight 500. Or outlined: transparent, 1px `--line`.
- **Button — quiet:** transparent, `--text-2`. **Destructive:** `--danger-bg` fill, `--danger` text.
- **Icon button:** 44–52 circle, `--raised` or transparent, 20px stroke icon (stroke 2, round caps).
- **Input:** height 52, radius 12, `--surface` fill, 1px `--line` border, 16px text. Focus: 1.5px `--accent` border. Label above (13px, `--text-2`), never placeholder-as-label.
- **Stepper:** `--surface` card radius 20, padding 8; −/+ are 52×52 `--raised` radius 14; center value mono 36. Optional quick-adjust chips below: 44 high, radius 12, mono 14.
- **Segmented control:** pill track `--surface` + `--line-soft`, padding 4; selected segment `--line` fill + `--text`; others `--text-muted`.
- **Switch:** 52×32 pill; on = `--accent` track + `--ink` knob; off = `--line` track + `--text-muted` knob.
- **Chip (filter):** height 36, pill. Selected = `--text` fill + `--ink` text; unselected = 1px `--line` border + `--text-2`.
- **Tag / badge:** height 22–24, radius 6, 11–12px weight 600–700. Highlight ("New", "Best", "Current") = accent fill; Success = success tint; Warning = warning tint; neutral = `--raised`.
- **Metric card:** `--surface`, radius 20, padding 16–20. Eyebrow label → mono value (38–52) + unit → optional mini bar chart of 5–7 bars (bars `--line`; highlight the latest bar with `--accent` only when it's notable, else `#3A3A3A`) → caption with trend (▲/▼ + success/danger text).
- **List row:** in a shared card, 14×16 padding, 40px `--raised` radius-12 icon tile, title 16/500 + caption 13 muted, mono value right, chevron `--text-faint`. Dividers 1px `--line-soft`.
- **Data row (table-like / editable):** grid of columns, e.g. `# | value | value | status`; `--raised` row radius 12; completed status = success-tint square 28 radius 8; pending row = dashed `--line` border, muted text.
- **Checklist row:** 26px circular checkbox (done = `--text` fill + `--ink` check; open = 1.5px `#3A3A3A` ring). Done text = `--text-muted` + line-through. The active/current row = `--raised` fill with a 4px `--accent` pill bar at its left (a separate radius-999 element, not a card border) and a highlight tag.
- **Progress:** 8px pill track `--line`, fill `--accent`. Segmented progress = a row of 6px pills.
- **Empty state:** dashed 1.5px `--line` border, radius 20, centered title + muted hint + one secondary button.
- **Floating tab bar:** inset 12 from edges, bottom 24, height 68, radius 28, `rgba(28,28,28,.94)` + 1px `--line`. 4 items max. Active = `--text` icon/label + 4px accent dot below; inactive = `--text-faint`.
- **Screen header:** small muted eyebrow (date, section) above a 34px title (600, −3%); optional round 48px accent icon button on the right for the screen's primary action.

## Do / Don't
- ✅ Mono for every numeric value. ✅ Sentence case labels; UPPERCASE only for eyebrows.
- ✅ Icons: 1.8–2px stroke, rounded, currentColor, no fills (except 3-dot menu).
- ❌ No emoji. ❌ No shadows or gradients. ❌ No accent on secondary actions or long text.
- ❌ No cards nested more than 2 deep. ❌ No pure `#000` / pure `#FFF` — use `--ink` / `--text`.
- ❌ No new colors, radii or font sizes without adding a token first.

## Accessibility
Body text ≥ 4.5:1 (all `--text*` except `--text-faint` pass on `--ink`/`--surface`). Real `<button>`/`<a>`/`<input>` + `<label>`; `aria-label` on icon-only buttons; `aria-pressed`/`aria-checked` on toggles; visible `:focus-visible` ring in accent. Respect `prefers-reduced-motion`. Motion: 150–200ms ease-out on press/toggle only.

## Theming
Change `--accent` (and `--on-accent` if the new accent is dark) to re-theme. Tested: `#D4F75E` (default lime), `#FF8A4C`, `#7CB4FF`, `#F2F2F0`.
