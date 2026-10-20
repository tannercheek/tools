// The Meal slots section of Settings (SPEC §3.4, §3.8): 3 to 6 slots, named and ordered. Each
// slot's name saves once its field is left; moving, removing and adding save straight away.
// What each slot plans is set on Plan.

import { CoreDocUnavailableError, updateCoreDoc } from '../data.js';
import { MAX_SLOTS, MIN_SLOTS, addSlot, createSlot, moveSlot, removeSlot, renameSlot } from '../slots.js';
import { iconButton, secondaryButton } from '../ui/buttons.js';
import { formError, textField } from '../ui/inputs.js';
import { confirmSheet } from '../ui/sheet.js';
import { newSlotSheet } from './new-slot-sheet.js';

// doc: the loaded core doc, or {} when this device has never loaded it and storage can't be
// reached; saving then says why it can't. Returns the section's elements.
export function slotsSection({ store, doc: loaded }) {
  let doc = loaded;
  const slots = () => doc.slots ?? [];

  const error = formError();
  let writes = Promise.resolve();

  // One write at a time, in order. A failure says so on the screen.
  function save(change) {
    writes = writes.then(async () => {
      error.show(null);
      try {
        await updateCoreDoc(store, change);
      } catch (err) {
        console.error('[macro-planner] saving meal slots failed:', err);
        error.show(err instanceof CoreDocUnavailableError ? err.message : 'That didn’t save. Try again.');
        error.element.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  // Shown straight away, then the same change is made to the stored doc.
  function edit(change) {
    doc = change(doc);
    save(change);
  }

  const note = document.createElement('p');
  note.className = 'settings__note';
  note.textContent = `Between ${MIN_SLOTS} and ${MAX_SLOTS}. Every day follows them in this order.`;
  const list = document.createElement('ul');
  list.className = 'slot-list';
  const add = secondaryButton('Add slot', { block: true, onClick: addNew });
  // By slot id, so focus can follow a slot after the list is rebuilt.
  let editors = new Map();

  // A slot's name field, with move up, move down and remove on the same line as the box.
  function slotEditor(slot, index) {
    const count = slots().length;
    const field = textField({ label: `Slot ${index + 1}`, value: slot.name });
    const up = iconButton('arrow-up', '', { disabled: index === 0, onClick: () => move(slot.id, -1) });
    const down = iconButton('arrow-down', '', { disabled: index === count - 1, onClick: () => move(slot.id, 1) });
    const remove = iconButton('trash-2', '', { disabled: count <= MIN_SLOTS, onClick: () => confirmRemove(slot.id) });

    function label(name) {
      up.setAttribute('aria-label', `Move ${name} up`);
      down.setAttribute('aria-label', `Move ${name} down`);
      remove.setAttribute('aria-label', `Remove ${name}`);
    }
    label(slot.name);

    // A blank name isn't saved: the field says so, and the saved name stays.
    field.input.addEventListener('input', () => field.setError(null));
    field.input.addEventListener('change', () => {
      const text = field.input.value.trim();
      if (!text) {
        field.setError('Enter a name');
        return;
      }
      field.input.value = text;
      if (text === slots().find(({ id }) => id === slot.id)?.name) return;
      edit((d) => renameSlot(d, slot.id, text));
      label(text);
    });

    const controls = document.createElement('div');
    controls.className = 'slot-editor__controls';
    controls.append(up, down, remove);
    field.element.append(controls);

    const element = document.createElement('li');
    element.className = 'slot-editor';
    element.append(field.element);
    editors.set(slot.id, { up, down, remove });
    return element;
  }

  function show() {
    editors = new Map();
    list.replaceChildren(...slots().map(slotEditor));
    add.disabled = slots().length >= MAX_SLOTS;
  }

  // Focus stays on the arrow that moved the slot, or the other one once it reaches an end.
  function move(slotId, offset) {
    edit((d) => moveSlot(d, slotId, offset));
    show();
    const { up, down } = editors.get(slotId);
    const pressed = offset < 0 ? up : down;
    (pressed.disabled ? (offset < 0 ? down : up) : pressed).focus();
  }

  async function confirmRemove(slotId) {
    const { name } = slots().find(({ id }) => id === slotId);
    const confirmed = await confirmSheet({
      title: `Remove “${name}”?`,
      message: 'It comes out of your daily plan, with whatever is planned in it. Past days aren’t changed.',
      confirmLabel: 'Remove slot',
    });
    if (!confirmed) return;
    edit((d) => removeSlot(d, slotId));
    show();
    add.focus();
  }

  // Focus comes back to "Add slot", or with the slots now full, to the new slot's remove button.
  async function addNew() {
    const name = await newSlotSheet();
    if (!name) return;
    const slot = createSlot(name);
    edit((d) => addSlot(d, slot));
    show();
    (add.disabled ? editors.get(slot.id).remove : add).focus();
  }

  show();
  return [note, list, add, error.element];
}
