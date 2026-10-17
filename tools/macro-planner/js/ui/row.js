// List rows (DESIGN §8): emoji tile → text stack → one trailing control.

import { icon } from '../icons.js';

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

// kcal, then P / F / C, each letter after a dot in its macro colour.
function numbersLine({ kcal, protein, fat, carbs }) {
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

// The trailing hint on a row that is one button: an icon showing what a tap does, plus that
// action as hidden text, since the row's text alone doesn't say it. Not a control itself.
export function rowActionIcon(iconName, action) {
  const hint = document.createElement('span');
  hint.className = 'row__action-icon';
  hint.innerHTML = `${icon(iconName)}<span class="visually-hidden">${action}</span>`;
  return hint;
}

// numbers: { kcal, protein, fat, carbs } or omitted. trailing: one control element or omitted.
// onClick: makes the whole row one button; its trailing can then only be a rowActionIcon.
export function listRow({ emoji, eyebrow, title, numbers, trailing, onClick }) {
  const row = document.createElement(onClick ? 'button' : 'li');
  row.className = 'row';

  const text = document.createElement('span');
  text.className = 'row__text';
  if (eyebrow) text.append(textLine('row__eyebrow', eyebrow));
  text.append(textLine('row__title', title));
  if (numbers) text.append(numbersLine(numbers));

  row.append(emojiTile(emoji), text);
  if (trailing) row.append(trailing);
  if (!onClick) return row;

  row.type = 'button';
  row.classList.add('row--button');
  row.addEventListener('click', onClick);
  const item = document.createElement('li');
  item.append(row);
  return item;
}

export function rowList(rows) {
  const list = document.createElement('ul');
  list.className = 'row-list';
  list.append(...rows);
  return list;
}
