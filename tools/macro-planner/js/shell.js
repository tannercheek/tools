// App shell: header (DESIGN §11) and the fixed bottom tab bar.

import { icon } from './icons.js';
import { TABS, hashFor, isPushed, routeLabel, tabFor } from './routes.js';
import { iconButton, iconLink } from './ui/buttons.js';

const todayDateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long' });
const monthDayFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const spokenDateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

// The brand mark (DESIGN §17): icons/logo-mark-color.svg's geometry, with fills from tokens in
// style.css so it follows dark mode. Decorative; the title beside it names the screen.
const LOGO_MARK =
  '<svg class="logo-mark" viewBox="0 0 73 64.5" aria-hidden="true">' +
  '<rect class="logo-mark__body" width="73" height="64.5" rx="14.5"/>' +
  '<rect class="logo-mark__interior" x="5" y="5" width="63" height="51" rx="9.5"/>' +
  '<rect class="logo-mark__protein" x="9.5" y="9.5" width="26" height="42" rx="6"/>' +
  '<rect class="logo-mark__carbs" x="40.5" y="9.5" width="23" height="18.5" rx="6"/>' +
  '<rect class="logo-mark__fat" x="40.5" y="33" width="23" height="18.5" rx="6"/>' +
  '</svg>';

function screenTitle(text) {
  const title = document.createElement('h1');
  title.className = 'screen-title';
  title.textContent = text;
  return title;
}

function span(className) {
  const element = document.createElement('span');
  element.className = className;
  return element;
}

// 'YYYY-MM-DD' as local midnight, for formatting.
function calendarDate(date) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Today's date switcher (SPEC §3.6): previous and next day around the date stack, whose title is
// a button back to today (DESIGN §11). The Today view drives it: connect() for the taps, show()
// for the date.
function dateSwitcher() {
  const previous = iconButton('chevron-left', 'Previous day');
  const next = iconButton('chevron-right', 'Next day');
  const title = span('date-stack__title');
  const dateLine = span('date-stack__date');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'date-stack__button';
  button.append(title, dateLine);
  const heading = document.createElement('h1');
  heading.className = 'date-stack';
  heading.append(button);
  const element = document.createElement('div');
  element.className = 'date-switcher';
  element.append(previous, heading, next);

  let handlers = {};
  previous.addEventListener('click', () => handlers.onPrevious?.());
  next.addEventListener('click', () => handlers.onNext?.());
  button.addEventListener('click', () => handlers.onToday?.());

  return {
    element,

    // { onPrevious, onNext, onToday }, each called when its control is tapped.
    connect(callbacks) {
      handlers = callbacks;
    },

    // date: 'YYYY-MM-DD'. isToday titles it "Today" rather than the weekday. canGoBack is false
    // at the oldest day kept, which disables previous.
    show({ date, isToday, canGoBack }) {
      const day = calendarDate(date);
      title.textContent = isToday ? 'Today' : weekdayFormat.format(day);
      // The weekday is already the title on any other day.
      dateLine.textContent = (isToday ? todayDateFormat : monthDayFormat).format(day);
      const spoken = spokenDateFormat.format(day);
      button.setAttribute('aria-label', isToday ? `Today, ${spoken}` : `${spoken}, go to today`);
      // A disabled button drops focus, so it moves to the date first.
      if (!canGoBack && document.activeElement === previous) button.focus();
      previous.disabled = !canGoBack;
    },
  };
}

// syncStatus: the header's sync status element (js/sync-status.js). Returns { dateSwitcher } on
// Today, for the view to drive, and {} on every other screen.
export function renderHeader(header, route, { onBack, syncStatus }) {
  const start = document.createElement('div');
  start.className = 'app-header__start';
  const end = document.createElement('div');
  end.className = 'app-header__end';

  const parts = {};
  if (route === 'today') {
    parts.dateSwitcher = dateSwitcher();
    start.append(parts.dateSwitcher.element);
  } else if (isPushed(route)) {
    const back = iconButton('chevron-left', 'Back');
    back.addEventListener('click', onBack);
    start.append(back, screenTitle(routeLabel(route)));
  } else {
    start.append(screenTitle(routeLabel(tabFor(route))));
  }
  // Pushed screens lead with Back instead.
  if (!isPushed(route)) start.insertAdjacentHTML('afterbegin', LOGO_MARK);

  if (syncStatus) end.append(syncStatus);
  if (!isPushed(route)) end.append(iconLink('sliders-horizontal', 'Settings', hashFor('settings')));

  header.dataset.layout = route === 'today' ? 'today' : isPushed(route) ? 'pushed' : 'tab';
  header.replaceChildren(start, end);
  return parts;
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
