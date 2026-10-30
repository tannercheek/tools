// Category field (SPEC §3.2, DESIGN §10): a labelled field that opens a sheet listing the
// categories, with "None" first, for the custom food form.

import { CATEGORIES } from '../categories.js';
import { icon } from '../icons.js';
import { secondaryButton } from './buttons.js';
import { uniqueId } from './ids.js';
import { openSheet } from './sheet.js';

function option(value, text, current, onPick) {
  const button = secondaryButton('', { block: true, onClick: () => onPick(value) });
  button.classList.add('unit-option');
  const label = document.createElement('span');
  label.className = 'unit-option__label';
  label.textContent = text;
  button.append(label);
  if (value === current) {
    button.setAttribute('aria-current', 'true');
    button.insertAdjacentHTML('beforeend', icon('check'));
  }
  return button;
}

// current: the category picked so far, or null for None. Resolves to the picked category, or
// null for None picked outright; undefined if the sheet closes without a pick.
export async function categorySheet({ current }) {
  let picked;
  let sheet;
  const pick = (value) => {
    picked = value;
    sheet.close();
  };
  const buttons = [
    option(null, 'None', current, pick),
    ...CATEGORIES.map((category) => option(category, category, current, pick)),
  ];
  sheet = openSheet({ title: 'Category', content: buttons });
  await sheet.closed;
  return picked;
}

// A labelled field that opens categorySheet (DESIGN §10 custom food form). value: the starting
// category, or null (or undefined) for None. onChange hears each new pick, including back to
// null.
export function categoryField({ label = 'Category', value = null, onChange }) {
  let current = value ?? null;
  const id = uniqueId('field');

  const element = document.createElement('div');
  element.className = 'field';

  const labelEl = document.createElement('label');
  labelEl.className = 'field__label';
  labelEl.htmlFor = id;
  labelEl.textContent = label;

  const button = document.createElement('button');
  button.type = 'button';
  button.id = id;
  button.className = 'input-box category-field__button';
  const text = document.createElement('span');
  text.className = 'category-field__text';
  button.append(text);
  button.insertAdjacentHTML('beforeend', icon('chevron-down'));

  function show() {
    text.textContent = current ?? 'None';
    button.classList.toggle('category-field__button--empty', current === null);
  }
  show();

  button.addEventListener('click', async () => {
    const picked = await categorySheet({ current });
    if (picked === undefined || picked === current) return;
    current = picked;
    show();
    onChange?.(current);
  });

  element.append(labelEl, button);
  return {
    element,
    get value() {
      return current;
    },
  };
}
