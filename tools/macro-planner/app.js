// Boot and hash routing between views.

import { DEFAULT_ROUTE, hashFor, isPushed, parseRoute } from './js/routes.js';
import { buildTabBar, renderHeader, updateTabBar } from './js/shell.js';
import * as today from './js/views/today.js';
import * as plan from './js/views/plan.js';
import * as foods from './js/views/foods.js';
import * as meals from './js/views/meals.js';
import * as stats from './js/views/stats.js';
import * as settings from './js/views/settings.js';
import * as components from './js/views/components.js';

const VIEWS = { today, plan, foods, meals, stats, settings, components };

const header = document.getElementById('header');
const view = document.getElementById('view');
const tabBar = document.getElementById('tabbar');

let currentRoute = null;
// True when a pushed screen was opened from inside the app, so Back can pop history.
// After a refresh or a deep link there is nothing of ours to pop, so Back goes to Today.
let canPopToPrevious = false;

function goBack() {
  if (canPopToPrevious) {
    history.back();
  } else {
    history.replaceState(null, '', hashFor(DEFAULT_ROUTE));
    show();
  }
}

function show() {
  let route = parseRoute(location.hash);
  if (!route) {
    route = DEFAULT_ROUTE;
    history.replaceState(null, '', hashFor(route));
  }
  if (route === currentRoute) return;

  if (isPushed(route)) canPopToPrevious = currentRoute !== null && !isPushed(currentRoute);
  currentRoute = route;

  renderHeader(header, route, { onBack: goBack });
  updateTabBar(tabBar, route);
  view.classList.toggle('view--pushed', isPushed(route));
  VIEWS[route].render(view);
  window.scrollTo(0, 0);
}

// iOS Safari only applies :active (the button press styles) when a touch listener exists.
document.addEventListener('touchstart', () => {}, { passive: true });

buildTabBar(tabBar);
window.addEventListener('hashchange', show);
show();
