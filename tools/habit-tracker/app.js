import { HABIT_ICONS, UI_ICONS } from './icons.js';

/* ─────────────────────────────────────────────────────────────
   Habit Tracker
   - Everything is stored as ONE encrypted blob ("vault") under a
     single key. The passphrase derives the AES key, so nobody can
     read your habits from the public repo or from Firestore.
   - Habits have stable slug ids; checks are keyed by habit id +
     ISO date, so reordering or deleting never scrambles history.
   ───────────────────────────────────────────────────────────── */

const DOC_ID = 'habit-tracker';
const VAULT_KEY = 'vault';
const LOCAL_PREFIX = 'habit-tracker:';
const REMEMBER_KEY = LOCAL_PREFIX + 'device-key';
const DEFAULT_ICON = 'sparkles';
const KDF_ITERATIONS = 310000;
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const $ = (id) => document.getElementById(id);
const svg = (inner, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ── Storage: shared sync module, localStorage fallback ────── */

let store = null;
let mode = 'local';

function localStore() {
  return {
    get(k) {
      try { const v = localStorage.getItem(LOCAL_PREFIX + k); return v == null ? null : JSON.parse(v); }
      catch { return null; }
    },
    set(k, v) { localStorage.setItem(LOCAL_PREFIX + k, JSON.stringify(v)); },
  };
}

async function connect() {
  try {
    const mod = await import('../../shared/persist.js');
    store = await withTimeout(mod.syncedState(DOC_ID), 12000);
    mode = 'sync';
  } catch (err) {
    console.warn('[habits] Sync module unavailable — using localStorage.', err);
    store = localStore();
    mode = 'local';
  }
}

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

/* ── Crypto (Web Crypto: PBKDF2 → AES-GCM) ─────────────────── */

const te = new TextEncoder();
const td = new TextDecoder();

function toB64(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(passphrase, salt) {
  const base = await crypto.subtle.importKey('raw', te.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: KDF_ITERATIONS, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
  );
}

let key = null;       // CryptoKey, in memory only (unless "remember" is on)
let salt = null;      // base64, fixed for the life of the vault
let vault = null;     // last vault written/read

async function seal(data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(JSON.stringify(data)));
  return { v: 1, salt, iv: toB64(iv), ct: toB64(ct), at: Date.now() };
}

async function unseal(v, k) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(v.iv) }, k, fromB64(v.ct));
  return JSON.parse(td.decode(pt));
}

const isVault = (v) => v && typeof v === 'object' && v.salt && v.iv && v.ct;

/* ── State ─────────────────────────────────────────────────── */

let state = { habits: [], checks: {} };   // habits: [{id, name, icon}], checks: {id: {'2026-09-23': 1}}
let weekOffset = 0;
let editing = false;
let lastLeft = null;

function normalize(s) {
  const out = { habits: [], checks: {} };
  if (s && Array.isArray(s.habits)) {
    out.habits = s.habits
      .filter((h) => h && h.id && h.name)
      .map((h) => ({ id: String(h.id), name: String(h.name), icon: HABIT_ICONS[h.icon] ? h.icon : DEFAULT_ICON }));
  }
  if (s && s.checks && typeof s.checks === 'object') out.checks = s.checks;
  return out;
}

const isChecked = (id, date) => !!state.checks[id]?.[date];

function setChecked(id, date, on) {
  const days = state.checks[id] || (state.checks[id] = {});
  if (on) days[date] = 1; else delete days[date];
  if (!Object.keys(days).length) delete state.checks[id];
}

/* Save queue: every change saves; overlapping changes collapse so the last state always lands. */
let saving = false;
let pending = false;

async function persist() {
  if (saving) { pending = true; return; }
  saving = true;
  setSync('saving');
  try {
    do {
      pending = false;
      const next = await seal(state);
      await store.set(VAULT_KEY, next);
      vault = next;
    } while (pending);
    setSync(mode);
  } catch (err) {
    console.error('[habits] Save failed', err);
    setSync('error');
  } finally {
    saving = false;
  }
}

