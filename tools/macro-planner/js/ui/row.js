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

// A placeholder row's tile: dashed, holding a UI outline icon rather than an emoji.
function iconTile(iconName) {
  const tile = document.createElement('span');
  tile.className = 'emoji-tile emoji-tile--placeholder';
  tile.setAttribute('aria-hidden', 'true');
  tile.innerHTML = icon(iconName);
  return tile;
}

// Plain lines under a row's numbers (DESIGN §8): a line each of emoji, label and kcal, like the
// things a slot holds, or with an amount in place of kcal, like an edited meal's ingredients.
// items: [{ emoji, label, kcal, ingredients }] or [{ emoji, label, amount }], amount as text
// ("3 egg"). ingredients, if any: lines of the second kind, indented under that line's label,
// like an edited meal that's one of a slot's items.
function extrasLines(items) {
  const lines = document.createElement('span');
  lines.className = 'row__extras';
  for (const { emoji, label, kcal, amount, ingredients = [] } of items) {
    const line = document.createElement('span');
    line.className = 'row__extra';
    const emojiText = textLine('row__extra-emoji', emoji);
    emojiText.setAttribute('aria-hidden', 'true');
    // The label and what ends the line go together, so lines under it can share their column.
    const main = document.createElement('span');
    main.className = 'row__extra-main';
    const end = amount === undefined ? textLine('row__extra-kcal', `${integer.format(kcal)} kcal`) : textLine('row__extra-amount', amount);
    main.append(textLine('row__extra-label', label), end);
    line.append(emojiText, main);
    if (ingredients.length > 0) {
      const nested = extrasLines(ingredients);
      nested.classList.add('row__extras--nested');
      line.append(nested);
    }
    lines.append(line);
  }
  return lines;
}

// numbers: { kcal, protein, fat, carbs }, a word in their place (a skipped slot's "Skipped"), or
// omitted. lines: listed under the numbers, as extrasLines takes them, or omitted: the things a
// slot holds, or an edited meal's ingredients. trailing: one control element or omitted. onClick
// or href: makes the whole row one button or link; its trailing can then only be a rowActionIcon.
// placeholderIcon, in place of emoji: the dashed placeholder row with that icon in its tile, like
// Plan's empty slot. With neither, the row has no tile, like a weigh-in, since emoji only
// identify foods and meals. muted: the title and numbers in secondary text, like a skipped slot
// (DESIGN §8). With lines under the numbers, the tile sits at the top of the row.
export function listRow({ emoji, placeholderIcon, eyebrow, title, numbers, lines = [], trailing, onClick, href, muted = false }) {
  const row = document.createElement(href ? 'a' : onClick ? 'button' : 'li');
  row.className = placeholderIcon ? 'row row--placeholder' : 'row';
  if (muted) row.classList.add('row--muted');

  const text = document.createElement('span');
  text.className = 'row__text';
  if (eyebrow) text.append(textLine('row__eyebrow', eyebrow));
  text.append(textLine('row__title', title));
  if (typeof numbers === 'string') text.append(textLine('row__numbers', numbers));
  else if (numbers) text.append(numbersLine(numbers));
  if (lines.length > 0) {
    text.append(extrasLines(lines));
    row.classList.add('row--lines');
  }

  if (placeholderIcon) row.append(iconTile(placeholderIcon));
  else if (emoji) row.append(emojiTile(emoji));
  row.append(text);
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

// Ingredient row (DESIGN §8): a quantity field, then one trailing control: the meal editor's
// remove button, or the Ingredients sheet's swap button. quantity: a numberField with no label of
// its own; the food's name is its visible label, so tapping the name focuses it.
// setNumbers(numbers) shows new totals, e.g. while typing.
export function ingredientRow({ emoji, title, numbers, quantity, trailing }) {
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

  // The field sits under the name, with the trailing control at the end of the row. The field's
  // error message moves out under the field, so the field's wrapper adds no layout of its own.
  const body = document.createElement('div');
  body.className = 'row__body';
  body.append(text, quantity.element, quantity.error);
  row.append(emojiTile(emoji), body, trailing);
  return {
    element: row,
    setNumbers(next) {
      const nextLine = numbersLine(next);
      line.replaceWith(nextLine);
      line = nextLine;
    },
  };
}

// The tile's hop when something is added to the row's slot (DESIGN §14). Its duration is a
// token, which reduced motion collapses, so it needs no check of its own.
export function hopTile(row) {
  const tile = row.querySelector('.emoji-tile');
  tile.classList.remove('emoji-tile--hop');
  // Reading layout restarts the animation if it's still running from the last add.
  void tile.offsetWidth;
  tile.classList.add('emoji-tile--hop');
  tile.addEventListener('animationend', () => tile.classList.remove('emoji-tile--hop'), { once: true });
}

// A line about the list under it, like Today's off-plan line (DESIGN §8): sunken, with no tile,
// one sentence, then one trailing control.
export function noticeRow({ text, trailing }) {
  const row = document.createElement('div');
  row.className = 'row row--notice';
  row.append(textLine('row__notice', text), trailing);
  return row;
}

export function rowList(rows) {
  const list = document.createElement('ul');
  list.className = 'row-list';
  list.append(...rows);
  return list;
}
