// Boot, storage, and hash routing between views.

import { createLocalPersist, createPersonalStore } from './js/store.js';
import { syncStatus } from './js/sync-status.js';
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

const app = document.getElementById('app');
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

  renderHeader(header, route, { onBack: goBack, syncStatus: syncIcon });
  updateTabBar(tabBar, route);
  view.classList.toggle('view--pushed', isPushed(route));
  VIEWS[route].render(view);
  window.scrollTo(0, 0);
}

// iOS Safari only applies :active (the button press styles) when a touch listener exists.
document.addEventListener('touchstart', () => {}, { passive: true });

// Syncs through the dashboard's shared module and gates on its passphrase.
async function openStore() {
  let persist;
  try {
    persist = await import('../../shared/persist.js');
  } catch (err) {
    console.warn('[macro-planner] sync unavailable, saving on this device only:', err);
    return createPersonalStore(createLocalPersist(localStorage));
  }
  await persist.gate('#app');
  // gate shows #app once the passphrase passes; keep it hidden until the first render.
  app.hidden = true;
  return createPersonalStore(persist.syncedState);
}

// Exported so it can be reached from the console until views use it.
export const store = await openStore();
const syncIcon = syncStatus(store);

buildTabBar(tabBar);
window.addEventListener('hashchange', show);
show();
app.hidden = false;