function setSync(m) {
  const el = $('sync');
  el.dataset.mode = m;
  const text = {
    sync: ['Synced', 'Saved to your shared sync store (encrypted).'],
    local: ['Local only', 'Sync module not reachable — saved in this browser only (encrypted).'],
    saving: [mode === 'sync' ? 'Synced' : 'Local only', 'Saving…'],
    error: ['Not saved', 'The last change could not be saved. It will retry on your next change.'],
  }[m];
  $('sync-text').textContent = text[0];
  el.title = text[1];
}

/* ── Dates ─────────────────────────────────────────────────── */

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function noonToday() { const d = new Date(); d.setHours(12, 0, 0, 0); return d; }

function weekDays(offset) {
  const monday = noonToday();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });
}

const fmt = (d, opts) => d.toLocaleDateString(undefined, opts);

/* ── Rendering ─────────────────────────────────────────────── */

const els = {};

function renderAll() {
  renderHero();
  renderWeek();
  renderHabits();
}

function renderHero() {
  const today = noonToday();
  const todayIso = iso(today);
  $('hero-weekday').textContent = fmt(today, { weekday: 'long' });
  $('hero-date').textContent = fmt(today, { month: 'long', day: 'numeric' });

  const el = $('hero-left');
  const total = state.habits.length;
  const left = state.habits.filter((h) => !isChecked(h.id, todayIso)).length;

  if (!total) {
    el.textContent = 'Nothing to track yet';
  } else if (left === 0) {
    if (lastLeft !== 0 || !el.querySelector('.done-check')) {
      el.innerHTML = `<svg class="i done-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>Every habit done today`;
    }
  } else {
    el.innerHTML = `<span class="num">${left}</span>${left === 1 ? ' habit' : ' habits'} left today`;
    if (lastLeft !== null && lastLeft !== left) el.querySelector('.num').classList.add('tick');
  }
  lastLeft = total ? left : null;
}

function renderWeek() {
  const days = weekDays(weekOffset);
  const todayIso = iso(noonToday());

  let label;
  if (weekOffset === 0) label = 'This week';
  else if (weekOffset === -1) label = 'Last week';
  else {
    const a = days[0], b = days[6];
    const sameMonth = a.getMonth() === b.getMonth();
    label = `${fmt(a, { month: 'short', day: 'numeric' })} – ${sameMonth ? b.getDate() : fmt(b, { month: 'short', day: 'numeric' })}`;
  }
  els.weekLabel.textContent = label;
  els.weekLabel.disabled = weekOffset === 0;
  els.nextWeek.disabled = weekOffset >= 0;

  els.headDays.innerHTML = days.map((d, i) =>
    `<div class="head-day${iso(d) === todayIso ? ' today' : ''}"><b>${DAY_LETTERS[i]}</b><small>${d.getDate()}</small></div>`
  ).join('');
}

function renderHabits() {
  const days = weekDays(weekOffset);
  const todayIso = iso(noonToday());
  els.app.classList.toggle('editing', editing);
  els.empty.hidden = state.habits.length > 0;
  els.weekHead.hidden = state.habits.length === 0;
  els.habits.innerHTML = state.habits.map((h) => habitRow(h, days, todayIso)).join('');
  els.habits.querySelectorAll('.habit').forEach(updateRowDecor);
}

function habitRow(h, days, todayIso) {
  const name = esc(h.name);
  const cells = days.map((d) => {
    const date = iso(d);
    const future = date > todayIso;
    const checked = isChecked(h.id, date);
    const aria = `${name}, ${fmt(d, { weekday: 'long', month: 'long', day: 'numeric' })}`;
    return `<div class="cell${date === todayIso ? ' today' : ''}">
      <label class="dot${future ? ' future' : ''}" data-date="${date}">
        <input type="checkbox" aria-label="${aria}"${checked ? ' checked' : ''}${future ? ' disabled' : ''}>
        <span class="face"><span class="dot-ring"></span><span class="dot-core"></span></span>
      </label>
    </div>`;
  }).join('');

  const nameEl = editing
    ? `<button class="habit-name" data-action="edit" title="Rename or change icon">${name}</button>`
    : `<span class="habit-name">${name}</span>`;

  return `<li class="habit row" data-id="${esc(h.id)}">
    <div class="label-col">
      <button class="handle" data-action="drag" aria-label="Reorder ${name}. Use arrow keys or drag.">${svg(UI_ICONS['grip-vertical'])}</button>
      <span class="habit-icon">${svg(HABIT_ICONS[h.icon] || HABIT_ICONS[DEFAULT_ICON])}</span>
      ${nameEl}
      <button class="del" data-action="delete" aria-label="Delete ${name}">${svg(UI_ICONS['trash-2'])}</button>
    </div>
    <div class="days">${cells}</div>
  </li>`;
}

