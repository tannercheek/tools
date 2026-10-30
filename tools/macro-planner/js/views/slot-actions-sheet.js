// A slot's sheets on Today (DESIGN §8): the slot actions sheet, what a planned slot changes for
// the day (SPEC §3.5, §3.6), and the sheet of what's in a filled flex slot, which Other's reuses.
// Each lists what's been added to the slot, each a row that opens its item sheet, and has a way to
// add to the slot. With several planned items, the slot actions sheet lists them the same way,
// each opening its own actions. The item sheets, opened from those rows, are here too.

import { parseAmount } from '../custom-foods.js';
import { OTHER } from '../data.js';
import { amountText } from '../ingredients.js';
import { amountLabel } from '../portions.js';
import { primaryButton, secondaryButton } from '../ui/buttons.js';
import { segmentedControl } from '../ui/controls.js';
import { uniqueId } from '../ui/ids.js';
import { numberField } from '../ui/inputs.js';
import { listRow, rowActionIcon, rowList } from '../ui/row.js';
import { openSheet } from '../ui/sheet.js';
import { itemMarks } from './today-rows.js';

const PRESETS = [0.5, 1, 1.5];
const CUSTOM = 'custom';
const portionFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

// What's been added to the slot, as entry rows (DESIGN §8) without the eyebrow, since the sheet's
// title names the slot. Each is one row button with a chevron that opens its item sheet, picking
// { action: 'entry', entry } through choose (SPEC §3.6).
function entryList(entries, choose) {
  return rowList(
    entries.map((entry) =>
      listRow({
        emoji: entry.emoji,
        title: entry.label,
        numbers: entry,
        trailing: rowActionIcon('chevron-right', entryHint(entry)),
        onClick: () => choose('entry', entry),
      }),
    ),
  );
}

// Custom: a portion that isn't a preset, like 2× or 0.75×. Shown while Custom is picked.
function customPortionForm({ portion, onSet }) {
  const amount = numberField({ label: 'Custom portion', unit: '×', value: portion ? String(portion) : '' });
  amount.input.addEventListener('input', () => amount.setError(null));

  const form = document.createElement('form');
  form.className = 'slot-actions__custom';
  form.noValidate = true;
  form.hidden = !portion;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = parseAmount(amount.input.value);
    if (!value) {
      amount.setError('Enter a portion above 0');
      amount.input.focus();
      return;
    }
    onSet(value);
  });

  const set = primaryButton('Set portion', { block: true });
  set.type = 'submit';
  form.append(amount.element, set);
  return { form, input: amount.input };
}

// Portion (SPEC §3.5) for a meal or a food in the slot: 0.5×, 1×, 1.5× or Custom. portion: the
// item's now, or null on a skipped slot, which shows none, so any pick, even 1×, takes the skip
// back. A preset
// applies as it's picked, through onPick(portion), and the sheet stays open, since arrow keys move
// through the presets one by one. Custom's "Set portion" applies through onPick, then onSet()
// closes the sheet. Returns the control and Custom's form, to lay out in order.
function portionControls({ portion, onPick, onSet }) {
  const isPreset = PRESETS.includes(portion);
  const custom = customPortionForm({
    portion: portion === null || isPreset ? null : portion,
    onSet: (next) => {
      onPick(next);
      onSet();
    },
  });
  const presets = segmentedControl({
    label: 'Portion',
    showLabel: true,
    options: [
      ...PRESETS.map((value) => ({ value: String(value), label: `${portionFormat.format(value)}×` })),
      { value: CUSTOM, label: 'Custom' },
    ],
    value: portion === null ? null : isPreset ? String(portion) : CUSTOM,
    onChange: (value) => {
      custom.form.hidden = value !== CUSTOM;
      if (value === CUSTOM) custom.input.focus();
      else onPick(Number(value));
    },
  });
  return [presets.element, custom.form];
}

const isMeal = (item) => item.source === 'meal';
// A meal or a food takes a portion; quick numbers don't (SPEC §3.5).
const hasPortion = (item) => item.source === 'meal' || item.source === 'food';
// Only a meal added with its ingredients can be edited: one added before entries kept them has
// none, and a food has no ingredients to edit.
const hasIngredients = (entry) => entry.ingredients?.length > 0;
// An added entry takes a portion when it's a meal with ingredients, kept at its portion, or a food.
const entryHasPortion = (entry) => hasIngredients(entry) || entry.source === 'food';

// The chevron's hidden text for a planned item's row, naming what its item sheet offers.
function itemHint(item) {
  if (isMeal(item)) return 'Swap, portion, edit or remove for today';
  if (item.source === 'food') return 'Swap, portion or remove for today';
  return 'Swap or remove for today';
}

