// views/card.js — one lift card on the Board. Every number comes from
// derive.js and format.js; the card only arranges them.
//
//   [equipment icon]          [❄️ / 🔥]
//   Bench Press
//   215 × 5                               ← hero: latest top set, no unit
//   e1RM 251 ↗ · PR 263                   ← or, bodyweight: ↗ · PR BW+20 × 5; no weight: ↗ · PR 20 reps
//   5 days ago

import { h } from '../dom.js';
import { latest, badge, isTrendingUp, showsPR, comparablePR, isLoaded } from '../derive.js';
import { heroText, formatE1RM, prFigure, relativeDay, showsE1RM } from '../format.js';
import { icon, equipmentIcon } from '../icons.js';

const BADGES = {
  stale: ['❄️', 'Stale: not logged for 3 weeks or more'],
  newPR: ['🔥', 'New record'],
};

function trendArrow(alone) {
  return h('span', { class: alone ? 'trend trend-alone' : 'trend', html: icon('arrow-up-right') },
    h('span', { class: 'visually-hidden' }, ' trending up'));
}

/** The second line: e1RM (where showsE1RM), ↗, then "· PR …" unless the PR
 *  would read the same as the latest. Null when there's nothing to show.
 *  Each half stays in one piece; a narrow card wraps only before the "·". */
function secondLine(lift, last, unit) {
  const lead = [];
  if (showsE1RM(lift, last)) lead.push(`e1RM ${formatE1RM(last.bestE1RMKg, unit)}`);
  if (isTrendingUp(lift)) lead.push(trendArrow(lead.length === 0));

  let pr = null;
  if (showsPR(lift, prFigure(lift, unit))) {
    const s = comparablePR(lift);
    const text = showsE1RM(lift, s) ? `PR ${formatE1RM(s.bestE1RMKg, unit)}`
      : isLoaded(s) ? `PR ${heroText(s, lift, unit)}`
      : `PR ${s.topReps} reps`;
    pr = h('span', { class: 'card-pr nowrap' }, lead.length ? `· ${text}` : text);
  }

  if (!lead.length && !pr) return null;
  return h('span', { class: 't-e1rm card-line' },
    lead.length ? h('span', { class: 'nowrap' }, lead) : null,
    lead.length && pr ? ' ' : null,
    pr);
}

/** A card <button> for one lift. `now` is passed in so a whole board agrees on "today". */
export function liftCard(lift, unit, now, onTap) {
  const last = latest(lift);
  const hero = heroText(last, lift, unit);
  const corner = BADGES[badge(lift, now)];

  return h('button', { type: 'button', class: 'card', 'data-lift-id': lift.id, onclick: onTap },
    h('span', { class: 'card-top' },
      h('span', { class: 'card-icon', html: equipmentIcon(lift.equipment) }),
      corner
        ? h('span', { class: 'card-badge t-badge' },
            h('span', { 'aria-hidden': 'true' }, corner[0]),
            h('span', { class: 'visually-hidden' }, corner[1]))
        : null),
    h('span', { class: 't-lift-name card-name' }, lift.name),
    // --hero-chars lets the hero shrink to fit the card (see .t-hero in tokens.css)
    h('span', { class: 't-hero card-hero', style: `--hero-chars: ${hero.length}` }, hero),
    last ? secondLine(lift, last, unit) : null,
    last ? h('span', { class: 't-date card-date' }, relativeDay(last.date, now)) : null);
}
