// The macro split in Settings' Targets (SPEC §3.1, DESIGN §10 macro split): by bodyweight or by
// percent, above the target overrides. By bodyweight, a note under the control says how the
// numbers are worked out, since nothing else on the screen does. By percent, three whole-number
// fields under it say what they add up to instead. A split that adds up to 100 saves as it's
// typed and moves the targets; one that doesn't says so and saves nothing, so the targets keep
// the last split that did.

import { icon } from '../icons.js';
import { readPercent, readSplit, splitBy, startingSplit } from '../profile.js';
import { segmentedControl } from '../ui/controls.js';
import { uniqueId } from '../ui/ids.js';
import { numberField } from '../ui/inputs.js';

const OPTIONS = [
  { value: 'bodyweight', label: 'By bodyweight' },
  { value: 'percent', label: 'By percent' },
];
// By percent, the fields and their total already say how the split works; by bodyweight,
// nothing else on the screen says so (SPEC §3.1).
const BODYWEIGHT_NOTE =
  'Protein is 1.8 g per kg of bodyweight (≈0.8 g/lb), fat is 25% of your calorie target, ' +
  'and carbs are whatever calories are left. If protein and fat already use up the target, carbs clamp to 0.';
// In the fixed macro order (DESIGN §2).
const MACROS = [
  { key: 'protein', label: 'Protein' },
  { key: 'fat', label: 'Fat' },
  { key: 'carbs', label: 'Carbs' },
];

// doc(): the core doc as it is now. currentTargets(): the targets as shown, or null with none yet.
// onPercent(percent) saves a split that adds up to 100; onBodyweight() switches back. Returns the
// section's elements.
export function macroSplitSection({ doc, currentTargets, onPercent, onBodyweight }) {
  const fields = MACROS.map(({ key, label }) => ({ key, ...numberField({ label, unit: '%', macro: key }) }));
  const grid = document.createElement('div');
  grid.className = 'settings__split';
  grid.append(...fields.map((field) => field.element));

  // One line for all three fields: their total, or what's wrong with them (DESIGN §10).
  const total = document.createElement('p');
  total.className = 'settings__split-total';
  total.id = uniqueId('split-total');
  total.innerHTML = icon('circle-alert');
  const totalText = document.createElement('span');
  total.append(totalText);
  for (const { input } of fields) {
    input.setAttribute('aria-describedby', `${input.getAttribute('aria-describedby')} ${total.id}`);
  }

  const percentFields = document.createElement('div');
  percentFields.className = 'field';
  percentFields.append(grid, total);

  const bodyweightNote = document.createElement('p');
  bodyweightNote.className = 'settings__note';
  bodyweightNote.textContent = BODYWEIGHT_NOTE;

  const texts = () => Object.fromEntries(fields.map(({ key, input }) => [key, input.value]));

  // wrong: the fields to show the error border on.
  function showTotal(message, wrong = []) {
    total.classList.toggle('field__error', wrong.length > 0);
    total.querySelector('.icon').toggleAttribute('hidden', wrong.length === 0);
    totalText.textContent = message;
    for (const field of fields) {
      const isWrong = wrong.includes(field);
      field.element.classList.toggle('field--error', isWrong);
      if (isWrong) field.input.setAttribute('aria-invalid', 'true');
      else field.input.removeAttribute('aria-invalid');
    }
  }

  function check() {
    const { total: sum, percent } = readSplit(texts());
    if (sum === null) {
      const wrong = fields.filter(({ input }) => readPercent(input.value) === null);
      showTotal('Enter whole numbers, like 30.', wrong);
    } else if (sum !== 100) {
      showTotal(`Adds up to ${sum}%. Make it 100%.`, fields);
    } else {
      showTotal('Adds up to 100%');
    }
    return percent;
  }

  function fill(percent) {
    for (const { key, input } of fields) input.value = String(percent[key]);
    check();
  }

  const isSaved = (percent) => MACROS.every(({ key }) => doc().macroSplit?.percent?.[key] === percent[key]);

  for (const { input } of fields) {
    input.addEventListener('input', () => {
      const percent = check();
      if (percent && !(splitBy(doc()) === 'percent' && isSaved(percent))) onPercent(percent);
    });
    // A blank counts as 0, so once it's left it shows as 0.
    input.addEventListener('change', () => {
      if (input.value.trim() === '') input.value = '0';
    });
  }

  const control = segmentedControl({
    label: 'Macro split',
    showLabel: true,
    options: OPTIONS,
    value: splitBy(doc()),
    onChange: (by) => {
      percentFields.hidden = by !== 'percent';
      bodyweightNote.hidden = by !== 'bodyweight';
      if (by === 'bodyweight') {
        onBodyweight();
        return;
      }
      const percent = startingSplit(doc(), currentTargets());
      fill(percent);
      onPercent(percent);
    },
  });

  percentFields.hidden = splitBy(doc()) !== 'percent';
  bodyweightNote.hidden = splitBy(doc()) !== 'bodyweight';
  if (!percentFields.hidden) fill(startingSplit(doc(), currentTargets()));

  return [control.element, bodyweightNote, percentFields];
}
