// Emoji picker sheet (SPEC §5.1, DESIGN §10): the curated food emoji from
// data/emoji-picker.json in a grid of native-emoji tiles. Plus the emoji field that
// opens it from a form.

import { uniqueId } from './ids.js';
import { emojiTile } from './row.js';
import { openSheet } from './sheet.js';

let request = null;

// Fetched once, then kept in memory. A failed fetch isn't kept, so the next open tries again.
function loadPickerEmoji() {
  request ??= fetch(new URL('../../data/emoji-picker.json', import.meta.url))
    .then((response) => {
      if (!response.ok) throw new Error(`emoji-picker.json: HTTP ${response.status}`);
      return response.json();
    })
    .catch((error) => {
      request = null;
      throw error;
    });
  return request;
}

// The button is the hit target; the tile inside it is hidden from assistive tech,
// so the name is what a screen reader reads.
function option({ char, name }, selected, onPick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'emoji-button emoji-picker__option';
  button.setAttribute('aria-label', name);
  if (selected) button.setAttribute('aria-current', 'true');
  button.append(emojiTile(char));
  button.addEventListener('click', () => onPick(char));

  const item = document.createElement('li');
  item.append(button);
  return { item, button };
}

function loadFailed() {
  const note = document.createElement('p');
  note.className = 'sheet__message';
  note.textContent = 'The emoji didn’t load. Check your connection, then try again.';
  return note;
}

// current: the character picked so far. Its tile starts selected and takes focus.
// Resolves to the chosen character, or null if the sheet closes without a choice.
export async function emojiPickerSheet({ current }) {
  const title = 'Choose an emoji';
  let chosen = null;
  let sheet;

  // Loaded before the sheet opens so it slides in at its full height.
  let choices;
  try {
    choices = await loadPickerEmoji();
  } catch (error) {
    console.error('[macro-planner] emoji picker failed to load:', error);
    sheet = openSheet({ title, content: loadFailed() });
    await sheet.closed;
    return null;
  }

  const pick = (char) => {
    chosen = char;
    sheet.close();
  };
  const options = choices.map((choice) => option(choice, choice.char === current, pick));
  const grid = document.createElement('ul');
  grid.className = 'emoji-picker';
  grid.append(...options.map(({ item }) => item));

  // With no current pick in the grid, the panel takes focus as usual.
  const selected = options.find(({ button }) => button.hasAttribute('aria-current'));
  sheet = openSheet({ title, content: grid, initialFocus: selected?.button });
  await sheet.closed;
  return chosen;
}

// A labelled emoji tile that opens the picker, for forms (DESIGN §10 custom food form).
// value: the starting character. Read the current one from `value`.
export function emojiField({ label = 'Emoji', value }) {
  let current = value;
  const id = uniqueId('field');

  const element = document.createElement('div');
  element.className = 'field emoji-field';

  const labelEl = document.createElement('label');
  labelEl.className = 'field__label';
  labelEl.htmlFor = id;
  labelEl.textContent = label;

  const tile = emojiTile(current);
  const button = document.createElement('button');
  button.type = 'button';
  button.id = id;
  button.className = 'emoji-button emoji-field__button';
  button.append(tile);

  // The tile is hidden from assistive tech, so the name carries the current emoji.
  function show() {
    tile.textContent = current;
    button.setAttribute('aria-label', `${label}, ${current}`);
  }

  button.addEventListener('click', async () => {
    const chosen = await emojiPickerSheet({ current });
    if (chosen) {
      current = chosen;
      show();
    }
  });
  show();

  element.append(labelEl, button);
  return {
    element,
    get value() {
      return current;
    },
  };
}
