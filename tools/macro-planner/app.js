// Boot, storage, and hash routing between views.

import { loadCoreDoc, localDate } from './js/data.js';
import { createLocalPersist, createPersonalStore } from './js/store.js';
import { syncStatus } from './js/sync-status.js';
import { DEFAULT_ROUTE, backRoute, hashFor, isPushed, parseRoute, tabFor } from './js/routes.js';
import { buildTabBar, renderHeader, updateTabBar } from './js/shell.js';
import * as today from './js/views/today.js';
import * as plan from './js/views/plan.js';
import * as meals from './js/views/meals.js';
import * as meal from './js/views/meal-editor.js';
import * as stats from './js/views/stats.js';
import * as settings from './js/views/settings.js';
import * as components from './js/views/components.js';

// By tab or pushed screen; a tab with segments renders whichever one the route names.
const VIEWS = { today, plan, meals, stats, settings, meal, components };

const app = document.getElementById('app');
const header = document.getElementById('header');
const view = document.getElementById('view');
const tabBar = document.getElementById('tabbar');

let currentRoute = null;
// True when a pushed screen was opened from inside the app, so Back can pop history.
// After a refresh or a deep link there is nothing of ours to pop, so Back goes to the
// screen's parent: Meals for a meal, Today otherwise.
let canPopToPrevious = false;

function goBack() {
  if (canPopToPrevious) {
    history.back();
  } else {
    history.replaceState(null, '', hashFor(backRoute(currentRoute)));
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
  VIEWS[tabFor(route)].render(view, { route, replaceRoute, goBack, store });
  window.scrollTo(0, 0);
}

// For a switch inside a view that shouldn't add a history entry, like a segment or a meal's
// screen moving to its new copy: the address changes so refresh keeps it, Back skips it,
// and the view updates itself.
function replaceRoute(route) {
  history.replaceState(null, '', hashFor(route));
  currentRoute = route;
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

// Exported so it can be reached from the console when checking stored data.
export const store = await openStore();
const syncIcon = syncStatus(store);
// On a first run this creates the core doc, so startedOn is the day the app first opened.
await loadCoreDoc(store, localDate(new Date()));

buildTabBar(tabBar);
window.addEventListener('hashchange', show);
show();
app.hidden = false;
