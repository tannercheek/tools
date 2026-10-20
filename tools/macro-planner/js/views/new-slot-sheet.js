// New slot sheet for Settings' meal slots (SPEC §3.4): name a slot, like "Pre-workout".

import { primaryButton } from '../ui/buttons.js';
import { textField } from '../ui/inputs.js';
import { openSheet } from '../ui/sheet.js';

// Resolves to the name, trimmed, or null if the sheet closes without one.
export async function newSlotSheet() {
  let chosen = null;
  let sheet;

  const name = textField({ label: 'Name' });
  name.input.addEventListener('input', () => name.setError(null));

  const form = document.createElement('form');
  form.className = 'slot-form';
  form.noValidate = true;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = name.input.value.trim();
    if (!text) {
      name.setError('Enter a name');
      name.input.focus();
      return;
    }
    chosen = text;
    sheet.close();
  });

  const add = primaryButton('Add slot', { block: true });
  add.type = 'submit';
  form.append(name.element, add);

  sheet = openSheet({ title: 'New slot', content: form, initialFocus: name.input });
  await sheet.closed;
  return chosen;
}
