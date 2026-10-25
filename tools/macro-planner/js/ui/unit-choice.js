// Unit choice (DESIGN §10, §12): an amount field whose unit suffix is a button when the food has
// more than one unit (SPEC §3.2), and the Unit sheet it opens.

import { icon } from '../icons.js';
import { secondaryButton } from './buttons.js';
import { numberField } from './inputs.js';
import { openSheet } from './sheet.js';

// A full-width secondary button per unit, in the food's order. The current one is marked with
// aria-current and a trailing check. Picking one closes the sheet. Resolves to the unit picked,
// or null if the sheet closes without one.
export async function unitSheet({ units, current }) {
  let picked = null;
  let sheet;
  const buttons = units.map((unit) => {
    const button = secondaryButton('', {
      block: true,
      onClick: () => {
        picked = unit;
        sheet.close();
      },
    });
    button.classList.add('unit-option');
    const label = document.createElement('span');
    label.className = 'unit-option__label';
    label.textContent = unit;
    button.append(label);
    if (unit === current) {
      button.setAttribute('aria-current', 'true');
      button.insertAdjacentHTML('beforeend', icon('check'));
    }
    return button;
  });
  sheet = openSheet({ title: 'Unit', content: buttons });
  await sheet.closed;
  return picked;
}

// A numeric amount field. units: the food's units, from portions.js's foodUnits; with one, the
// unit is plain text, as in any number field. unit: the one it starts in. onUnitChange(unit) runs
// when another is picked; the number in the field stays, so "2" becomes 2 of the new unit.
// Returns the numberField, plus unit() for the unit the amount is in now.
export function amountField({ label, value, units, unit, onUnitChange }) {
  let current = unit;
  if (units.length < 2) return { ...numberField({ label, value, unit }), unit: () => current };

  const text = document.createElement('span');
  text.className = 'unit-btn__text';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'unit-btn';
  button.append(text);
  button.insertAdjacentHTML('beforeend', icon('chevron-down'));

  function show(next) {
    current = next;
    text.textContent = next;
    button.setAttribute('aria-label', `Unit: ${next}, change`);
  }
  show(unit);

  button.addEventListener('click', async () => {
    const picked = await unitSheet({ units, current });
    if (!picked || picked === current) return;
    show(picked);
    onUnitChange?.(picked);
  });

  const field = numberField({ label, value, unit: { control: button, text } });
  field.element.classList.add('field--unit');
  return { ...field, unit: () => current };
}
