// Picking where to add (SPEC §3.6): a locked past day lists entries rather than slots, and Today's
// Add food and Quick numbers aren't in a slot, so each asks first, then opens the add sheet for it.
// Other, for what's eaten outside the slots (SPEC §3.5), comes after the slots.

import { OTHER } from '../data.js';
import { secondaryButton } from '../ui/buttons.js';
import { openSheet } from '../ui/sheet.js';

// slots: the core doc's slots, in order. Resolves to the slot picked, { id, name }, data.js's OTHER
// for Other, or null if the sheet closes without one.
export async function chooseSlotSheet({ slots }) {
  let picked = null;
  let sheet;
  const buttons = [...slots, OTHER].map((slot) =>
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
