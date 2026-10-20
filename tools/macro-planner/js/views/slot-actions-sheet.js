// A slot's sheets on Today (DESIGN §8): the slot actions sheet, what a planned slot changes for
// the day (SPEC §3.5), and the sheet of what's in a filled flex slot. Each lists what's been
// added to the slot, each with remove, and has Add to this slot.

import { parseAmount } from '../custom-foods.js';
import { iconButton, primaryButton, secondaryButton } from '../ui/buttons.js';
import { segmentedControl } from '../ui/controls.js';
import { numberField } from '../ui/inputs.js';
import { listRow, rowList } from '../ui/row.js';
import { openSheet } from '../ui/sheet.js';

const PRESETS = [0.5, 1, 1.5];
const CUSTOM = 'custom';
const portionFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

// What's been added to the slot, as entry rows (DESIGN §8) without the eyebrow, since the sheet's
// title names the slot. onRemove(entry) runs on an entry's remove button.
function entryList(entries, onRemove) {
  return rowList(
    entries.map((entry) => {
      const remove = iconButton('x', `Remove ${entry.label}`, { onClick: () => onRemove(entry) });
      return listRow({ emoji: entry.emoji, title: entry.label, numbers: entry, trailing: remove });
    }),
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

// plan: the slot as slots.js's daySlots plans it, with a meal. canSwap: whether there's another
// saved meal to swap to. Swap, Add to this slot and an entry's remove close the sheet for the
// caller to open the next sheet. Skip and As planned apply and close straight away, since each
// undoes the other (DESIGN §8). A preset portion applies as it's picked, through
// onPortion(portion), and the sheet stays open, since arrow keys move through the presets one by
// one; Custom's "Set portion" applies and closes. Resolves to { action } for the caller to act
// on, action being 'swap', 'skip', 'as-planned', 'add' or 'remove' (with the entry), or null.
export async function slotActionsSheet({ plan, canSwap, onPortion }) {
  let picked = null;
  let sheet;
  const choose = (action, entry) => {
    picked = { action, entry };
    sheet.close();
  };

  let { skipped, portion } = plan;
  const swap = secondaryButton('Swap', { block: true, onClick: () => choose('swap') });
  swap.hidden = !canSwap;
  const skip = secondaryButton('Skip', { block: true, onClick: () => choose('skip') });
  const add = secondaryButton('Add to this slot', { block: true, onClick: () => choose('add') });
  const asPlanned = secondaryButton('As planned', { block: true, onClick: () => choose('as-planned') });
  // Skip only while there's something to skip; As planned only while there's a change to undo.
  function showActions() {
    skip.hidden = skipped;
    asPlanned.hidden = !(plan.swapped || skipped || portion !== 1);
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
  const entries = plan.entries.length > 0 ? [entryList(plan.entries, (entry) => choose('remove', entry))] : [];
  sheet = openSheet({
    title: `${plan.name} · ${plan.meal.name}`,
    content: [swap, skip, presets.element, custom.form, ...entries, add, asPlanned],
  });
  await sheet.closed;
  return picked;
}

// A flex slot with something in it (SPEC §3.4): what's in it, each with remove, then Add to this
// slot. plan: the slot as slots.js's daySlots plans it, with entries. Resolves like
// slotActionsSheet, to { action: 'add' } or { action: 'remove', entry }, or null.
export async function filledFlexSheet({ plan }) {
  let picked = null;
  let sheet;
  const choose = (action, entry) => {
    picked = { action, entry };
    sheet.close();
  };

  const add = secondaryButton('Add to this slot', { block: true, onClick: () => choose('add') });
  sheet = openSheet({
    title: `${plan.name} · Flex`,
    content: [entryList(plan.entries, (entry) => choose('remove', entry)), add],
  });
  await sheet.closed;
  return picked;
}