// The chevron's hidden text for an added entry's row, naming what its item sheet offers.
function entryHint(entry) {
  if (hasIngredients(entry)) return 'Swap, portion, edit or remove';
  if (entry.source === 'food') return 'Swap, portion or remove';
  return 'Swap or remove';
}

// The slot's planned items for the day (SPEC §3.6), when it plans several: each a row button with
// a chevron, like an added entry's, picking { action: 'item', item }. The eyebrow carries the
// item's changes, then a food's amount ("SWAPPED · 1 MEDIUM · 120 G"), as Plan's slot sheet shows
// it. getFood: for the amount's weight, while the food is still there.
function plannedItemList(items, getFood, choose) {
  return rowList(
    items.map((item) => {
      const marks = itemMarks(item);
      if (item.source === 'food') {
        const food = getFood(item.foodId);
        marks.push(food ? amountLabel(food, item) : `${amountText(item.qty)} ${item.unit}`);
      }
      return listRow({
        emoji: item.emoji,
        eyebrow: marks.join(' · ') || undefined,
        title: item.label,
        numbers: item,
        trailing: rowActionIcon('chevron-right', itemHint(item)),
        onClick: () => choose('item', { item }),
      });
    }),
  );
}

// What's been added to a planned slot, under "Added to this slot", then Add to this slot, as one
// group apart from the planned items' controls (SPEC §3.6). With nothing added, only the button
// shows.
function addedGroup(entries, add, choose) {
  if (entries.length === 0) return add;
  const heading = document.createElement('h3');
  heading.className = 'field__label slot-actions__heading';
  heading.id = uniqueId('added-heading');
  heading.textContent = 'Added to this slot';
  const group = document.createElement('section');
  group.className = 'slot-actions__added';
  group.setAttribute('aria-labelledby', heading.id);
  group.append(heading, entryList(entries, (action, entry) => choose(action, { entry })), add);
  return group;
}

// A planned slot's actions (SPEC §3.6, DESIGN §8). slot: one of day-plan.js's dayPlan, a planned
// slot. planned: day-plan.js's plannedDayItems, what the template plans there, which a skipped
// slot shows, since it eats none of its items.
// - Planning one item: Swap, Skip and Edit in one row, short since the title names the slot and
//   item, then Portion for a meal or a food. Edit is disabled for a food or quick numbers, which
//   have no ingredients, and on a skipped slot, which eats none of them; Portion doesn't show for
//   quick numbers.
// - Planning several: Skip, then a row per item, each opening its own actions. A skipped slot
//   lists none.
// Then what's been added and Add to this slot, as one group, and As planned while the slot has a
// change. A button that doesn't apply is disabled rather than hidden. Skip and As planned apply
// and close straight away, since each undoes the other; the rest close the sheet for the caller
// to open the next. A preset portion applies through onPortion(itemId, portion), which returns
// the slot as it is now, so the sheet follows it. getFood: saved-meals.js's foodLookup, for a
// food's amount. Resolves to { action, item, entry } for the caller to act on, action being
// 'swap', 'ingredients' or 'item' (with item), 'skip', 'as-planned', 'add', or 'entry' (with
// entry), or to null.
export async function slotActionsSheet({ slot, planned, getFood, onPortion }) {
  let picked = null;
  let sheet;
  const choose = (action, detail) => {
    picked = { action, ...detail };
    sheet.close();
  };

  let now = slot;
  const items = slot.skipped ? planned : slot.items;
  const [one] = items.length === 1 ? items : [];
  const skip = secondaryButton('Skip', { block: true, onClick: () => choose('skip') });
  const add = secondaryButton('Add to this slot', { block: true, onClick: () => choose('add') });
  const asPlanned = secondaryButton('As planned', { block: true, onClick: () => choose('as-planned') });
  function showActions() {
    skip.disabled = now.skipped;
    asPlanned.hidden = !(now.skipped || now.ownVersion);
  }

  let controls;
  if (one) {
    const swap = secondaryButton('Swap', { block: true, onClick: () => choose('swap', { item: one }) });
    const edit = secondaryButton('Edit', { block: true, onClick: () => choose('ingredients', { item: one }) });
    edit.disabled = !isMeal(one) || slot.skipped;
    const row = document.createElement('div');
    row.className = 'slot-actions__row';
    row.append(swap, skip, edit);
    const portion = hasPortion(one)
      ? portionControls({
          portion: slot.skipped ? null : (one.portion ?? 1),
          onPick: (next) => {
            now = onPortion(one.id, next) ?? now;
            edit.disabled = !isMeal(one);
            showActions();
          },
          onSet: () => sheet.close(),
        })
      : [];
    controls = [row, ...portion];
  } else {
    controls = [skip, ...(slot.skipped ? [] : [plannedItemList(items, getFood, choose)])];
  }

  showActions();
  sheet = openSheet({
    title: one ? `${slot.name} · ${one.label}` : slot.name,
    content: [...controls, addedGroup(slot.entries, add, choose), asPlanned],
  });
  await sheet.closed;
  return picked;
}

