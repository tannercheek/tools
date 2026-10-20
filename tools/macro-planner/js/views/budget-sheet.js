// Pinning a budget on a flex slot, from Plan (SPEC §3.4): four numbers the slot counts as while
// it's open, in the rings and at lock-in, in place of the day's remaining.

import { primaryButton, secondaryButton } from '../ui/buttons.js';
import { openSheet } from '../ui/sheet.js';
import { numbersFields } from './numbers-fields.js';

// slot: { name }. budget: the slot's pinned budget, or null. Resolves to { budget } with the
// four numbers to pin, { budget: null } once "Remove budget" is tapped, or null if the sheet
// closes with no change.
export async function budgetSheet({ slot, budget }) {
  let result = null;
  let sheet;
  const numbers = numbersFields(budget ?? {});

  const message = document.createElement('p');
  message.className = 'sheet__message';
  message.textContent = 'The slot counts as these numbers until you log something in it.';

  const form = document.createElement('form');
  form.className = 'budget-form';
  form.noValidate = true;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const pinned = numbers.read();
    if (!pinned) return;
    result = { budget: pinned };
    sheet.close();
  });

  const pin = primaryButton('Pin budget', { block: true });
  pin.type = 'submit';
  form.append(numbers.element, pin);
  // Without a budget, the slot shows the day's remaining again. Easy to pin back, so no confirm.
  if (budget) {
    const remove = secondaryButton('Remove budget', {
      block: true,
      onClick: () => {
        result = { budget: null };
        sheet.close();
      },
    });
    form.append(remove);
  }

  sheet = openSheet({ title: `${slot.name} · Budget`, content: [message, form], initialFocus: numbers.firstInput });
  await sheet.closed;
  return result;
}
