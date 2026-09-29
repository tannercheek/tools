// views/settings.js — the Settings tab: Units, Accent, Keep history, the
// Lifts and Tags screens (views/settings-lists.js), Data, and About.

import { h, fill } from '../dom.js';
import { confirmDialog, alertDialog } from '../dialogs.js';
import { icon } from '../icons.js';
import { plural } from '../format.js';
import { sampleData } from '../sample-data.js';
import { exportFileName, fromExportFile } from '../transfer.js';
import { segmented } from './controls.js';
import { renderLiftsList, renderTagsList } from './settings-lists.js';

const VERSION = '1.0';
const ACCENTS = [['cobalt', 'Cobalt'], ['brick', 'Brick'], ['ink', 'Ink']];
const RETENTION = [['6m', '6 months'], ['1y', '1 year'], ['2y', '2 years']];
const RETENTION_TEXT = Object.fromEntries(RETENTION);

const debug = () => new URLSearchParams(location.search).has('debug');

function group(title, ...children) {
  const id = `settings-${title.toLowerCase().replace(/\W+/g, '-')}`;
  return h('section', { class: 'group', 'aria-labelledby': id },
    h('h2', { class: 't-section', id }, title), ...children);
}

/** Shortening Keep history counts what would go and asks first; cancelling changes nothing. */
async function setRetention(store, value) {
  if (value === store.state.settings.retention) return;
  const n = store.countPrunable(value);
  if (n > 0) {
    const ok = await confirmDialog(
      `Delete ${plural(n, 'session')} older than ${RETENTION_TEXT[value]}? Each lift’s latest session and records are kept.`,
      'Delete', { destructive: true });
    if (!ok) return;
  }
  store.setSetting('retention', value);
  store.pruneHistory();
}

function exportData(store) {
  const text = JSON.stringify(store.exportDoc(), null, 2) + '\n';
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = h('a', { href: url, download: exportFileName() });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Reads the chosen file, checks all of it, then asks before replacing anything. */
async function importFile(store, file) {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return alertDialog('That file isn’t a readable LiftBoard export, so nothing was imported.');
  }
  let incoming;
  try {
    incoming = fromExportFile(data);
  } catch (err) {
    return alertDialog(err.message);
  }
  const n = store.state.lifts.length;
  const message = n
    ? `Replace everything with this file? Your ${plural(n, 'lift')} will be removed and replaced by its ${plural(incoming.lifts.length, 'lift')}.`
    : `Import ${plural(incoming.lifts.length, 'lift')} from this file?`;
  if (!(await confirmDialog(message, 'Import', { destructive: n > 0 }))) return;
  store.importDoc(data);
  location.hash = '#board';
}

async function deleteAll(store) {
  const { lifts, tags } = store.state;
  const sessions = lifts.reduce((n, l) => n + l.sessions.length, 0);
  const ok = await confirmDialog(
    `Delete all your data? Your ${plural(lifts.length, 'lift')}, ${plural(sessions, 'session')} and ${plural(tags.length, 'tag')} will be gone for good, and the settings reset.`,
    'Delete all', { destructive: true });
  if (ok) { store.deleteAll(); location.hash = '#board'; }
}

async function loadSample(store) {
  const { lifts, tags } = store.state;
  const yours = [lifts, tags].map((list, i) => list.length && plural(list.length, i ? 'tag' : 'lift')).filter(Boolean);
  const message = yours.length
    ? `Replace everything with the sample data? Your ${yours.join(' and ')} will be removed.`
    : 'Load the sample data?';
  if (!(await confirmDialog(message, 'Load sample data', { destructive: lifts.length > 0 }))) return;
  store.replaceAll(sampleData());
  location.hash = '#board';
}

const linkRow = (href, label, detail) =>
  h('a', { class: 'list-row', href },
    h('span', { class: 'list-row-text' }, h('span', { class: 't-row-label' }, label)),
    h('span', { class: 't-subtitle' }, detail),
    h('span', { class: 'chevron', html: icon('chevron-right') }));

export function renderSettings(root, store, [page] = []) {
  if (page === 'lifts') return renderLiftsList(root, store);
  if (page === 'tags') return renderTagsList(root, store);
  if (page) history.replaceState(null, '', '#settings');

  const { settings, lifts, tags } = store.state;
  const fileInput = h('input', {
    type: 'file', accept: 'application/json,.json', class: 'visually-hidden', tabindex: '-1', 'aria-hidden': 'true',
    onchange: e => { const file = e.target.files[0]; e.target.value = ''; if (file) importFile(store, file); },
  });

  fill(root,
    h('h1', { class: 't-sheet-title page-title' }, 'Settings'),
    group('Units',
      segmented('Units', [['lb', 'Pounds'], ['kg', 'Kilograms']], settings.unit, v => store.setSetting('unit', v))),
    group('Accent',
      h('div', { class: 'swatches', role: 'group', 'aria-label': 'Accent' },
        ACCENTS.map(([value, label]) => h('button', {
          type: 'button', class: 'swatch', 'aria-pressed': String(settings.accent === value),
          onclick: () => store.setSetting('accent', value),
        }, h('span', { class: `swatch-dot swatch-${value}`, 'aria-hidden': 'true' }), h('span', { class: 't-chip' }, label))))),
    group('Keep history',
      segmented('Keep history', RETENTION, settings.retention, v => setRetention(store, v)),
      h('p', { class: 't-subtitle' }, 'Older sessions are deleted. Each lift’s latest session and records are always kept.')),
    group('Library',
      h('ul', {},
        h('li', {}, linkRow('#settings/lifts', 'Lifts', String(lifts.length))),
        h('li', {}, linkRow('#settings/tags', 'Tags', String(tags.length))))),
    group('Data',
      h('div', { class: 'data-buttons' },
        h('button', { type: 'button', class: 'btn-secondary btn-wide t-button', onclick: () => exportData(store) }, 'Export'),
        h('button', { type: 'button', class: 'btn-secondary btn-wide t-button', onclick: () => fileInput.click() }, 'Import'),
        fileInput,
        debug()
          ? h('button', { type: 'button', class: 'btn-secondary btn-wide t-button', onclick: () => loadSample(store) }, 'Load sample data')
          : null,
        h('button', { type: 'button', class: 'btn-destructive btn-wide t-button', onclick: () => deleteAll(store) }, 'Delete all data'))),
    group('About',
      h('p', { class: 't-row-label' }, `LiftBoard ${VERSION}`),
      h('p', { class: 't-subtitle' }, 'Estimated 1RM uses the Epley formula: weight × (1 + reps ÷ 30), or the weight itself for a single.')),
  );
}
