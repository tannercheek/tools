/* ==========================================================================
   Daily Flow
   Persistence: shared Firestore sync module, with a localStorage fallback.
   ========================================================================== */

const DOC_ID     = "daily-flow";        // unique per tool
const CACHE_KEY  = "dailyFlow.cache";   // local mirror + standalone fallback
const VIEW_KEY   = "dailyFlow.view";    // which day is open (per-device, not synced)
const LEGACY_KEYS = ["dailyFlow.v2", "dailyFlow.v1"];

// Add a type here plus a matching --type-KEY / .block-KEY rule in styles.css.
const BLOCK_TYPES = [
  { key: "work",    label: "Work" },
  { key: "lunch",   label: "Lunch" },
  { key: "workout", label: "Workout" },
  { key: "chores",  label: "Chores" },
  { key: "admin",   label: "Admin" },
  { key: "free",    label: "Free Time" }
];

const uid = () => "id-" + Math.random().toString(36).slice(2, 10);

/* --------------------------------------------------------------------------
   Store: synced when the shared module loads, local when it doesn't.
   -------------------------------------------------------------------------- */
async function createStore(docId){
  try {
    // Path assumes tools/daily-flow/index.html — use '../shared/persist.js'
    // if this ends up as a flat file directly in tools/.
    const mod = await import("../../shared/persist.js");
    const remote = await mod.syncedState(docId);
    return {
      mode: "synced",
      async get(key){ return await remote.get(key); },
      async set(key, value){
        await remote.set(key, value);
        // keep a local mirror so a later offline load still has the data
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ [key]: value })); } catch {}
      }
    };
  } catch (err) {
    console.warn("[daily-flow] sync unavailable, falling back to localStorage:", err);
    return {
      mode: "local",
      reason: err,
      async get(key){
        try {
          const raw = localStorage.getItem(CACHE_KEY);
          return raw ? JSON.parse(raw)[key] ?? null : null;
        } catch { return null; }
      },
      async set(key, value){
        try {
          const raw = localStorage.getItem(CACHE_KEY);
          const bag = raw ? JSON.parse(raw) : {};
          bag[key] = value;
          localStorage.setItem(CACHE_KEY, JSON.stringify(bag));
        } catch {}
      }
    };
  }
}

/* --------------------------------------------------------------------------
   Default + starter content
   -------------------------------------------------------------------------- */
function starterDay(name = "New Day"){
  return {
    id: uid(), name, detail: "",
    morning: [
      { id: uid(), text: "Wake up", done: false, detail: "" },
      { id: uid(), text: "Breakfast", done: false, detail: "" }
    ],
    midday: [
      { id: uid(), type: "work", detail: "" }
    ],
    night: [
      { id: uid(), text: "Dinner", done: false, detail: "" },
      { id: uid(), text: "Bed", done: false, detail: "" }
    ]
  };
}

function defaultWorkDay(){
  return {
    id: uid(), name: "Work Day", detail: "",
    morning: [
      { id: uid(), text: "Wake + bathroom", done: false, detail: "" },
      { id: uid(), text: "Breakfast + coffee", done: false, detail: "" },
      { id: uid(), text: "Increase intelligence", done: false, detail: "15–20m · podcast / course / doc" }
    ],
    midday: [
      { id: uid(), type: "work", detail: "" },
      { id: uid(), type: "lunch", detail: "30–45m" },
      { id: uid(), type: "work", detail: "" },
      { id: uid(), type: "workout", detail: "Stretch, then run/lift/climb/rest · 45–60m, 1–2h climb days" }
    ],
    night: [
      { id: uid(), text: "Cook dinner", done: false, detail: "" },
      { id: uid(), text: "Dinner", done: false, detail: "" },
      { id: uid(), text: "Family time", done: false, detail: "bath · play · bedtime, ~6–9:30p" },
      { id: uid(), text: "Late free time", done: false, detail: "games · music · side-hustles" },
      { id: uid(), text: "Read", done: false, detail: "" },
      { id: uid(), text: "Bed", done: false, detail: "" }
    ]
  };
}