/* Links between consecutive filled days + full-week state. */
function updateRowDecor(li) {
  const inputs = [...li.querySelectorAll('.dot input')];
  const cells = [...li.querySelectorAll('.cell')];
  inputs.forEach((inp, i) => cells[i].classList.toggle('link', inp.checked && !!inputs[i + 1]?.checked));
  li.classList.toggle('full', inputs.every((i) => i.checked));
}

/* ── The dot ───────────────────────────────────────────────── */

function onDotChange(e) {
  const input = e.target;
  if (!input.matches('.dot input')) return;
  const dot = input.closest('.dot');
  const li = input.closest('.habit');
  const on = input.checked;

  setChecked(li.dataset.id, dot.dataset.date, on);

  clearTimeout(dot._t);
  dot.classList.remove('pop', 'douse');
  void dot.offsetWidth; // restart the animation if tapped rapidly
  dot.classList.add(on ? 'pop' : 'douse');
  dot._t = setTimeout(() => dot.classList.remove('pop', 'douse'), 800);

  if (on) navigator.vibrate?.(8);

  updateRowDecor(li);
  renderHero();
  persist();
}

/* ── Reordering: pointer drag + arrow keys ─────────────────── */

function startDrag(e) {
  const handle = e.target.closest('.handle');
  if (!handle || (e.pointerType === 'mouse' && e.button !== 0)) return;
  e.preventDefault();

  const li = handle.closest('.habit');
  const list = els.habits;
  const before = [...list.children].map((c) => c.dataset.id).join();
  let anchor = e.clientY;
  let y = e.clientY;

  handle.setPointerCapture(e.pointerId);
  li.classList.remove('settling');
  li.classList.add('dragging');

  const place = () => { li.style.transform = `translateY(${y - anchor}px)`; };

  const shift = (sib, after) => {
    const liTop = li.offsetTop;
    const sibTop = sib.offsetTop;
    if (after) list.insertBefore(sib, li); else list.insertBefore(li, sib);
    anchor += li.offsetTop - liTop;
    place();
    sib.classList.remove('settling');
    sib.style.transform = `translateY(${sibTop - sib.offsetTop}px)`;
    void sib.offsetWidth;
    sib.classList.add('settling');
    sib.style.transform = '';
  };

  const move = (ev) => {
    y = ev.clientY;
    place();
    // Compare in layout coordinates: where the row visually is vs. its neighbours' midpoints.
    const mid = li.offsetTop + (y - anchor) + li.offsetHeight / 2;
    const next = li.nextElementSibling;
    const prev = li.previousElementSibling;
    if (next && mid > next.offsetTop + next.offsetHeight / 2) shift(next, true);
    else if (prev && mid < prev.offsetTop + prev.offsetHeight / 2) shift(prev, false);
  };

  const end = () => {
    handle.removeEventListener('pointermove', move);
    handle.removeEventListener('pointerup', end);
    handle.removeEventListener('pointercancel', end);
    li.classList.add('settling');
    li.style.transform = '';
    setTimeout(() => li.classList.remove('dragging', 'settling'), 230);
    const after = [...list.children].map((c) => c.dataset.id);
    if (after.join() !== before) commitOrder(after);
  };

  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
}

function commitOrder(ids) {
  const byId = new Map(state.habits.map((h) => [h.id, h]));
  state.habits = ids.map((id) => byId.get(id)).filter(Boolean);
  persist();
}

