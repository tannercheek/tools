// A slot's sheets on Today (DESIGN §8): the slot actions sheet, what a planned slot changes for
// the day (SPEC §3.5), and the sheet of what's in a filled flex slot, which Other's reuses. Each
// lists what's been added to the slot, each a row that opens a way to swap or remove it, and has
// a way to add to the slot. The slot actions sheet lists the slot's planned foods the same way.
// The item sheet, opened from any of those rows, is here too.

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

const PRESETS = [0.5, 1, 1.5];
const CUSTOM = 'custom';
const portionFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

// What's been added to the slot, as entry rows (DESIGN §8) without the eyebrow, since the sheet's
// title names the slot. Each is one row button with a chevron, picking { action, entry } through
// choose. A meal added with its ingredients opens them ('entry-ingredients'), with its swap and
// remove inside (SPEC §3.6). Anything else, a meal added before entries kept ingredients
// included, opens the item sheet ('entry').
function entryList(entries, choose) {
  return rowList(
    entries.map((entry) => {
      const withIngredients = entry.ingredients?.length > 0;
      return listRow({
        emoji: entry.emoji,
        title: entry.label,
        numbers: entry,
        trailing: rowActionIcon('chevron-right', withIngredients ? 'Edit ingredients' : 'Swap or remove'),
        onClick: () => choose(withIngredients ? 'entry-ingredients' : 'entry', entry),
      });
    }),
  );
}

