// app.js — LiftBoard's entry point. Loads persist.js, creates the store,
// applies the saved accent, then shows the tab for the URL hash.

import { createStore } from './js/store.js';
import { icon } from './js/icons.js';
import { renderBoard } from './js/views/board.js';
import { renderStats } from './js/views/stats.js';
import { renderSettings } from './js/views/settings.js';

const TABS = {
  board: { label: 'Board', icon: 'layout-grid', render: renderBoard },
  stats: { label: 'Stats', icon: 'chart-line', render: renderStats },
  settings: { label: 'Settings', icon: 'settings', render: renderSettings },
};

const screen = document.getElementById('screen');
const view = document.getElementById('view');
const tabbar = document.getElementById('tabbar');

/** Replaces the page with one centered message (loading, or why it can't open). */
function showScreen(message) {
  screen.textContent = message;
  screen.hidden = false;
  view.hidden = true;
  tabbar.hidden = true;
}

async function loadPersist() {
  // A dynamic import, so a failure (no signal, Firebase not cached) can be caught.
  const { syncedState } = await import('../../shared/persist.js');
  return syncedState('liftboard');
}

function buildTabbar() {
  for (const [id, tab] of Object.entries(TABS)) {
    const link = document.createElement('a');
    link.className = 'tab';
    link.href = `#${id}`;
    link.dataset.tab = id;
    link.innerHTML = icon(tab.icon);
    const label = document.createElement('span');
    label.className = 't-tab';
    label.textContent = tab.label;
    link.append(label);
    tabbar.append(link);
  }
}

function startRouter(store) {
  let cleanup = null;
  let current = null;

  function render() {
    const [tab] = location.hash.slice(1).split('/');
    if (!TABS[tab]) {
      history.replaceState(null, '', '#board');
      return render();
    }
    if (tab !== current) window.scrollTo(0, 0);
    current = tab;
    cleanup?.();
    cleanup = TABS[tab].render(view, store) ?? null;
    for (const link of tabbar.querySelectorAll('.tab')) {
      if (link.dataset.tab === tab) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  }

  window.addEventListener('hashchange', render);
  store.subscribe(render);
  render();
}

async function main() {
  let persist;
  try {
    persist = await loadPersist();
  } catch (err) {
    console.warn('[liftboard] persist.js failed to load:', err);
    showScreen("LiftBoard couldn't connect. Try again when you have signal.");
    return;
  }

  const store = createStore(persist);
  if (store.loadError) {
    console.warn('[liftboard] saved data failed validation:', store.loadError);
    showScreen("LiftBoard's saved data couldn't be read, so nothing has been changed. Reload to try again.");
    return;
  }

  document.documentElement.dataset.accent = store.state.settings.accent;
  buildTabbar();
  screen.hidden = true;
  view.hidden = false;
  tabbar.hidden = false;
  startRouter(store);
}

main();