function onHandleKey(e) {
  const handle = e.target.closest('.handle');
  if (!handle || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
  e.preventDefault();
  const id = handle.closest('.habit').dataset.id;
  const i = state.habits.findIndex((h) => h.id === id);
  const j = i + (e.key === 'ArrowUp' ? -1 : 1);
  if (j < 0 || j >= state.habits.length) return;
  const [h] = state.habits.splice(i, 1);
  state.habits.splice(j, 0, h);
  renderHabits();
  els.habits.querySelector(`.habit[data-id="${CSS.escape(id)}"] .handle`)?.focus();
  persist();
}

/* ── Add / edit / delete ───────────────────────────────────── */

const KEYWORDS = [
  [/water|drink|hydrat/, 'droplet'], [/read|book|novel/, 'book-open'],
  [/gym|lift|weight|strength|workout|push.?up|exercise/, 'dumbbell'], [/walk|step|run|jog/, 'footprints'],
  [/bike|cycl|ride|spin/, 'bike'], [/cardio|heart|swim/, 'heart-pulse'], [/sleep|bed|nap/, 'bed'],
  [/wake|sunlight|morning|outside/, 'sun'], [/night|wind.?down|evening/, 'moon'],
  [/meditat|breath|mindful|calm/, 'wind'], [/yoga|stretch|mobility/, 'leaf'],
  [/journal|write|writing|diary/, 'pen-line'], [/plan|notes|review/, 'notebook-pen'],
  [/vitamin|med|pill|supplement/, 'pill'], [/fruit|apple|snack/, 'apple'], [/veg|salad|meal|cook|eat/, 'salad'],
  [/study|learn|course|think/, 'brain'], [/language|spanish|french|german|japanese|duolingo/, 'languages'],
  [/code|program|build/, 'code'], [/music|guitar|piano|sing|practice/, 'music'],
  [/draw|paint|sketch|art/, 'paintbrush'], [/phone|screen|social|scroll/, 'phone-off'],
  [/save|money|budget|spend/, 'piggy-bank'], [/clean|tidy|chore|dishes|laundry/, 'broom'],
  [/dog|pet/, 'dog'], [/call|friend|family|text/, 'users'], [/gratitude|thank|smile|joy/, 'smile'],
  [/plant|garden|grow/, 'sprout'], [/focus|deep work|pomodoro/, 'timer'], [/shower|skin|floss|teeth|groom/, 'shower-head'],
  [/no alcohol|sober|fire|streak/, 'flame'],
];

let dialogFor = null;       // habit id being edited, or null for new
let pickedIcon = DEFAULT_ICON;
let iconTouched = false;

function openDialog(habit) {
  dialogFor = habit?.id ?? null;
  pickedIcon = habit?.icon ?? DEFAULT_ICON;
  iconTouched = !!habit;
  $('dialog-title').textContent = habit ? 'Edit habit' : 'New habit';
  $('dialog-save').textContent = habit ? 'Save changes' : 'Add habit';
  $('habit-name').value = habit?.name ?? '';
  renderIconGrid();
  $('habit-dialog').showModal();
  $('habit-name').focus();
}

function renderIconGrid() {
  $('icon-grid').innerHTML = Object.entries(HABIT_ICONS).map(([id, inner]) =>
    `<button type="button" class="icon-opt" role="radio" data-icon="${id}" aria-label="${id.replace(/-/g, ' ')}" aria-checked="${id === pickedIcon}">${svg(inner)}</button>`
  ).join('');
}

function pickIcon(id) {
  pickedIcon = id;
  $('icon-grid').querySelectorAll('.icon-opt').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.icon === id)));
}

function suggestIcon() {
  if (iconTouched) return;
  const n = $('habit-name').value.toLowerCase();
  const hit = KEYWORDS.find(([re]) => re.test(n));
  pickIcon(hit ? hit[1] : DEFAULT_ICON);
}

function slugify(s) {
  return s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'habit';
}