/* Pull forward data saved by the earlier single-file versions. */
function migrateLegacy(){
  for (const key of LEGACY_KEYS){
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const old = JSON.parse(raw);
      if (old?.days?.length) return old.days;                 // v2: multi-day
      if (old?.morning || old?.midday || old?.night){         // v1: single day
        return [{
          id: uid(), name: "Work Day", detail: "",
          morning: old.morning || [], midday: old.midday || [], night: old.night || []
        }];
      }
    } catch {}
  }
  return null;
}

/* --------------------------------------------------------------------------
   App
   -------------------------------------------------------------------------- */
let store;
let days = [];
let currentIndex = 0;

const el = id => document.getElementById(id);
const listMorning = el("list-morning");
const listMidday  = el("list-midday");
const listNight   = el("list-night");
const titleEl      = el("day-title");
const detailWrapEl = el("day-detail-wrap");
const countEl      = el("day-count");
const jumpMenuEl   = el("day-jump-menu");
const statusEl     = el("sync-status");
const prevBtn = el("prev-day"), nextBtn = el("next-day");
const newBtn  = el("new-day"),  dupBtn  = el("dup-day"), delBtn = el("del-day");

const day = () => days[currentIndex];
const typeLabel = key => BLOCK_TYPES.find(t => t.key === key)?.label ?? key;

/* Debounced write — edits are frequent, writes shouldn't be. */
let saveTimer = null;
function save(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await store.set("days", days);
      setStatus(store.mode);
    } catch (err) {
      console.error("[daily-flow] save failed:", err);
      setStatus("error");
    }
  }, 400);
}

function saveView(){
  try { localStorage.setItem(VIEW_KEY, String(currentIndex)); } catch {}
}

function setStatus(mode){
  statusEl.classList.toggle("error", mode === "error");
  statusEl.textContent =
    mode === "synced" ? "Synced" :
    mode === "local"  ? "Saved on this device" :
                        "Not saved — check connection";
}

function cloneDay(src, newName){
  const copy = structuredClone(src);
  copy.id = uid();
  copy.name = newName;
  for (const key of ["morning", "midday", "night"]){
    for (const entry of copy[key] ?? []){
      entry.id = uid();
      if ("done" in entry) entry.done = false;
    }
  }
  return copy;
}

/* ---------- optional detail line (shared by items, blocks, and the day) ---------- */
function renderDetail(wrap, obj, onSave = save){
  wrap.replaceChildren();
  if (obj.detail){
    const d = document.createElement("div");
    d.className = "item-detail";
    d.textContent = obj.detail;
    d.title = "Click to edit";
    d.addEventListener("click", () => showDetailInput(wrap, obj, onSave));
    wrap.appendChild(d);
  } else {
    const btn = document.createElement("button");
    btn.className = "detail-add";
    btn.type = "button";
    btn.textContent = "+ add detail";
    btn.addEventListener("click", () => showDetailInput(wrap, obj, onSave));
    wrap.appendChild(btn);
  }
}

function showDetailInput(wrap, obj, onSave){
  wrap.replaceChildren();
  const input = document.createElement("input");
  input.className = "detail-input";
  input.type = "text";
  input.placeholder = "Add detail…";
  input.value = obj.detail || "";
  const commit = () => {
    obj.detail = input.value.trim();
    onSave();
    renderDetail(wrap, obj, onSave);
  };
  input.addEventListener("blur", commit);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") input.blur();
    if (e.key === "Escape") renderDetail(wrap, obj, onSave);
  });
  wrap.appendChild(input);
  input.focus();
}

