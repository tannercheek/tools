// New tag sheet for the meal editor (SPEC §3.3, DESIGN §9): type a tag, or pick one your
// meals already use. Typing filters the ones to pick from.

import { primaryButton } from '../ui/buttons.js';
import { tagGroup, tagPill } from '../ui/controls.js';
import { textField } from '../ui/inputs.js';
import { openSheet } from '../ui/sheet.js';

// tags: the tags in use that this meal doesn't have yet, A–Z. Picking one adds it straight
// away. Resolves to the picked or typed tag, trimmed, or null if the sheet closes without one.
export async function newTagSheet({ tags }) {
  let chosen = null;
  let sheet;

  const pick = (tag) => {
    chosen = tag;
    sheet.close();
  };

  const name = textField({ label: 'Tag' });
  const choices = tags.map((tag) => ({ tag, pill: tagPill({ label: tag, onClick: () => pick(tag) }) }));
  const inUse = tagGroup({ label: 'Tags in use', pills: choices.map(({ pill }) => pill) });

  function filter() {
    const query = name.input.value.trim().toLowerCase();
    for (const { tag, pill } of choices) pill.hidden = !tag.toLowerCase().includes(query);
    inUse.hidden = choices.every(({ pill }) => pill.hidden);
  }
  name.input.addEventListener('input', () => {
    name.setError(null);
    filter();
  });
  filter();

  const form = document.createElement('form');
  form.className = 'tag-form';
  form.noValidate = true;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = name.input.value.trim();
    if (!text) {
      name.setError('Enter a tag');
      name.input.focus();
      return;
    }
    pick(text);
  });

  const add = primaryButton('Add tag', { block: true });
  add.type = 'submit';
  form.append(name.element, inUse, add);

  // With tags to pick from, the panel takes focus, so the keyboard doesn't cover them unasked.
  sheet = openSheet({ title: 'New tag', content: form, initialFocus: tags.length === 0 ? name.input : undefined });
  await sheet.closed;
  return chosen;
}