// The item sheet (SPEC §3.6, DESIGN §8), titled with what it acts on: Swap, then Portion for a
// meal or a food, then Edit ingredients for a meal with ingredients, then remove, labelled
// removeLabel. portion: the item's now, or undefined for quick numbers, which shows only Swap and
// remove. A preset portion applies through onPortion(portion), and the sheet stays open; Custom's
// applies and closes. The rest close it for the caller to act on. Resolves to { action: 'swap' },
// { action: 'ingredients' } or { action: 'remove' }, or null.
async function itemSheet({ title, portion, onPortion, editIngredients, removeLabel }) {
  let picked = null;
  let sheet;
  const choose = (action) => {
    picked = { action };
    sheet.close();
  };

  const swap = secondaryButton('Swap', { block: true, onClick: () => choose('swap') });
  const remove = secondaryButton(removeLabel, { block: true, onClick: () => choose('remove') });
  const portionControlsEl = portion === undefined ? [] : portionControls({ portion, onPick: onPortion, onSet: () => sheet.close() });
  const editButton = editIngredients ? [secondaryButton('Edit ingredients', { block: true, onClick: () => choose('ingredients') })] : [];
  sheet = openSheet({ title, content: [swap, ...portionControlsEl, ...editButton, remove] });
  await sheet.closed;
  return picked;
}

// A small Portion sheet on its own (SPEC §3.4, PLAN 14.25), for Plan's slot sheet, which sets a
// planned item's portion in the template rather than the day's. title: the item's name. portion:
// its now, always 1 or more, since a template item is never skipped. A preset or Custom's "Set
// portion" both apply through onPortion(portion) and close the sheet straight away.
export async function portionSheet({ title, portion, onPortion }) {
  let sheet;
  const controls = portionControls({
    portion,
    onPick: (next) => {
      onPortion(next);
      sheet.close();
    },
    onSet: () => sheet.close(),
  });
  sheet = openSheet({ title, content: controls });
  await sheet.closed;
}

// A planned item's own actions, in a slot planning several, titled with the item. Remove for
// today doesn't ask first, since As planned undoes it. item: one of the slot's day items.
export function plannedItemSheet({ item, onPortion }) {
  const portion = hasPortion(item) ? (item.portion ?? 1) : undefined;
  return itemSheet({ title: item.label, portion, onPortion, editIngredients: isMeal(item), removeLabel: 'Remove for today' });
}

// Something added to a slot or to Other, titled with it (SPEC §3.5): a meal with its ingredients
// at its portion, or 1× before it's had one, as a planned meal; a food at its portion; anything
// else, Swap and Remove from slot. Remove from slot is for the caller to ask about first, since
// nothing brings it back.
export function entrySheet({ entry, onPortion }) {
  const portion = entryHasPortion(entry) ? (entry.portion ?? 1) : undefined;
  return itemSheet({ title: entry.label, portion, onPortion, editIngredients: hasIngredients(entry), removeLabel: 'Remove from slot' });
}

// The filled flex sheet: entries, each a row to open, then one button to add more, labelled
// addLabel. Resolves like slotActionsSheet, to { action: 'add' }, { action: 'entry', entry }, or
// null.
async function entriesSheet({ title, entries, addLabel }) {
  let picked = null;
  let sheet;
  const choose = (action, entry) => {
    picked = { action, entry };
    sheet.close();
  };

  const add = secondaryButton(addLabel, { block: true, onClick: () => choose('add') });
  sheet = openSheet({ title, content: [entryList(entries, choose), add] });
  await sheet.closed;
  return picked;
}

// A flex slot with something in it (SPEC §3.4): what's in it, then Add to this slot. plan: the
// slot as day-plan.js's dayPlan plans it, with entries.
export function filledFlexSheet({ plan }) {
  return entriesSheet({ title: `${plan.name} · Flex`, entries: plan.entries, addLabel: 'Add to this slot' });
}

// Other (SPEC §3.6, DESIGN §8): the filled flex sheet for what's eaten outside the slots, titled
// "Other" and ending in Add to Other. entries: slots.js's otherEntries.
export function otherSheet({ entries }) {
  return entriesSheet({ title: OTHER.name, entries, addLabel: `Add to ${OTHER.name}` });
}
