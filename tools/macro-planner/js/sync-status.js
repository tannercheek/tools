// Header sync status (SPEC §4.1, DESIGN §11). Not a button.

import { icon } from './icons.js';

const STATES = {
  synced: { icon: 'cloud-check', label: 'Synced' },
  saving: { icon: 'cloud-upload', label: 'Saving' },
  offline: { icon: 'cloud-off', label: 'Offline, saved on this device' },
};

// Normal saves finish quickly, so "Saving" only shows for one still going after a second.
const SAVING_DELAY_MS = 1000;

// store: the persist.js store, whose onStatus reports 'synced' | 'saved-locally' | 'offline'.
// Built once and moved between header renders, so it keeps its state across routes.
export function syncStatus(store) {
  const el = document.createElement('div');
  el.className = 'sync-status';
  el.setAttribute('role', 'status');

  let storeStatus;
  let savingTimer = null;
  let savingDue = false;
  let shown;

  function show(state) {
    if (state === shown) return;
    shown = state;
    el.innerHTML = `${icon(STATES[state].icon)}<span class="visually-hidden">${STATES[state].label}</span>`;
  }

  // Firestore queues writes while offline rather than failing them, so persist.js would
  // report a save as still in flight. The browser's own offline flag catches that case.
  function update() {
    if (!navigator.onLine || storeStatus === 'offline') show('offline');
    else if (storeStatus === 'synced') show('synced');
    else if (savingDue) show('saving');
  }

  store.onStatus((status) => {
    if (status === 'saved-locally' && storeStatus !== 'saved-locally') {
      savingTimer = setTimeout(() => {
        savingDue = true;
        update();
      }, SAVING_DELAY_MS);
    } else if (status !== 'saved-locally') {
      clearTimeout(savingTimer);
      savingDue = false;
    }
    storeStatus = status;
    update();
  });
  window.addEventListener('online', update);
  window.addEventListener('offline', update);

  return el;
}
