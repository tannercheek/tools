// Stats (SPEC §3.7): the daily averages over the last 7 days, then the weight trend and log, under "Weight".

import { lastSevenDaysAverage, profileTargets } from '../calc.js';
import { DAYS_DOC_ID, createWeightLog, currentWeight, localDate } from '../data.js';
import { miniRings } from '../rings.js';
import { CORE_DOC_ID } from '../store.js';
import { emptyState } from '../ui/empty-state.js';
import { weighInsSection } from './weigh-ins.js';

// With fewer counted days than this, the averages give way to the empty state (SPEC §3.7).
const MIN_COUNTED_DAYS = 2;

function section(title, ...children) {
  const element = document.createElement('section');
  element.className = 'stats__section';
  const heading = document.createElement('h2');
  heading.className = 'section-title';
  heading.textContent = title;
  element.append(heading, ...children);
  return element;
}

function note(text) {
  const element = document.createElement('p');
  element.className = 'stats__note';
  element.textContent = text;
  return element;
}

// The count shows only when some days don't count, and never as "logged" or "missed" (SPEC §3.7).
function averageHeading(countedDays) {
  return countedDays === 7 ? 'Daily average · last 7 days' : `Daily average · ${countedDays} of the last 7 days`;
}

// The daily averages against the targets as four mini rings in one card, or the empty state with
// fewer than two counted days. Mini rings read "1,500 of 2,600" rather than what's left, which
// suits days already over (DESIGN §6). setTargets(targets) redraws them against new targets.
function averagesSection(daysDoc, today, targets) {
  const { average, loggedDays } = lastSevenDaysAverage(daysDoc, today);
  if (loggedDays < MIN_COUNTED_DAYS) {
    // No action makes sense here, so no button (DESIGN §13).
    const element = emptyState({
      iconName: 'chart-no-axes-column',
      heading: 'Your 7-day averages show up after a couple of days',
      message: 'Each day counts once it’s over, so today’s numbers stay on Today.',
    });
    return { element, setTargets() {} };
  }
  const averageRings = miniRings({ totals: average, targets });
  const card = document.createElement('div');
  card.className = 'stats__averages';
  card.append(averageRings.element);
  return {
    element: section(averageHeading(loggedDays), card),
    setTargets: (next) => averageRings.show({ totals: average, targets: next }),
  };
}

// lockIn: lock-in.js's createLockIn, run before the days are read so every day in the window is
// locked and counts by its entries (SPEC §3.5).
export function render(container, { store, lockIn }) {
  // Built into its own element, so a load that finishes after leaving the screen changes nothing.
  const screen = document.createElement('div');
  screen.className = 'stats';
  container.replaceChildren(screen);

  const today = localDate(new Date());
  const weightLog = createWeightLog(store);
  // Locks in first, in case the date has changed since the app opened, so yesterday counts.
  const daysDoc = lockIn(today)
    .catch((err) => console.error('[macro-planner] lock-in failed:', err))
    .then(() => store.load(DAYS_DOC_ID));

  // Weights show in the profile's units; a core doc that hasn't loaded on this device shows metric.
  Promise.all([store.load(CORE_DOC_ID), weightLog.list(), daysDoc]).then(
    ([doc, weighIns, days]) => {
      if (!screen.isConnected) return;
      const units = doc.settings?.units ?? 'metric';
      // Targets need the latest weigh-in, so logging or deleting one here moves them.
      const targetsFor = (log) => profileTargets(doc.profile ?? {}, currentWeight(log), doc.overrides ?? {});
      const averages = averagesSection(days, today, targetsFor(weighIns));
      const onChange = (log) => averages.setTargets(targetsFor(log));
      const weight = weighInsSection({ weightLog, weighIns, units, profile: doc.profile ?? {}, onChange });
      screen.replaceChildren(averages.element, section('Weight', ...weight));
    },
    (err) => {
      console.error('[macro-planner] stats failed to load:', err);
      if (!screen.isConnected) return;
      screen.replaceChildren(note('Stats didn’t load. Check your connection, then reload.'));
    },
  );
}