/* ---------- checklist rows ---------- */
function createItemRow(item, arr, listEl){
  const li = document.createElement("li");
  li.className = "item" + (item.done ? " done" : "");
  li.dataset.id = item.id;

  const handle = document.createElement("span");
  handle.className = "drag-handle";
  handle.textContent = "⠿";
  li.appendChild(handle);

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "item-check";
  checkbox.checked = !!item.done;
  checkbox.addEventListener("change", () => {
    item.done = checkbox.checked;
    li.classList.toggle("done", item.done);
    save();
  });
  li.appendChild(checkbox);

  const body = document.createElement("div");
  body.className = "item-body";

  const textEl = document.createElement("div");
  textEl.className = "item-text";
  textEl.textContent = item.text;
  body.appendChild(textEl);

  const detailWrap = document.createElement("div");
  renderDetail(detailWrap, item);
  body.appendChild(detailWrap);
  li.appendChild(body);

  const del = document.createElement("button");
  del.className = "item-delete";
  del.type = "button";
  del.setAttribute("aria-label", "Delete item");
  del.textContent = "×";
  del.addEventListener("click", () => {
    const idx = arr.indexOf(item);
    if (idx > -1) arr.splice(idx, 1);
    save();
    renderItemList(listEl, arr);
  });
  li.appendChild(del);

  return li;
}

function renderItemList(listEl, arr){
  listEl.replaceChildren();
  if (!arr.length){
    const empty = document.createElement("li");
    empty.className = "empty-hint";
    empty.textContent = "Nothing yet — add one below.";
    listEl.appendChild(empty);
    return;
  }
  for (const item of arr) listEl.appendChild(createItemRow(item, arr, listEl));
}

/* ---------- midday block cards ---------- */
function createBlockRow(block, arr, listEl){
  const li = document.createElement("li");
  li.className = `block block-${block.type}`;
  li.dataset.id = block.id;

  const handle = document.createElement("span");
  handle.className = "drag-handle";
  handle.textContent = "⠿";
  li.appendChild(handle);

  const body = document.createElement("div");
  body.className = "block-body";

  const nameEl = document.createElement("div");
  nameEl.className = "block-name";
  nameEl.textContent = typeLabel(block.type);
  body.appendChild(nameEl);

  const detailWrap = document.createElement("div");
  renderDetail(detailWrap, block);
  body.appendChild(detailWrap);
  li.appendChild(body);

  const del = document.createElement("button");
  del.className = "block-delete";
  del.type = "button";
  del.setAttribute("aria-label", "Delete block");
  del.textContent = "×";
  del.addEventListener("click", () => {
    const idx = arr.indexOf(block);
    if (idx > -1) arr.splice(idx, 1);
    save();
    renderBlockList(listEl, arr);
  });
  li.appendChild(del);

  return li;
}

function renderBlockList(listEl, arr){
  listEl.replaceChildren();
  if (!arr.length){
    const empty = document.createElement("li");
    empty.className = "empty-hint";
    empty.textContent = "No blocks yet — add one below.";
    listEl.appendChild(empty);
    return;
  }
  for (const block of arr) listEl.appendChild(createBlockRow(block, arr, listEl));
}

/* ---------- drag to reorder (mouse + touch) ----------
   Reorder is applied by element id, never by index, so the saved
   state stays correct no matter how rows move.                       */
function enableSortable(containerEl, getArr){
  containerEl.addEventListener("pointerdown", e => {
    const handle = e.target.closest(".drag-handle");
    if (!handle) return;
    const li = handle.closest("li");
    if (!li || !containerEl.contains(li)) return;
    e.preventDefault();

    li.classList.add("dragging");
    try { li.setPointerCapture(e.pointerId); } catch {}

    const onMove = ev => {
      const siblings = [...containerEl.children]
        .filter(c => c !== li && c.tagName === "LI" && c.dataset.id);
      const target = siblings.find(s => {
        const r = s.getBoundingClientRect();
        return ev.clientY < r.top + r.height / 2;
      });
      if (target) containerEl.insertBefore(li, target);
      else containerEl.appendChild(li);
    };

    const onUp = () => {
      li.classList.remove("dragging");
      try { li.releasePointerCapture(e.pointerId); } catch {}
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);

      const order = [...containerEl.querySelectorAll("li")]
        .map(x => x.dataset.id).filter(Boolean);
      getArr().sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      save();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  });
}

