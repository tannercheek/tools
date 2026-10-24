// A slot's sheets on Today (DESIGN §8): the slot actions sheet, what a planned slot changes for
// the day (SPEC §3.5), and the sheet of what's in a filled flex slot, which Other's reuses. Each
// lists what's been added to the slot, each with remove, or for a meal added with its
// ingredients, a way into them, and has a way to add to the slot.

import { parseAmount } from '../custom-foods.js';
import { OTHER } from '../data.js';
import { iconButton, primaryButton, secondaryButton } from '../ui/buttons.js';
import { segmentedControl } from '../ui/controls.js';
import { numberField } from '../ui/inputs.js';
import { listRow, rowActionIcon, rowList } from '../ui/row.js';
import { openSheet } from '../ui/sheet.js';

const PRESETS = [0.5, 1, 1.5];
const CUSTOM = 'custom';
const portionFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

// What's been added to the slot, as entry rows (DESIGN §8) without the eyebrow, since the sheet's
// title names the slot. A meal added with its ingredients is a row that opens them, through
// onOpen(entry), with its remove inside (SPEC §3.6). Anything else, a meal added before entries
// kept ingredients included, has a remove button, through onRemove(entry).
function entryList(entries, { onOpen, onRemove }) {
  return rowList(
    entries.map((entry) => {
      const row = { emoji: entry.emoji, title: entry.label, numbers: entry };
      if (entry.ingredients?.length > 0) {
        return listRow({ ...row, trailing: rowActionIcon('chevron-right', 'Edit ingredients'), onClick: () => onOpen(entry) });
      }
      const remove = iconButton('x', `Remove ${entry.label}`, { onClick: () => onRemove(entry) });
      return listRow({ ...row, trailing: remove });
    }),
  );
}

// entryList's handlers, picking { action, entry } through choose.
function entryActions(choose) {
  return {
    onOpen: (entry) => choose('entry-ingredients', entry),
    onRemove: (entry) => choose('remove', entry),
  };
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

// plan: the slot as slots.js's daySlots plans it, with a meal. Swap, Skip and Edit, which act on
// the planned meal, sit in one row at the top, short since the title names the slot (DESIGN §8).
// A slot swapped to a food or quick numbers is titled with that, and has no ingredients to edit
// and no portion (SPEC §3.5), so Edit is disabled and Portion doesn't show. Add to this slot, for
// the slot itself, follows Portion. Swap, Edit, Add, an added meal's row and an entry's remove close the sheet for the caller to open
// the next sheet. Skip and As planned apply and close straight away, since each undoes the other. A preset portion applies as it's picked, through onPortion(portion), and
// the sheet stays open, since arrow keys move through the presets one by one; Custom's "Set
// portion" applies and closes. Resolves to { action } for the caller to act on, action being
// 'swap', 'skip', 'ingredients', 'as-planned', 'add', or 'entry-ingredients' or 'remove' (with
// the entry), or null.
export async function slotActionsSheet({ plan, onPortion }) {
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
  // As planned only shows while there's a change to undo.
  function showActions() {
    skip.disabled = skipped;
    edit.disabled = skipped || Boolean(plan.swapEntry);
    asPlanned.hidden = !(plan.swapped || skipped || portion !== 1 || plan.edited);
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
  const portionControls = plan.swapEntry ? [] : [presets.element, custom.form];
  const entries = plan.entries.length > 0 ? [entryList(plan.entries, entryActions(choose))] : [];
  sheet = openSheet({
    title: `${plan.name} · ${plan.swapEntry?.label ?? plan.meal.name}`,
    content: [row, ...portionControls, add, ...entries, asPlanned],
  });
  await sheet.closed;
  return picked;
}

// The filled flex sheet: entries, each with remove, then one button to add more, labelled
// addLabel. Resolves like slotActionsSheet, to { action: 'add' }, { action: 'entry-ingredients'
// or 'remove', entry }, or null.
async function entriesSheet({ title, entries, addLabel }) {
  let picked = null;
  let sheet;
  const choose = (action, entry) => {
    picked = { action, entry };
    sheet.close();
  };

  const add = secondaryButton(addLabel, { block: true, onClick: () => choose('add') });
  sheet = openSheet({ title, content: [entryList(entries, entryActions(choose)), add] });
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
