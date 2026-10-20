// The weight log on Stats (SPEC §3.1, §3.7): the trend and "Log weigh-in", or the empty state with
// fewer than two weigh-ins in the last 12 weeks, then those weigh-ins, newest first, each with delete. Weigh-ins are only ever deleted by the user, so delete asks first, and so does
// logging one for a date that already has one, since that replaces it (CLAUDE.md, storage).

import { WeightLogUnavailableError, listedWeighIns, localDate, readWeighInDate } from '../data.js';
import { readWeight, weightText } from '../profile.js';
import { iconButton, primaryButton } from '../ui/buttons.js';
import { emptyState } from '../ui/empty-state.js';
import { dateField, formError, numberField } from '../ui/inputs.js';
import { listRow, rowList } from '../ui/row.js';
import { confirmSheet, openSheet } from '../ui/sheet.js';
import { weightTrend } from './weight-trend.js';

const WEIGHT_UNIT = { metric: 'kg', imperial: 'lb' };

function dateFormats(options) {
  return {
    thisYear: new Intl.DateTimeFormat(undefined, options),
    otherYear: new Intl.DateTimeFormat(undefined, { ...options, year: 'numeric' }),
  };
}
const shortDates = dateFormats({ weekday: 'short', month: 'short', day: 'numeric' });
const spokenDates = dateFormats({ month: 'long', day: 'numeric' });

// "Tue, Oct 14". The log keeps every weigh-in, so one from another year shows its year too.
function formatDate(formats, date, today) {
  const format = date.slice(0, 4) === today.slice(0, 4) ? formats.thisYear : formats.otherYear;
  return format.format(new Date(`${date}T00:00`));
}

// "82.4 kg": one decimal, in the profile's units (SPEC §5.2).
function weightLabel(kg, units) {
  return `${weightText(kg, units)} ${WEIGHT_UNIT[units]}`;
}

function saveFailed(err) {
  return err instanceof WeightLogUnavailableError ? err.message : 'That didn’t save. Try again.';
}

// A weight and its date, which starts on today and can be set to an earlier day (SPEC §3.1).
// weighIns: the log, oldest first, to spot a date that already has one. Resolves to the log,
// oldest first, once the weigh-in is saved, or null if the sheet closes without one.
async function logWeighInSheet({ weightLog, weighIns, units }) {
  const today = localDate(new Date());
  let saved = null;
  let saving = false;
  let sheet;

  const weight = numberField({ label: 'Weight', unit: WEIGHT_UNIT[units] });
  const date = dateField({ label: 'Date', value: today, max: today });
  // Errors show on submit and clear as soon as the field changes.
  for (const field of [weight, date]) field.input.addEventListener('input', () => field.setError(null));
  const error = formError();

  // A date has one weigh-in, so another for it replaces the one logged (SPEC §3.1).
  async function save(weighIn) {
    const existing = weighIns.find((w) => w.date === weighIn.date);
    if (existing) {
      const replace = await confirmSheet({
        title: `Replace ${weightLabel(existing.kg, units)} from ${formatDate(shortDates, existing.date, today)}?`,
        message: `A day has one weigh-in, so ${weightLabel(weighIn.kg, units)} takes its place.`,
        confirmLabel: 'Replace weigh-in',
      });
      if (!replace) return;
    }
    error.show(null);
    try {
      saved = await weightLog.add(weighIn);
      sheet.close();
    } catch (err) {
      console.error('[macro-planner] saving a weigh-in failed:', err);
      error.show(saveFailed(err));
    }
  }

  const form = document.createElement('form');
  form.className = 'weigh-in-form';
  form.noValidate = true;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (saving) return;
    const kg = readWeight(weight.input.value, units);
    const day = readWeighInDate(date.input.value, today);
    weight.setError(kg === null ? `Enter your weight, like ${units === 'imperial' ? '180' : '82.5'}` : null);
    date.setError(day === null ? 'Pick today or an earlier day' : null);
    if (kg === null || day === null) {
      (kg === null ? weight : date).input.focus();
      return;
    }
    saving = true;
    await save({ date: day, kg });
    saving = false;
  });

  const log = primaryButton('Log weigh-in', { block: true });
  log.type = 'submit';
  form.append(weight.element, date.element, error.element, log);

  sheet = openSheet({ title: 'Log weigh-in', content: form, initialFocus: weight.input });
  await sheet.closed;
  return saved;
}