function uniqueId(base) {
  const taken = new Set([...state.habits.map((h) => h.id), ...Object.keys(state.checks), undoStash?.habit.id]);
  let id = base, n = 2;
  while (taken.has(id)) id = `${base}-${n++}`;
  return id;
}

function saveDialog(e) {
  e.preventDefault();
  const name = $('habit-name').value.trim().replace(/\s+/g, ' ');
  if (!name) { $('habit-name').focus(); return; }
  if (dialogFor) {
    const h = state.habits.find((x) => x.id === dialogFor);
    if (h) { h.name = name; h.icon = pickedIcon; }
  } else {
    state.habits.push({ id: uniqueId(slugify(name)), name, icon: pickedIcon });
  }
  $('habit-dialog').close();
  renderAll();
  persist();
}

let undoStash = null;
let toastTimer = null;

function deleteHabit(id) {
  const index = state.habits.findIndex((h) => h.id === id);
  if (index < 0) return;
  const [habit] = state.habits.splice(index, 1);
  undoStash = { habit, index, checks: state.checks[id] };
  delete state.checks[id];
  renderAll();
  persist();
  showToast(`Deleted ${habit.name}`);
}

function undoDelete() {
  if (!undoStash) return;
  const { habit, index, checks } = undoStash;
  state.habits.splice(Math.min(index, state.habits.length), 0, habit);
  if (checks) state.checks[habit.id] = checks;
  undoStash = null;
  hideToast();
  renderAll();
  persist();
}

function showToast(text) {
  $('toast-text').textContent = text;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 6000);
}
function hideToast() { $('toast').hidden = true; undoStash = null; }

/* ── Gate ──────────────────────────────────────────────────── */

let setupMode = false;

async function tryRemembered() {
  try {
    const saved = JSON.parse(localStorage.getItem(REMEMBER_KEY) || 'null');
    if (!saved || !vault || saved.salt !== vault.salt) return false;
    const k = await crypto.subtle.importKey('raw', fromB64(saved.k), 'AES-GCM', true, ['encrypt', 'decrypt']);
    state = normalize(await unseal(vault, k));
    key = k; salt = vault.salt;
    return true;
  } catch {
    localStorage.removeItem(REMEMBER_KEY);
    return false;
  }
}

async function remember() {
  if (!$('remember').checked) { localStorage.removeItem(REMEMBER_KEY); return; }
  try {
    const raw = await crypto.subtle.exportKey('raw', key);
    localStorage.setItem(REMEMBER_KEY, JSON.stringify({ salt, k: toB64(raw) }));
  } catch { /* storage unavailable: just don't remember */ }
}

function gateError(msg) {
  $('gate-error').textContent = msg;
  const f = $('gate-form');
  f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
}

async function onGateSubmit(e) {
  e.preventDefault();
  const pass = $('pass').value;
  const btn = $('unlock');
  $('gate-error').textContent = '';

  if (setupMode) {
    if (pass.length < 6) return gateError('Use at least 6 characters.');
    if (pass !== $('pass2').value) return gateError('The two passphrases don’t match.');
  } else if (!pass) {
    return gateError('Enter your passphrase.');
  }

  btn.disabled = true;
  btn.textContent = setupMode ? 'Creating…' : 'Unlocking…';
  try {
    if (setupMode) {
      const s = crypto.getRandomValues(new Uint8Array(16));
      salt = toB64(s);
      key = await deriveKey(pass, s);
      state = { habits: [], checks: {} };
      await remember();
      enterApp();
      persist();
    } else {
      const k = await deriveKey(pass, fromB64(vault.salt));
      try { state = normalize(await unseal(vault, k)); }
      catch { throw new Error('wrong'); }
      key = k; salt = vault.salt;
      await remember();
      enterApp();
    }
  } catch (err) {
    btn.disabled = false;
    btn.textContent = setupMode ? 'Create' : 'Unlock';
    if (err.message === 'wrong') { gateError('That passphrase doesn’t match.'); $('pass').select(); }
    else { console.error(err); gateError('Something went wrong unlocking. Check the console.'); }
  }
}

