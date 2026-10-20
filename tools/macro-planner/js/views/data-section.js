// The Data section of Settings (SPEC §3.8): export everything as one JSON file, import one in
// its place, or reset everything. Import and reset replace what every synced device has, so both
// ask first with the confirm sheet (CLAUDE.md, storage).

import { BackupError, ExportUnavailableError, backupFileName, exportDocs, importDocs, readBackup, resetDocs } from '../backup.js';
import { loadBundledFoods } from '../bundled-foods.js';
import { localDate } from '../data.js';
import { secondaryButton } from '../ui/buttons.js';
import { formError } from '../ui/inputs.js';
import { confirmSheet } from '../ui/sheet.js';

// Safari reads a download's file after click() returns, so its URL is kept a while.
const DOWNLOAD_URL_LIFETIME_MS = 60_000;

function download(text, fileName) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_URL_LIFETIME_MS);
}

// done: { action: 'import' | 'reset', message } when Settings was just redrawn after one, to say
// so and put focus back on its button. onReplaced(done) redraws Settings once every doc has been
// replaced, since everything on it has changed. Returns { elements, focusDone } — focusDone
// moves focus once the elements are on the page.
export function dataSection({ store, done, onReplaced }) {
  const note = document.createElement('p');
  note.className = 'settings__note';
  note.textContent = 'Export saves everything as one file. Importing one replaces everything with it.';

  const status = document.createElement('p');
  status.className = 'settings__note';
  status.setAttribute('role', 'status');
  status.textContent = done?.message ?? '';
  status.hidden = !done;

  const error = formError();
  // One export, import or reset at a time.
  let busy = false;

  async function run(work) {
    if (busy) return;
    busy = true;
    error.show(null);
    status.hidden = true;
    try {
      await work();
    } finally {
      busy = false;
    }
  }

  function fail(message, err) {
    if (err) console.error('[macro-planner] backup failed:', err);
    error.show(message);
    error.element.scrollIntoView({ block: 'nearest' });
  }

  const exportButton = secondaryButton('Export data', {
    block: true,
    onClick: () =>
      run(async () => {
        try {
          const backup = await exportDocs(store, new Date());
          download(JSON.stringify(backup, null, 2), backupFileName(localDate(new Date())));
        } catch (err) {
          fail(err instanceof ExportUnavailableError ? err.message : 'That didn’t export. Try again.', err);
        }
      }),
  });

  // The file picker opens from the Import button, so it's never shown or focused itself.
  const picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = '.json,application/json';
  picker.hidden = true;
  picker.addEventListener('change', () => {
    const [file] = picker.files;
    // Cleared, so picking the same file again still fires change.
    picker.value = '';
    if (file) run(() => importFile(file));
  });
  const importButton = secondaryButton('Import data', { block: true, onClick: () => picker.click() });

  async function importFile(file) {
    let docs;
    try {
      docs = readBackup(await file.text());
    } catch (err) {
      fail(err instanceof BackupError ? err.message : 'That file couldn’t be read, so nothing was imported.', err);
      return;
    }
    const confirmed = await confirmSheet({
      title: 'Replace all your data?',
      message: `Everything here and on every device that syncs is replaced with ${file.name}. This can’t be undone.`,
      confirmLabel: 'Replace all data',
    });
    if (!confirmed) return;
    try {
      await importDocs(store, docs, localDate(new Date()), await loadBundledFoods());
    } catch (err) {
      fail('That didn’t import. Try again.', err);
      return;
    }
    onReplaced({ action: 'import', message: `Imported ${file.name}.` });
  }

  const resetButton = secondaryButton('Reset everything', {
    block: true,
    onClick: () =>
      run(async () => {
        const confirmed = await confirmSheet({
          title: 'Reset everything?',
          message:
            'Your profile, foods, meals, plan, days and weigh-ins are deleted here and on every device that syncs. This can’t be undone, so export first to keep a copy.',
          confirmLabel: 'Reset everything',
        });
        if (!confirmed) return;
        try {
          await resetDocs(store, localDate(new Date()));
        } catch (err) {
          fail('That didn’t reset. Try again.', err);
          return;
        }
        onReplaced({ action: 'reset', message: 'Everything is reset. Fill in your profile to get your targets.' });
      }),
  });

  const buttons = { import: importButton, reset: resetButton };
  return {
    elements: [note, exportButton, importButton, picker, resetButton, status, error.element],
    focusDone() {
      if (done) buttons[done.action].focus();
    },
  };
}