function wireAddRow(inputEl, buttonEl, getArr, listEl){
  const commit = () => {
    const val = inputEl.value.trim();
    if (!val) return;
    const arr = getArr();
    arr.push({ id: uid(), text: val, done: false, detail: "" });
    save();
    renderItemList(listEl, arr);
    inputEl.value = "";
    inputEl.focus();
  };
  buttonEl.addEventListener("click", commit);
  inputEl.addEventListener("keydown", e => { if (e.key === "Enter") commit(); });
}

/* ---------- day header ---------- */
function renderDayDetail(){
  detailWrapEl.replaceChildren();
  const d = day();
  if (d.detail){
    const div = document.createElement("div");
    div.className = "day-detail";
    div.textContent = d.detail;
    div.title = "Click to edit";
    div.addEventListener("click", showDayDetailInput);
    detailWrapEl.appendChild(div);
  } else {
    const btn = document.createElement("button");
    btn.className = "day-detail";
    btn.type = "button";
    btn.textContent = "+ add detail";
    btn.addEventListener("click", showDayDetailInput);
    detailWrapEl.appendChild(btn);
  }
}

function showDayDetailInput(){
  detailWrapEl.replaceChildren();
  const input = document.createElement("input");
  input.className = "day-detail-input";
  input.type = "text";
  input.placeholder = "Add detail…";
  input.value = day().detail || "";
  const commit = () => {
    day().detail = input.value.trim();
    save();
    renderDayDetail();
  };
  input.addEventListener("blur", commit);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") input.blur();
    if (e.key === "Escape") renderDayDetail();
  });
  detailWrapEl.appendChild(input);
  input.focus();
  input.select();
}

function startRenameDay(){
  const nav = titleEl.parentNode;
  const input = document.createElement("input");
  input.className = "day-title-input";
  input.type = "text";
  input.value = day().name;
  const commit = () => {
    day().name = input.value.trim() || "Untitled Day";
    save();
    if (input.parentNode) nav.replaceChild(titleEl, input);
    renderHeader();
  };
  input.addEventListener("blur", commit);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") input.blur();
    if (e.key === "Escape"){ input.value = day().name; input.blur(); }
  });
  nav.replaceChild(input, titleEl);
  input.focus();
  input.select();
}

/* ---------- jump-to-day menu ---------- */
function closeJumpMenu(){
  jumpMenuEl.hidden = true;
  countEl.setAttribute("aria-expanded", "false");
  document.removeEventListener("click", onJumpOutsideClick);
  document.removeEventListener("keydown", onJumpKeydown);
}

function openJumpMenu(){
  jumpMenuEl.replaceChildren();
  days.forEach((d, i) => {
    const btn = document.createElement("button");
    btn.className = "day-jump-item" + (i === currentIndex ? " current" : "");
    btn.type = "button";
    btn.textContent = `${i + 1}. ${d.name}`;
    btn.title = d.name;
    btn.addEventListener("click", () => {
      currentIndex = i;
      saveView();
      renderAll();
      countEl.focus();
    });
    jumpMenuEl.appendChild(btn);
  });
  jumpMenuEl.hidden = false;
  countEl.setAttribute("aria-expanded", "true");
  document.addEventListener("click", onJumpOutsideClick);
  document.addEventListener("keydown", onJumpKeydown);
  jumpMenuEl.children[currentIndex]?.scrollIntoView({ block: "nearest" });
}

function onJumpOutsideClick(e){
  if (!jumpMenuEl.contains(e.target) && !countEl.contains(e.target)) closeJumpMenu();
}

