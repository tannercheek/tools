// Off plan (SPEC §3.4), from Today: the "Off plan until [date]" sheet, and the line above an
// off-plan day's slots with "Back on plan" (DESIGN §8).

import { addDays } from '../calc.js';
import { lastOffPlanDate } from '../data.js';
import { primaryButton } from '../ui/buttons.js';
import { selectField } from '../ui/inputs.js';
import { noticeRow } from '../ui/row.js';
import { openSheet } from '../ui/sheet.js';

const dateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

function shortDate(date) {
  return dateFormat.format(new Date(`${date}T00:00`));
}

function dayLabel(date, today) {
  if (date === today) return 'Today';
  if (date === addDays(today, 1)) return 'Tomorrow';
  return shortDate(date);
}

// from: the day it starts, today or later, which is also the default end. The end can be any day
// from then up to 30 days after today. Resolves to the last off-plan day, or null if the sheet
// closes without one.
export async function offPlanSheet({ from, today }) {
  let result = null;
  let sheet;
  const options = [];
  for (let date = from; date <= lastOffPlanDate(today); date = addDays(date, 1)) {
    options.push({ value: date, label: dayLabel(date, today) });
  }
  const until = selectField({ label: 'Until', options, value: from, placeholder: 'Until' });

  const message = document.createElement('p');
  message.className = 'sheet__message';
  message.textContent = 'Every slot is flex on those days, and you log what you eat. Your plan stays as it is.';

  const form = document.createElement('form');
  form.className = 'off-plan-form';
  form.noValidate = true;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    result = until.input.value;
    sheet.close();
  });
  const confirm = primaryButton('Go off plan', { block: true });
  confirm.type = 'submit';
  form.append(until.element, confirm);

  sheet = openSheet({ title: 'Off plan', content: [message, form] });
  await sheet.closed;
  return result;
}

// "Off plan until Fri, Oct 23", or "Off plan today" when it ends today. until: the last day of
// the off-plan stretch. backOnPlan: the "Back on plan" button.
export function offPlanLine({ until, today, backOnPlan }) {
  const text = until === today ? 'Off plan today' : `Off plan until ${shortDate(until)}`;
  return noticeRow({ text, trailing: backOnPlan });
}
