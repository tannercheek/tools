# Project instructions

## UI / design system

- All UI must follow `design/DESIGN.md`. Read it before any visual change.
- Use ONLY the CSS variables in `design/tokens.css` (colors, radii, spacing, type). Never hardcode hex values, px radii or font sizes. If something is missing, propose a new token first.
- Copy markup patterns from `design/reference/components.html`. If images exist in `design/reference/`, match their look too.
- Fonts: Geist (UI) and Geist Mono (all numeric data). Dark theme only. No shadows, gradients or emoji. One accent (`--accent`) per screen for the primary action, active state and "current / new" highlights.
- The design system controls appearance only. Do not change an app's structure, features, content or behavior unless asked.
- After a UI change, open the page in a browser and check spacing, radii, contrast and focus states against DESIGN.md. Fix any drift before finishing.

(If this project already has a CLAUDE.md, append this section instead of replacing the file.)