function onJumpKeydown(e){
  if (e.key === "Escape"){
    closeJumpMenu();
    countEl.focus();
    return;
  }
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  e.preventDefault();
  const items = [...jumpMenuEl.children];
  const at = items.indexOf(document.activeElement);
  const step = e.key === "ArrowDown" ? 1 : -1;
  const next = at === -1 ? (step === 1 ? 0 : items.length - 1)
                         : (at + step + items.length) % items.length;
  items[next]?.focus();
}

function renderHeader(){
  titleEl.textContent = day().name;
  renderDayDetail();
  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex === days.length - 1;
  delBtn.disabled  = days.length <= 1;
  countEl.textContent = days.length > 1 ? `${currentIndex + 1} of ${days.length}` : "";
  countEl.hidden = days.length <= 1;
  closeJumpMenu();
}

function renderAll(){
  renderHeader();
  renderItemList(listMorning, day().morning);
  renderBlockList(listMidday, day().midday);
  renderItemList(listNight, day().night);
}

/* --------------------------------------------------------------------------
   Init
   -------------------------------------------------------------------------- */
async function init(){
  statusEl.textContent = "Loading…";
  store = await createStore(DOC_ID);

  let saved = null;
  try { saved = await store.get("days"); }
  catch (err){ console.error("[daily-flow] load failed:", err); }

  if (Array.isArray(saved) && saved.length){
    days = saved;
  } else {
    const legacy = migrateLegacy();
    days = legacy ?? [defaultWorkDay()];
    try { await store.set("days", days); } catch {}
  }

  const savedIndex = parseInt(localStorage.getItem(VIEW_KEY) ?? "0", 10);
  currentIndex = Number.isInteger(savedIndex) && savedIndex < days.length ? savedIndex : 0;

  setStatus(store.mode);
  renderAll();

  titleEl.addEventListener("click", startRenameDay);

  countEl.addEventListener("click", () => {
    if (jumpMenuEl.hidden) openJumpMenu(); else closeJumpMenu();
  });

  prevBtn.addEventListener("click", () => {
    if (currentIndex > 0){ currentIndex--; saveView(); renderAll(); }
  });
  nextBtn.addEventListener("click", () => {
    if (currentIndex < days.length - 1){ currentIndex++; saveView(); renderAll(); }
  });
  newBtn.addEventListener("click", () => {
    days.splice(currentIndex + 1, 0, starterDay());
    currentIndex++;
    save(); saveView(); renderAll(); startRenameDay();
  });
  dupBtn.addEventListener("click", () => {
    days.splice(currentIndex + 1, 0, cloneDay(day(), `${day().name} copy`));
    currentIndex++;
    save(); saveView(); renderAll(); startRenameDay();
  });
  delBtn.addEventListener("click", () => {
    if (days.length <= 1) return;
    if (!confirm(`Delete “${day().name}”? This can’t be undone.`)) return;
    days.splice(currentIndex, 1);
    if (currentIndex >= days.length) currentIndex = days.length - 1;
    save(); saveView(); renderAll();
  });

  enableSortable(listMorning, () => day().morning);
  enableSortable(listMidday,  () => day().midday);
  enableSortable(listNight,   () => day().night);

  wireAddRow(el("input-morning"), el("add-morning"), () => day().morning, listMorning);
  wireAddRow(el("input-night"),   el("add-night"),   () => day().night,   listNight);

  const picker = el("type-picker");
  for (const t of BLOCK_TYPES){
    const btn = document.createElement("button");
    btn.className = "type-btn";
    btn.type = "button";
    btn.textContent = t.label;
    btn.addEventListener("click", () => {
      day().midday.push({ id: uid(), type: t.key, detail: "" });
      save();
      renderBlockList(listMidday, day().midday);
    });
    picker.appendChild(btn);
  }
}

init();
