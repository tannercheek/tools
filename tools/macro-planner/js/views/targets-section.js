// The Targets section of Settings (SPEC §3.1): calories and the three macros, worked out from the
// profile and the latest weigh-in. Typing over one overrides it, and the override sticks until
// it's reset. Until the profile is complete there are no targets, calculated or overridden, so
// the section is just a note.

import { TARGET_WARNINGS, bmr, profileTargets } from '../calc.js';
import { icon } from '../icons.js';
import { readTarget, targetText } from '../profile.js';
import { secondaryButton } from '../ui/buttons.js';
import { numberField } from '../ui/inputs.js';

// In the fixed macro order (DESIGN §2).
const TARGETS = [
  { key: 'kcal', label: 'Calories', unit: 'kcal', message: 'Enter an amount above 0' },
  { key: 'protein', label: 'Protein', unit: 'g', message: 'Enter a number, like 34 or 34.5' },
  { key: 'fat', label: 'Fat', unit: 'g', message: 'Enter a number, like 34 or 34.5' },
  { key: 'carbs', label: 'Carbs', unit: 'g', message: 'Enter a number, like 34 or 34.5' },
];

const integer = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

// Warned about, but nothing is blocked (SPEC §3.1).
function warningLine(warning, bmrKcal) {
  const line = document.createElement('p');
  line.className = 'settings__warning';
  line.innerHTML = icon('circle-alert');
  line.append(
    warning === TARGET_WARNINGS.BELOW_BMR
      ? `Your calorie target is below your BMR of ${integer.format(bmrKcal)} kcal.`
      : 'Protein and fat use up all your calories, so carbs are 0.',
  );
  return line;
}

// One target's field. A valid committed value is saved as an override through onCommit, and
// under an override sit what Reset would give and the Reset button.
function targetField({ key, label, unit, message }, { onInput, onCommit }) {
  const field = numberField({ label, unit, macro: key });
  // The text last shown for the target, so what's typed only counts once it differs from it.
  let shown = '';

  const calculated = document.createElement('span');
  const reset = secondaryButton('Reset', {
    onClick: () => {
      // Reset hides itself. A keyboard user goes back to the target rather than losing focus;
      // a tap doesn't focus the button, so focus stays put and no keyboard opens.
      const refocus = reset.matches(':focus-visible');
      onCommit(key, null);
      if (refocus) field.input.focus();
    },
  });
  reset.setAttribute('aria-label', `Reset ${label} to calculated`);
  const line = document.createElement('div');
  line.className = 'settings__calculated';
  line.append(calculated, reset);
  field.element.append(line);

  field.input.addEventListener('input', () => {
    field.setError(null);
    onInput();
  });
  field.input.addEventListener('change', () => {
    const value = readTarget(key, field.input.value);
    if (value === null) {
      field.setError(message);
      return;
    }
    shown = field.input.value;
    onCommit(key, value);
  });

  return {
    key,
    element: field.element,
    // An override being typed: valid, and different from what was shown. Otherwise null.
    typed() {
      return field.input.value === shown ? null : readTarget(key, field.input.value);
    },
    // The field being typed in keeps its text; any other shows the target, dropping an entry
    // that wasn't valid along with its error.
    show({ text, calculatedValue, overridden }) {
      if (document.activeElement !== field.input) {
        field.input.value = shown = text;
        field.setError(null);
      }
      line.hidden = !overridden;
      calculated.textContent = `Calculated ${integer.format(calculatedValue)}`;
    },
  };
}

// onCommit(key, value): save an override, or with null, reset that target to calculated.
// Returns the section's elements, and show({ profile, weightKg, overrides, macroSplit }) to show
// the targets for a profile and weight (what's saved, or being typed), the saved overrides and
// the core doc's macro split.
export function targetsSection({ onCommit }) {
  const note = document.createElement('p');
  note.className = 'settings__note';
  note.textContent = 'Your targets show up here once every field above is filled in.';
  const grid = document.createElement('div');
  grid.className = 'settings__grid';
  const warnings = document.createElement('div');
  warnings.className = 'settings__warnings';

  let current;
  const fields = TARGETS.map((target) => targetField(target, { onInput: () => show(current), onCommit }));
  grid.append(...fields.map((field) => field.element));

  // An override being typed moves the others' calculated values straight away, as when kcal
  // moves the fat and carbs defaults.
  function show(next) {
    current = next;
    const { profile, weightKg, overrides: saved, macroSplit } = next;
    const overrides = { ...saved };
    for (const field of fields) overrides[field.key] = field.typed() ?? overrides[field.key];
    const values = profileTargets(profile, weightKg, overrides, macroSplit);

    note.hidden = values !== null;
    grid.hidden = values === null;
    warnings.hidden = values === null || values.warnings.length === 0;
    if (!values) return;

    for (const field of fields) {
      field.show({
        text: targetText(field.key, values, saved),
        calculatedValue: profileTargets(profile, weightKg, { ...overrides, [field.key]: null }, macroSplit)[field.key],
        overridden: saved[field.key] != null,
      });
    }
    const bmrKcal = bmr({ ...profile, weightKg });
    warnings.replaceChildren(...values.warnings.map((warning) => warningLine(warning, bmrKcal)));
  }

  return { elements: [note, grid, warnings], show };
}
