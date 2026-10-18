// List rows (DESIGN §8): emoji tile → text stack → one trailing control.

import { icon } from '../icons.js';
import { iconButton } from './buttons.js';

const integer = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

const MACROS = [
  { key: 'protein', letter: 'P' },
  { key: 'fat', letter: 'F' },
  { key: 'carbs', letter: 'C' },
];

// Native emoji (SPEC §5.1); hidden from screen readers because the title names the item.
// Hidden from assistive tech: the row title beside it names the item.
export function emojiTile(emoji) {
  const tile = document.createElement('span');
  tile.className = 'emoji-tile';
  tile.setAttribute('aria-hidden', 'true');
  tile.textContent = emoji;
  return tile;
}

// Spans rather than paragraphs, since a row can be a button and a button can't hold a <p>.
function textLine(className, text) {
  const line = document.createElement('span');
  line.className = className;
  line.textContent = text;
  return line;
}

// kcal, then P / F / C, each letter after a dot in its macro colour. Rounded for display only.
// Also used outside rows, so a meal's totals read the same everywhere.
export function numbersLine({ kcal, protein, fat, carbs }) {
  const line = document.createElement('span');
  line.className = 'row__numbers';
  const kcalText = document.createElement('span');
  kcalText.className = 'row__kcal';
  kcalText.textContent = `${integer.format(kcal)} kcal`;
  line.append(kcalText);
  const values = { protein, fat, carbs };
  for (const { key, letter } of MACROS) {
    const macro = document.createElement('span');
    macro.className = 'row__macro';
    macro.innerHTML = `<span class="macro-dot macro-dot--${key}" aria-hidden="true"></span>`;
    macro.append(`${letter} ${integer.format(values[key])}`);
    line.append(macro);
  }
  return line;
}

// The trailing hint on a row that is one button or link: an icon showing what a tap does, plus
// that action as hidden text where the row's text alone doesn't say it. Not a control itself.
// A link's chevron needs no action text: a link already says it goes somewhere.
export function rowActionIcon(iconName, action) {
  const hint = document.createElement('span');
  hint.className = 'row__action-icon';
  hint.innerHTML = icon(iconName);
  if (action) hint.insertAdjacentHTML('beforeend', `<span class="visually-hidden">${action}</span>`);
  return hint;
}

// numbers: { kcal, protein, fat, carbs } or omitted. trailing: one control element or omitted.
// onClick or href: makes the whole row one button or link; its trailing can then only be a
// rowActionIcon.
export function listRow({ emoji, eyebrow, title, numbers, trailing, onClick, href }) {
  const row = document.createElement(href ? 'a' : onClick ? 'button' : 'li');
  row.className = 'row';

  const text = document.createElement('span');
  text.className = 'row__text';
  if (eyebrow) text.append(textLine('row__eyebrow', eyebrow));
  text.append(textLine('row__title', title));
  if (numbers) text.append(numbersLine(numbers));

  row.append(emojiTile(emoji), text);
  if (trailing) row.append(trailing);
  if (!onClick && !href) return row;

  if (href) row.href = href;
  else row.type = 'button';
  row.classList.add('row--button');
  if (onClick) row.addEventListener('click', onClick);
  const item = document.createElement('li');
  item.append(row);
  return item;
}

// Ingredient row (meal editor, DESIGN §8): a quantity field, then a remove button.
// quantity: a numberField with no label of its own; the food's name is its visible label, so
// tapping the name focuses it. setNumbers(numbers) shows new totals, e.g. while typing.
export function ingredientRow({ emoji, title, numbers, quantity, onRemove }) {
  const row = document.createElement('li');
  row.className = 'row row--ingredient';

  const text = document.createElement('div');
  text.className = 'row__text';
  const label = document.createElement('label');
  label.className = 'row__title';
  label.htmlFor = quantity.input.id;
  label.textContent = title;
  let line = numbersLine(numbers);
  text.append(label, line);

  // The field and remove button wrap under the name together when it needs the room. The
  // field's error message moves out to the row, so it can take a line of its own.
  const controls = document.createElement('div');
  controls.className = 'row__controls';
  controls.append(quantity.element, iconButton('x', `Remove ${title}`, { onClick: onRemove }));
  row.append(emojiTile(emoji), text, controls, quantity.error);
  return {
    element: row,
    setNumbers(next) {
      const nextLine = numbersLine(next);
      line.replaceWith(nextLine);
      line = nextLine;
    },
  };
}

export function rowList(rows) {
  const list = document.createElement('ul');
  list.className = 'row-list';
  list.append(...rows);
  return list;
}