// The item sheet (DESIGN §8): one added entry or planned food, titled with it, with Swap, then
// Remove from slot, or Remove for today for a planned food. Each closes the sheet for the caller
// to act on: open the swap sheet, ask with the confirm sheet, or remove a planned food for the
// day. Resolves to { action: 'swap' } or { action: 'remove' }, or null.
export async function itemSheet({ title, removeLabel = 'Remove from slot' }) {
  let picked = null;
  let sheet;
  const choose = (action) => {
    picked = { action };
    sheet.close();
  };

  const swap = secondaryButton('Swap', { block: true, onClick: () => choose('swap') });
  const remove = secondaryButton(removeLabel, { block: true, onClick: () => choose('remove') });
  sheet = openSheet({ title, content: [swap, remove] });
  await sheet.closed;
  return picked;
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

// The slot's planned foods for the day (SPEC §3.5), each at its amount, as Plan's slot sheet
// shows them, and a row button with a chevron like an added entry's, picking { action:
// 'planned-food', entry } with the food's ingredient as the entry. getFood: for the amount's
// weight, while the food is still there. None for a skipped slot, which eats none of them.
function plannedFoodList(foods, getFood, choose) {
  return rowList(
    foods.map((item) => {
      const food = getFood(item.foodId);
      return listRow({
        emoji: item.emoji,
        eyebrow: food ? amountLabel(food, item) : `${amountText(item.qty)} ${item.unit}`,
        title: item.name,
        numbers: item,
        trailing: rowActionIcon('chevron-right', 'Swap or remove for today'),
        onClick: () => choose('planned-food', item),
      });
    }),
  );
}

// What's been added to a planned slot, under "Added to this slot", then Add to this slot, as one
// group apart from the meal's controls (SPEC §3.6). With nothing added, only the button shows.
function addedGroup(entries, add, choose) {
  if (entries.length === 0) return add;
  const heading = document.createElement('h3');
  heading.className = 'field__label slot-actions__heading';
  heading.id = uniqueId('added-heading');
  heading.textContent = 'Added to this slot';
  const group = document.createElement('section');
  group.className = 'slot-actions__added';
  group.setAttribute('aria-labelledby', heading.id);
  group.append(heading, entryList(entries, choose), add);
  return group;
}

// plan: the slot as slots.js's daySlots plans it, a planned slot. Swap, Skip and Edit, which act
// on the planned meal, sit in one row at the top, short since the title names the slot (DESIGN
// §8). The title is the slot with its meal, or with its one planned food when it has no meal. A
// slot swapped to a food or quick numbers is titled with that, and has no ingredients to edit and
// no portion (SPEC §3.5), so Edit is disabled and Portion doesn't show. With no meal, Swap and
// Edit are disabled and Portion doesn't show either. The planned foods follow Portion, then
// what's been added and Add to this slot, for the slot itself, as one group. Swap, Edit, Add, a
// planned food's row and an added entry's row close the sheet for the caller to open the next
// sheet. Skip and As planned apply and close straight away, since each undoes the other. A preset
// portion applies as it's picked, through onPortion(portion), and the sheet stays open, since
// arrow keys move through the presets one by one; Custom's "Set portion" applies and closes.
// foodsChanged: whether the day has its own version of the planned foods, which As planned undoes.
// getFood: saved-meals.js's foodLookup, for the planned foods' amounts. Resolves to { action }
// for the caller to act on, action being 'swap', 'skip', 'ingredients', 'as-planned', 'add', or
// 'planned-food', 'entry-ingredients' or 'entry' (with the planned food or entry), or null.
export async function slotActionsSheet({ plan, foodsChanged, getFood, onPortion }) {
  let picked = null;
  let sheet;
  const choose = (action, entry) => {
    picked = { action, entry };
    sheet.close();
  };

  let { skipped, portion } = plan;
  const swap = secondaryButton('Swap', { block: true, onClick: () => choose('swap') });
  const skip = secondaryButton('Skip', { block: true, onClick: () => choose('skip') });
  const edit = secondaryButton('Edit', { block: true, onClick: () => choose('ingredients') });
  const row = document.createElement('div');
  row.className = 'slot-actions__row';
  row.append(swap, skip, edit);
  const add = secondaryButton('Add to this slot', { block: true, onClick: () => choose('add') });
  const asPlanned = secondaryButton('As planned', { block: true, onClick: () => choose('as-planned') });
  // Skip and Edit are disabled rather than hidden on a skipped slot, so the row keeps its three
  // places. A skipped slot eats none of its meal, so there are no ingredients to edit (SPEC §3.5).
  // With no meal, there's nothing to swap or edit. As planned only shows while there's a change to
  // undo.
  function showActions() {
    swap.disabled = !plan.meal;
    skip.disabled = skipped;
    edit.disabled = !plan.meal || skipped || Boolean(plan.swapEntry);
    asPlanned.hidden = !(plan.swapped || skipped || portion !== 1 || plan.edited || foodsChanged);
  }

  function setPortion(next) {
    skipped = false;
    portion = next;
    onPortion(next);
    showActions();
  }

  const isPreset = PRESETS.includes(portion);
  const custom = customPortionForm({
    portion: skipped || isPreset ? null : portion,
    onSet: (next) => {
      setPortion(next);
      sheet.close();
    },
  });
  // A skipped slot shows no portion, so any pick, even 1×, takes the skip back.
  const presets = segmentedControl({
    label: 'Portion',
    showLabel: true,
    options: [
      ...PRESETS.map((value) => ({ value: String(value), label: `${portionFormat.format(value)}×` })),
      { value: CUSTOM, label: 'Custom' },
    ],
    value: skipped ? null : isPreset ? String(portion) : CUSTOM,
    onChange: (value) => {
      custom.form.hidden = value !== CUSTOM;
      if (value === CUSTOM) custom.input.focus();
      else setPortion(Number(value));
    },
  });

  showActions();
  const portionControls = plan.meal && !plan.swapEntry ? [presets.element, custom.form] : [];
  const plannedFoods = plan.foods.length > 0 ? [plannedFoodList(plan.foods, getFood, choose)] : [];
  // A slot with several planned foods and no meal has no one thing to name.
  const holds = plan.swapEntry?.label ?? plan.meal?.name ?? (plan.foods.length === 1 ? plan.foods[0].name : null);
  sheet = openSheet({
    title: holds ? `${plan.name} · ${holds}` : plan.name,
    content: [row, ...portionControls, ...plannedFoods, addedGroup(plan.entries, add, choose), asPlanned],
  });
  await sheet.closed;
  return picked;
}

// The filled flex sheet: entries, each a row to open, then one button to add more, labelled
// addLabel. Resolves like slotActionsSheet, to { action: 'add' }, { action: 'entry-ingredients'
// or 'entry', entry }, or null.
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
// slot as slots.js's daySlots plans it, with entries.
export function filledFlexSheet({ plan }) {
  return entriesSheet({ title: `${plan.name} · Flex`, entries: plan.entries, addLabel: 'Add to this slot' });
}

// Other (SPEC §3.6, DESIGN §8): the filled flex sheet for what's eaten outside the slots, titled
// "Other" and ending in Add to Other. entries: slots.js's otherEntries.
export function otherSheet({ entries }) {
  return entriesSheet({ title: OTHER.name, entries, addLabel: `Add to ${OTHER.name}` });
}