// weighIns: the log, oldest first. units: the profile's 'metric' or 'imperial'. profile: the core
// doc's, for the goal pace. onChange(weighIns) runs after a weigh-in is logged or deleted, with the
// log, oldest first, since the latest one is the profile's weight and so moves the targets.
// Returns the section's elements: the trend, "Log weigh-in", the list, and where a failed delete
// says so.
export function weighInsSection({ weightLog, weighIns: loaded, units, profile, onChange = () => {} }) {
  let weighIns = loaded;
  const error = formError();
  const trend = document.createElement('div');
  const logButton = primaryButton('Log weigh-in', { block: true, onClick: logNew });
  // "Log weigh-in", or the empty state's button while it stands in for the chart and this button.
  let logTarget = logButton;
  const list = rowList([]);
  list.classList.add('weigh-ins');
  // In list order, so focus can go back to the same place after a delete rebuilds the list.
  let deleteButtons = [];

  // What deleting it changes, since the latest weigh-in is the profile's weight (SPEC §3.1).
  function deleteMessage(weighIn) {
    if (weighIn !== weighIns.at(-1)) return 'It comes out of your weight log. This can’t be undone.';
    if (weighIns.length === 1) return 'It’s your only one, so there are no targets until you log another.';
    return 'It’s your latest, so your weight and targets go back to the one before.';
  }

  // Focus goes to the delete button now in the same place, or to "Log weigh-in" once none are left.
  async function confirmDelete(weighIn, index) {
    const today = localDate(new Date());
    const confirmed = await confirmSheet({
      title: `Delete ${weightLabel(weighIn.kg, units)} from ${formatDate(shortDates, weighIn.date, today)}?`,
      message: deleteMessage(weighIn),
      confirmLabel: 'Delete weigh-in',
    });
    if (!confirmed) return;
    error.show(null);
    try {
      weighIns = await weightLog.remove(weighIn.date);
    } catch (err) {
      console.error('[macro-planner] deleting a weigh-in failed:', err);
      error.show(saveFailed(err));
      error.element.scrollIntoView({ block: 'nearest' });
      return;
    }
    onChange(weighIns);
    show();
    (deleteButtons[Math.min(index, deleteButtons.length - 1)] ?? logTarget).focus();
  }

  async function logNew() {
    const opener = document.activeElement;
    const saved = await logWeighInSheet({ weightLog, weighIns, units });
    if (!saved) return;
    weighIns = saved;
    error.show(null);
    onChange(weighIns);
    show();
    // The second weigh-in swaps the empty state, and the button that opened the sheet, for the chart.
    if (!opener?.isConnected) logTarget.focus();
  }

  // With fewer than two weigh-ins in the window, the chart, rate line and button give way to the
  // empty state, whose button logs one too (SPEC §3.7).
  function showTrend(today) {
    const card = weightTrend({ weighIns, today, profile, units });
    if (card) {
      trend.replaceChildren(card);
      logTarget = logButton;
    } else {
      const empty = emptyState({
        iconName: 'chart-line',
        heading: 'Weigh in a couple of times to see a trend',
        message: 'Your weigh-ins from the last 12 weeks show here, whenever you happen to weigh in.',
        action: { label: 'Log weigh-in', onClick: logNew },
      });
      trend.replaceChildren(empty);
      logTarget = empty.querySelector('button');
    }
    logButton.hidden = !card;
  }

  // The last 12 weeks, newest first: the date in the eyebrow, the weight as the title (DESIGN §8).
  function show() {
    const today = localDate(new Date());
    showTrend(today);
    deleteButtons = [];
    const rows = listedWeighIns(weighIns, today).map((weighIn, index) => {
      const button = iconButton('trash-2', `Delete weigh-in, ${formatDate(spokenDates, weighIn.date, today)}`, {
        onClick: () => confirmDelete(weighIn, index),
      });
      deleteButtons.push(button);
      return listRow({ eyebrow: formatDate(shortDates, weighIn.date, today), title: weightLabel(weighIn.kg, units), trailing: button });
    });
    list.replaceChildren(...rows);
    list.hidden = rows.length === 0;
  }

  show();
  return [trend, logButton, list, error.element];
}
