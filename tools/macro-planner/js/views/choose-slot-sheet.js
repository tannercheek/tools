// Picking the slot to add to on a locked past day (SPEC §3.6): it lists entries rather than slots,
// so its Add asks which slot first, then opens the add sheet for it.

import { secondaryButton } from '../ui/buttons.js';
import { openSheet } from '../ui/sheet.js';

// slots: the core doc's slots, in order. Resolves to the slot picked, { id, name }, or null if
// the sheet closes without one.
export async function chooseSlotSheet({ slots }) {
  let picked = null;
  let sheet;
  const buttons = slots.map((slot) =>
    secondaryButton(slot.name, {
      block: true,
      onClick: () => {
        picked = slot;
        sheet.close();
      },
    }),
  );
  sheet = openSheet({ title: 'Add to which slot?', content: buttons });
  await sheet.closed;
  return picked;
}
