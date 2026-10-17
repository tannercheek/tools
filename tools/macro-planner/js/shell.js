// App shell: header (DESIGN §11) and the fixed bottom tab bar.

import { icon } from './icons.js';
import { TABS, hashFor, isPushed, routeLabel, tabFor } from './routes.js';
import { iconButton, iconLink } from './ui/buttons.js';

const dateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

function screenTitle(text) {
  const title = document.createElement('h1');
  title.className = 'screen-title';
  title.textContent = text;
  return title;
}

// Previous / next day stay inert until step 5.3 wires up the date switcher.
function todayStart() {
  const stack = document.createElement('div');
  stack.className = 'date-stack';
  const date = document.createElement('p');
  date.className = 'date-stack__date';
  date.textContent = dateFormat.format(new Date());
  stack.append(screenTitle('Today'), date);
  return [iconButton('chevron-left', 'Previous day'), stack, iconButton('chevron-right', 'Next day')];
}

// syncStatus: the header's sync status element (js/sync-status.js).
export function renderHeader(header, route, { onBack, syncStatus }) {
  const start = document.createElement('div');
  start.className = 'app-header__start';
  const end = document.createElement('div');
  end.className = 'app-header__end';

  if (route === 'today') {
    start.append(...todayStart());
  } else if (isPushed(route)) {
    const back = iconButton('chevron-left', 'Back');
    back.addEventListener('click', onBack);
    start.append(back, screenTitle(routeLabel(route)));
  } else {
    start.append(screenTitle(routeLabel(tabFor(route))));
  }

  if (syncStatus) end.append(syncStatus);
  if (!isPushed(route)) end.append(iconLink('sliders-horizontal', 'Settings', hashFor('settings')));

  header.dataset.layout = route === 'today' ? 'today' : isPushed(route) ? 'pushed' : 'tab';
  header.replaceChildren(start, end);
}

// Built once so focus on a tab survives navigation; updateTabBar only moves aria-current.
export function buildTabBar(nav) {
  nav.replaceChildren(
    ...TABS.map((tab) => {
      const link = document.createElement('a');
      link.className = 'tab';
      link.href = hashFor(tab.id);
      link.dataset.route = tab.id;
      link.innerHTML = `${icon(tab.icon)}<span class="tab__label">${tab.label}</span>`;
      return link;
    }),
  );
}

export function updateTabBar(nav, route) {
  nav.hidden = isPushed(route);
  for (const link of nav.querySelectorAll('.tab')) {
    if (link.dataset.route === tabFor(route)) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}