function enterApp() {
  $('pass').value = '';
  $('pass2').value = '';
  $('gate').hidden = true;
  els.app.hidden = false;
  els.app.classList.add('enter');
  renderAll();
  startClock();
}

/* ── Live updates: midnight rollover, other devices ────────── */

function startClock() {
  let day = iso(noonToday());
  setInterval(() => {
    const now = iso(noonToday());
    if (now !== day) { day = now; renderAll(); }
  }, 30000);

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible' || !key) return;
    if (iso(noonToday()) !== day) { day = iso(noonToday()); renderAll(); }
    if (mode !== 'sync' || saving) return;
    try {
      const fresh = await store.get(VAULT_KEY);
      if (isVault(fresh) && fresh.ct !== vault?.ct && fresh.salt === salt) {
        state = normalize(await unseal(fresh, key));
        vault = fresh;
        renderAll();
      }
    } catch (err) { console.warn('[habits] Refresh failed', err); }
  });
}

/* ── Boot ──────────────────────────────────────────────────── */

async function boot() {
  Object.assign(els, {
    app: $('app'), habits: $('habits'), empty: $('empty'), weekHead: $('week-head'),
    headDays: $('head-days'), weekLabel: $('week-label'), nextWeek: $('next-week'),
  });

  $('prev-week').innerHTML = svg(UI_ICONS['chevron-left']);
  $('next-week').innerHTML = svg(UI_ICONS['chevron-right']);
  document.querySelector('.add-icon').innerHTML = svg(UI_ICONS.plus);

  $('gate-form').addEventListener('submit', onGateSubmit);
  $('prev-week').addEventListener('click', () => { weekOffset--; renderWeek(); renderHabits(); });
  $('next-week').addEventListener('click', () => { if (weekOffset < 0) { weekOffset++; renderWeek(); renderHabits(); } });
  els.weekLabel.addEventListener('click', () => { weekOffset = 0; renderWeek(); renderHabits(); });
  $('edit-toggle').addEventListener('click', (e) => {
    editing = !editing;
    e.currentTarget.textContent = editing ? 'Done' : 'Edit';
    e.currentTarget.setAttribute('aria-pressed', String(editing));
    renderHabits();
  });
  $('add-habit').addEventListener('click', () => openDialog(null));
  $('lock').addEventListener('click', () => { localStorage.removeItem(REMEMBER_KEY); location.reload(); });

  els.habits.addEventListener('change', onDotChange);
  els.habits.addEventListener('pointerdown', startDrag);
  els.habits.addEventListener('keydown', onHandleKey);
  els.habits.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.closest('.habit').dataset.id;
    if (btn.dataset.action === 'delete') deleteHabit(id);
    if (btn.dataset.action === 'edit') openDialog(state.habits.find((h) => h.id === id));
  });

  $('habit-form').addEventListener('submit', saveDialog);
  $('dialog-cancel').addEventListener('click', () => $('habit-dialog').close());
  $('habit-name').addEventListener('input', suggestIcon);
  $('icon-grid').addEventListener('click', (e) => {
    const b = e.target.closest('.icon-opt');
    if (b) { iconTouched = true; pickIcon(b.dataset.icon); }
  });
  $('toast-undo').addEventListener('click', undoDelete);

  // Connect first — the gate stays up until the vault is unlocked.
  await connect();
  setSync(mode);

  try { const v = await store.get(VAULT_KEY); vault = isVault(v) ? v : null; }
  catch (err) { console.warn('[habits] Could not read vault', err); vault = null; }

  if (vault && await tryRemembered()) { enterApp(); return; }

  setupMode = !vault;
  $('gate-hint').textContent = setupMode
    ? 'Choose a passphrase. It encrypts your habits and can’t be recovered.'
    : 'Enter your passphrase.';
  $('confirm-wrap').hidden = !setupMode;
  $('unlock').textContent = setupMode ? 'Create' : 'Unlock';
  $('pass').autocomplete = setupMode ? 'new-password' : 'current-password';
  $('pass').disabled = false;
  $('unlock').disabled = false;
  $('pass').focus();
}

boot();
