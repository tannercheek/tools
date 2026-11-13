// The Import MIDI dialog (PLAN step 18, DESIGN §5.17): a drop zone with
// Choose files, one review row per file, then Add N and Cancel. Opened mixed
// (Import MIDI, or files dropped on the page) or with a fixed kind (a row's
// Import). Reading and the review rules are in my-library.js; the app saves
// what Add hands it, and picks the first file after a row import.
import { readImport, reviewRows, newRow, addCount, idOf } from './my-library.js';
import { pretty } from './display.js';
import { ICONS } from './icons.js';

const TITLE = { groove: 'Import grooves', progression: 'Import progressions' };
const KINDS = [['groove', 'Groove'], ['progression', 'Progression']];
const MIDI_FILE = /\.midi?$/i;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// A select in the usual box with its chevron.
function selectBox(className, options, value, label, role) {
  const box = el('span', `select ${className}`);
  const select = el('select');
  select.dataset.role = role;
  select.setAttribute('aria-label', label);
  select.append(...options.map(({ label: text, value: v }) => new Option(text, v)));
  select.value = value;
  const chev = el('span', 'chev');
  chev.innerHTML = ICONS.chevron;
  box.append(select, chev);
  return box;
}

const hasFiles = (e) => [...(e.dataTransfer?.types ?? [])].includes('Files');

