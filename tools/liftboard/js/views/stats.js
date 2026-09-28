// views/stats.js — the Stats tab. #stats lists every lift with its latest
// hero; #stats/<id> shows that lift's detail (views/lift-stats.js).

import { h, fill } from '../dom.js';
import { latest } from '../derive.js';
import { heroText } from '../format.js';
import { icon, patternIcon } from '../icons.js';
import { renderLiftStats } from './lift-stats.js';

export function renderStats(root, store, [liftId] = []) {
  if (liftId) {
    if (store.lift(liftId)) return renderLiftStats(root, store, liftId);
    history.replaceState(null, '', '#stats');   // the lift was deleted: back to the list
  }

  const lifts = [...store.state.lifts].sort((a, b) => a.sortOrder - b.sortOrder);
  const { unit } = store.state.settings;
  fill(root,
    h('h1', { class: 't-sheet-title page-title' }, 'Stats'),
    lifts.length === 0
      ? h('div', { class: 'empty' },
          h('p', { class: 't-row-label' }, 'No lifts yet'),
          h('p', { class: 't-subtitle' }, 'Add a lift on the Board to see its progress here.'))
      : h('ul', {}, lifts.map(lift =>
          h('li', {},
            h('a', { class: 'list-row', href: `#stats/${encodeURIComponent(lift.id)}` },
              h('span', { class: 'list-row-icon', html: patternIcon(lift.pattern) }),
              h('span', { class: 'list-row-text' },
                h('span', { class: 't-lift-name' }, lift.name),
                h('span', { class: 't-e1rm' }, heroText(latest(lift), lift, unit))),
              h('span', { class: 'chevron', html: icon('chevron-right') }))))));
}
