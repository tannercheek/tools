// Unlinked showcase of the shared components at #/components. Step 7.2 removes it.
// The foods and numbers here are sample text for checking layout, not data.

import { iconButton, primaryButton, secondaryButton } from '../ui/buttons.js';
import { segmentedControl, switchControl } from '../ui/controls.js';
import { emojiPickerSheet } from '../ui/emoji-picker.js';
import { numberField, textField } from '../ui/inputs.js';
import { emojiTile, listRow, rowList } from '../ui/row.js';
import { confirmSheet, openSheet } from '../ui/sheet.js';

function section(title, ...children) {
  const element = document.createElement('section');
  element.className = 'demo-section';
  const heading = document.createElement('h2');
  heading.className = 'section-title';
  heading.textContent = title;
  element.append(heading, ...children);
  return element;
}

function group(...children) {
  const element = document.createElement('div');
  element.className = 'demo-row';
  element.append(...children);
  return element;
}

function buttons() {
  return section(
    'Buttons',
    group(primaryButton('Save'), secondaryButton('Log'), iconButton('plus', 'Add'), iconButton('chevron-left', 'Back')),
    group(primaryButton('Save', { disabled: true }), secondaryButton('Log', { disabled: true })),
    primaryButton('Full-width primary', { block: true }),
  );
}

function rows() {
  return section(
    'List rows',
    rowList([
      listRow({
        emoji: '🍳',
        eyebrow: 'Breakfast · Eaten',
        title: 'Eggs & toast',
        numbers: { kcal: 560, protein: 34, fat: 28, carbs: 42 },
        trailing: secondaryButton('Log'),
      }),
      listRow({
        emoji: '🍚',
        eyebrow: '100 g',
        title: 'Rice, white, cooked',
        numbers: { kcal: 130, protein: 2.7, fat: 0.3, carbs: 28.2 },
        trailing: iconButton('plus', 'Add Rice, white, cooked'),
      }),
      listRow({
        emoji: '🍽️',
        title: 'A very long meal name that should truncate with an ellipsis on one line',
        numbers: { kcal: 2600, protein: 190, fat: 75, carbs: 290 },
        trailing: iconButton('plus', 'Add long meal'),
      }),
    ]),
  );
}

function inputs() {
  const name = textField({ label: 'Name' });
  const weight = numberField({ label: 'Weight', unit: 'kg', value: '82.6' });
  const protein = numberField({ label: 'Protein', unit: 'g', value: '12..5' });
  const validate = () => protein.setError(/^\d+(\.\d+)?$/.test(protein.input.value.trim()) ? null : 'Enter a number, like 34 or 34.5');
  protein.input.addEventListener('input', validate);
  validate();
  return section('Inputs', name.element, weight.element, protein.element);
}

function controls() {
  return section(
    'Controls',
    segmentedControl({
      label: 'Range',
      value: '7',
      options: [
        { value: '7', label: '7 days' },
        { value: '30', label: '30 days' },
      ],
    }).element,
    segmentedControl({
      label: 'History retention',
      value: '1y',
      options: [
        { value: '6m', label: '6 months' },
        { value: '1y', label: '1 year' },
        { value: 'never', label: 'Never' },
      ],
    }).element,
    switchControl({ label: 'Pin a fixed budget' }).element,
    switchControl({ label: 'Switch, on', checked: true }).element,
  );
}

function sheets() {
  const result = document.createElement('p');
  result.className = 'demo-note';
  result.setAttribute('role', 'status');
  result.textContent = 'Confirm sheet result: none yet';

  const openPlain = secondaryButton('Open sheet', {
    onClick: () => {
      const intro = document.createElement('p');
      intro.className = 'sheet__message';
      intro.textContent = 'Tab should loop through these controls without leaving the sheet.';
      const label = textField({ label: 'Label' });
      const units = segmentedControl({
        label: 'Units',
        value: 'metric',
        options: [
          { value: 'metric', label: 'Metric' },
          { value: 'imperial', label: 'Imperial' },
        ],
      });
      const done = primaryButton('Done', { block: true, onClick: () => sheet.close() });
      const sheet = openSheet({ title: 'Bottom sheet', content: [intro, label.element, units.element, done] });
    },
  });

  const openConfirm = secondaryButton('Delete meal', {
    onClick: async () => {
      const confirmed = await confirmSheet({
        title: 'Delete “Rice & beef”?',
        message: 'It will be removed from your saved meals. Days you already logged stay as they are.',
        confirmLabel: 'Delete meal',
      });
      result.textContent = `Confirm sheet result: ${confirmed}`;
    },
  });

  return section('Sheets', group(openPlain, openConfirm), result);
}

// Starts on 🍽️, the default for new custom foods and meals; each pick becomes the next current one.
function emojiPicker() {
  let current = '🍽️';
  const tile = emojiTile(current);

  const result = document.createElement('p');
  result.className = 'demo-note';
  result.setAttribute('role', 'status');
  result.textContent = 'Emoji picker result: none yet';

  const open = secondaryButton('Choose emoji', {
    onClick: async () => {
      const chosen = await emojiPickerSheet({ current });
      if (chosen) {
        current = chosen;
        tile.textContent = chosen;
      }
      result.textContent = `Emoji picker result: ${chosen ?? 'closed without a choice'}`;
    },
  });

  return section('Emoji picker', group(tile, open), result);
}

export function render(container) {
  container.replaceChildren(buttons(), rows(), inputs(), controls(), sheets(), emojiPicker());
}