// getLib() gives the current library (for ids already taken). onAdd(items,
// kind) saves items ([{ kind, entry, key }], in list order); kind is the
// row's kind, or null when mixed. It returns the element to focus once the
// dialog closes, or null to go back to the link that opened it. pageOpener
// is that link for files dropped on the page (Import MIDI).
export function createImportPanel({ getLib, onAdd, pageOpener }) {
  const $ = (id) => document.getElementById(id);
  const dlg = $('importDlg'), list = $('importList'), drop = $('importDrop'), dropText = $('importDropText');
  const fileInput = $('importFile'), addBtn = $('importAdd'), choose = $('importChoose');

  let fixed = null;   // 'groove' or 'progression' from a row's Import; null when mixed
  let rows = [];      // [{ file, kind, keyIdx, key }]; key tells rows apart in the DOM
  let reviewed = [];
  let opener = null;  // focus goes back here when the dialog closes
  let focusAfter = null;
  let nextKey = 0;
  let session = 0;    // files still being read after a close are dropped
  let over = false;

  function open(kind, from, files) {
    fixed = kind;
    rows = [];
    opener = from;
    focusAfter = null;
    session++;
    $('importTitle').textContent = TITLE[kind] ?? 'Import MIDI';
    render();
    if (!dlg.open) dlg.showModal();
    if (files?.length) addFiles(files);
  }

  // A file that can't be read, or throws, becomes an error row; it never
  // stops the others.
  async function addFiles(fileList) {
    const at = session;
    const read = await Promise.all([...fileList].map(async (f) => {
      try {
        return readImport(f.name, new Uint8Array(await f.arrayBuffer()));
      } catch {
        return { filename: f.name, id: idOf(f.name), detected: null, error: 'Can’t read this file' };
      }
    }));
    if (at !== session || !dlg.open) return;
    rows = [...rows, ...read.map((file) => ({ ...newRow(file, fixed), key: String(nextKey++) }))];
    render();
  }

  // ---------- rendering ----------

  function render() {
    reviewed = reviewRows(rows, getLib(), fixed);
    drop.classList.toggle('has-files', rows.length > 0);
    showDropText();
    list.hidden = !rows.length;
    list.replaceChildren(...reviewed.map((r, i) => rowNode(r, rows[i].key)));
    const n = addCount(reviewed);
    addBtn.disabled = !n;
    addBtn.textContent = n ? `Add ${n}` : 'Add';
  }

  function showDropText() {
    drop.classList.toggle('is-over', over);
    dropText.textContent = over ? 'Drop to import' : rows.length ? 'Drop more files, or' : 'Drop .mid files here';
  }

  // Line 1: kind (mixed only) · id · summary and Key (progressions) · remove.
  // Line 2, if needed: warnings and the reason it can't be added.
  function rowNode(r, key) {
    const li = el('li', 'import-row');
    li.dataset.row = key;
    const line = el('div', 'import-line');
    if (r.showKind) {
      line.append(selectBox('is-small', KINDS.map(([value, label]) => ({ value, label })), r.kind, `Kind of ${r.id}`, 'kind'));
    }
    const id = el('span', 'import-id', r.id);
    id.title = r.filename;
    line.append(id);
    if (r.summary) {
      const what = el('span', 'import-what');
      what.append(el('span', `import-summary${r.kind === 'progression' ? ' is-chords' : ''}`, r.summary));
      if (r.keys) {
        const keys = r.keys.map((k) => ({ value: k.value, label: pretty(k.label) }));
        what.append(selectBox('is-key', keys, String(r.keyIdx), `Key of ${r.id}`, 'key'));
      }
      line.append(what);
    }
    const remove = el('button', 'icon-btn import-remove');
    remove.type = 'button';
    remove.innerHTML = ICONS.x;
    remove.setAttribute('aria-label', `Remove ${r.id}`);
    line.append(remove);
    li.append(line);
    const notes = [...r.warnings.map(pretty), r.error].filter(Boolean);
    if (notes.length) li.append(el('p', 'hint import-notes', notes.join(' · ')));
    return li;
  }

  // Re-rendering replaces the row, so focus goes back to the same control.
  function refocus(key, selector) {
    list.querySelector(`[data-row="${key}"] ${selector}`)?.focus();
  }

  // ---------- wiring ----------

  list.addEventListener('change', (e) => {
    const select = e.target.closest('select');
    const key = e.target.closest('[data-row]')?.dataset.row;
    if (!select || key == null) return;
    const patch = select.dataset.role === 'kind' ? { kind: select.value } : { keyIdx: Number(select.value) };
    rows = rows.map((r) => (r.key === key ? { ...r, ...patch } : r));
    render();
    refocus(key, `select[data-role="${select.dataset.role}"]`);
  });

  list.addEventListener('click', (e) => {
    const key = e.target.closest('.import-remove') && e.target.closest('[data-row]')?.dataset.row;
    if (key == null) return;
    const at = rows.findIndex((r) => r.key === key);
    rows = rows.filter((r) => r.key !== key);
    render();
    const next = rows[at] ?? rows[at - 1];
    if (next) refocus(next.key, '.import-remove');
    else choose.focus();
  });

  choose.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) addFiles(fileInput.files);
    fileInput.value = ''; // so the same file can be chosen again
  });

  $('importCancel').addEventListener('click', () => dlg.close());
  $('importClose').addEventListener('click', () => dlg.close());
  addBtn.addEventListener('click', () => {
    const items = reviewed.filter((r) => r.item).map((r) => ({ kind: r.kind, ...r.item }));
    if (!items.length) return;
    focusAfter = onAdd(items, fixed) ?? null;
    dlg.close();
  });

  // Escape closes it too (the dialog's own cancel). Nothing is added.
  dlg.addEventListener('close', () => {
    session++;
    rows = [];
    reviewed = [];
    list.replaceChildren();
    const to = focusAfter ?? opener;
    focusAfter = null;
    to?.focus();
  });

  // The drop zone shows where files will land; the drop itself is handled
  // below with every other drop on the page.
  const setOver = (on) => { if (over !== on) { over = on; showDropText(); } };
  drop.addEventListener('dragover', (e) => { if (hasFiles(e)) setOver(true); });
  drop.addEventListener('dragleave', (e) => { if (!drop.contains(e.relatedTarget)) setOver(false); });

  // Files dropped anywhere: into the open dialog, or, if any is a .mid file,
  // open it mixed (desktop). Dropping always stops the browser opening the file.
  document.addEventListener('dragover', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  document.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    setOver(false);
    const files = [...e.dataTransfer.files];
    if (dlg.open) addFiles(files);
    else if (files.some((f) => MIDI_FILE.test(f.name))) open(null, pageOpener, files);
  });

  return { open };
}
