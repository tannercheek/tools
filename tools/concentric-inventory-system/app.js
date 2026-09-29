/* ==========================================================================
   Concentric Inventory System
   You sit at the centre. Each ring outward holds things that live one step
   further from you — from what's in your pockets to what's in storage.
   Persistence: shared Firestore sync module, with a localStorage fallback.
   ========================================================================== */

const DOC_ID = "concentric-inventory";
// Same key persist.js mirrors to, so local-only and synced modes share one copy.
const LOCAL_KEY = `toolState:${DOC_ID}`;

// Innermost first. Ids are persistence keys — names and hints can be
// renamed in the app (click a ring's label), but keep ids stable.
const RINGS = [
  { id: "on-me",   name: "on me",     hint: "pockets, wrist — always with you" },
  { id: "daily",   name: "daily bag", hint: "leaves the house with you most days" },
  { id: "go-bag",  name: "go bag",    hint: "packed and waiting by the door" },
  { id: "travel",  name: "travel",    hint: "comes out when you go away" },
  { id: "home",    name: "home",      hint: "used at base, never carried" },
  { id: "storage", name: "storage",   hint: "boxed, seasonal, rarely touched" },
];

// Emoji + the words that should suggest it. First match wins, so put the
// more specific entries higher up.
const EMOJI = [
  ["🔑", "key keys keyring keychain house"],
  ["💳", "wallet card cards credit debit bank"],
  ["👛", "purse wallet coin pouch"],
  ["🪪", "id license licence identification badge"],
  ["🛂", "passport visa"],
  ["📱", "phone iphone mobile cell smartphone"],
  ["⌚", "watch smartwatch"],
  ["🎧", "headphones earbuds airpods earphones audio"],
  ["🕶️", "sunglasses shades sunnies"],
  ["👓", "glasses spectacles reading"],
  ["🖊️", "pen pens"],
  ["✏️", "pencil pencils"],
  ["📓", "notebook journal notepad notes"],
  ["🔦", "flashlight torch light headlamp"],
  ["🔪", "knife blade"],
  ["🛠️", "multitool leatherman tool tools"],
  ["🔋", "battery batteries powerbank power"],
  ["🔌", "cable cables charger plug adapter usb cord"],
  ["💻", "laptop macbook computer"],
  ["📷", "camera"],
  ["🎒", "backpack bag rucksack daypack pack"],
  ["🧳", "luggage suitcase carryon duffel"],
  ["💊", "meds medicine pills ibuprofen vitamins advil tylenol"],
  ["🩹", "bandage bandaid plaster firstaid first aid"],
  ["🧴", "sunscreen lotion shampoo moisturiser moisturizer toiletries"],
  ["🪥", "toothbrush toothpaste floss dental"],
  ["🪒", "razor shaver shaving"],
  ["🧼", "soap handwash"],
  ["🧻", "tissue tissues toilet paper"],
  ["💧", "water hydration"],
  ["🥤", "bottle tumbler cup flask"],
  ["☕", "coffee mug thermos"],
  ["🍫", "snack snacks chocolate bar"],
  ["☂️", "umbrella rain"],
  ["🧥", "jacket coat shell raincoat parka hoodie"],
  ["🧢", "cap hat beanie"],
  ["🧤", "gloves mittens"],
  ["🧣", "scarf"],
  ["👟", "shoes sneakers trainers runners"],
  ["🥾", "boots hiking"],
  ["👕", "shirt tshirt tee clothes clothing"],
  ["👖", "jeans pants trousers"],
  ["🩳", "shorts swimsuit trunks"],
  ["🧦", "socks"],
  ["😷", "mask"],
  ["💍", "ring jewelry jewellery"],
  ["📿", "necklace beads bracelet"],
  ["🗺️", "map maps"],
  ["🧭", "compass navigation"],
  ["⛺", "tent camping shelter"],
  ["🛏️", "sleeping bed pillow blanket"],
  ["🔥", "lighter matches firestarter fire"],
  ["🪢", "rope cord paracord"],
  ["📻", "radio"],
  ["🧯", "extinguisher"],
  ["🧰", "toolbox kit"],
  ["🔧", "wrench spanner"],
  ["🔨", "hammer"],
  ["🪛", "screwdriver"],
  ["✂️", "scissors"],
  ["🧵", "sewing thread needle"],
  ["🔒", "lock padlock"],
  ["📄", "documents document papers paperwork"],
  ["📁", "files folder"],
  ["💵", "cash money"],
  ["🪙", "coins"],
  ["📚", "books library"],
  ["📖", "book kindle reader ereader"],
  ["🎸", "guitar bass"],
  ["🎹", "piano synth"],
  ["🎮", "console controller switch playstation xbox game games"],
  ["⌨️", "keyboard"],
  ["🖱️", "mouse trackpad"],
  ["🖥️", "monitor desktop display screen"],
  ["💾", "drive ssd harddrive backup"],
  ["🚲", "bike bicycle"],
  ["🛹", "skateboard"],
  ["🎿", "ski skis"],
  ["🏂", "snowboard"],
  ["🧗", "climbing harness chalk"],
  ["🏋️", "weights gym dumbbell kettlebell"],
  ["🧘", "yoga mat"],
  ["🍳", "pan pot cooking kitchen stove"],
  ["🎄", "christmas decorations holiday ornaments"],
  ["🪴", "plant plants"],
  ["🖼️", "art picture frame print poster"],
  ["🧸", "toy toys teddy"],
  ["🐕", "dog leash"],
  ["🚗", "car"],
  ["📦", "box stuff misc spare"],
];

const DEFAULT_PALETTE = ["🔑", "👛", "📱", "⌚", "🎧", "🕶️", "🖊️", "🔦", "🔋", "💻", "📷", "💊", "🧴", "🧥", "👟", "⛺", "🧰", "📚", "🎸", "📦"];
const PALETTE_SIZE = 18;
const FALLBACK_EMOJI = "📦";

const TAU = Math.PI * 2;
const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const uid = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 12);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const norm360 = (deg) => ((deg % 360) + 360) % 360;
const touchFirst = matchMedia("(hover: none)").matches;

function firstGrapheme(s) {
  s = String(s).trim();
  if (!s) return "";
  if (Intl.Segmenter) return new Intl.Segmenter().segment(s)[Symbol.iterator]().next().value.segment;
  return Array.from(s)[0];
}

// Emoji whose keywords match the words in a name, best guess first.
function suggest(name) {
  const words = name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1);
  const hits = [];
  for (const w of words) {
    const stem = w.replace(/e?s$/, "");
    for (const [emoji, keywords] of EMOJI) {
      if (keywords.split(" ").some((k) => k === w || k === stem || (w.length > 2 && k.startsWith(w)))) hits.push(emoji);
    }
  }
  return [...new Set(hits)];
}

/* --------------------------------------------------------------------------
   Store: local first so the rings draw instantly, upgraded to synced when
   the shared module connects.
   -------------------------------------------------------------------------- */

function localStore() {
  let data = {};
  try { data = JSON.parse(localStorage.getItem(LOCAL_KEY)) || {}; } catch {}
  return {
    get: (key) => data[key],
    set(key, value) {
      data[key] = value;
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(data)); } catch {}
    },
  };
}

let store = localStore();
let editedBeforeSync = false;

let items = [];   // { id, emoji, name, note, ring, angle, added } — angle in degrees, 0 = 12 o'clock, clockwise
let ringMeta = {}; // ring id → { name, hint } overrides

function load() {
  const raw = store.get("items");
  items = (Array.isArray(raw) ? raw : [])
    .filter((it) => it && typeof it.id === "string" && typeof it.name === "string")
    .map((it) => ({
      id: it.id,
      name: it.name.slice(0, 60),
      note: typeof it.note === "string" ? it.note : "",
      emoji: typeof it.emoji === "string" && it.emoji ? it.emoji : FALLBACK_EMOJI,
      ring: RINGS.some((r) => r.id === it.ring) ? it.ring : RINGS[RINGS.length - 1].id,
      angle: Number.isFinite(it.angle) ? norm360(it.angle) : Math.random() * 360,
      added: it.added || 0,
    }));
  const meta = store.get("rings");
  ringMeta = meta && typeof meta === "object" ? meta : {};
}

function saveItems() { store.set("items", items); editedBeforeSync = true; }
function saveRings() { store.set("rings", ringMeta); editedBeforeSync = true; }

async function connect() {
  showStatus("local");
  try {
    const mod = await import("../../shared/persist.js");
    const remote = await Promise.race([
      mod.syncedState(DOC_ID),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timed out")), 15000)),
    ]);
    store = remote;
    if (editedBeforeSync) {
      // Changes made while connecting win over whatever was remote.
      remote.set("items", items);
      remote.set("rings", ringMeta);
    } else {
      load();
      render();
    }
    remote.onStatus(showStatus);
  } catch (err) {
    console.warn("[concentric-inventory] sync unavailable, staying on this device:", err);
    showStatus("local");
  }
}

function showStatus(status) {
  const [text, cls] = {
    synced: ["synced", "ok"],
    "saved-locally": ["saving…", ""],
    offline: ["offline", "warn"],
  }[status] || ["this device", ""];
  const el = $("sync");
  el.textContent = text;
  el.className = `sync ${cls}`;
}

const byId = (id) => items.find((it) => it.id === id);
const ringIndex = (id) => Math.max(0, RINGS.findIndex((r) => r.id === id));
const ringName = (i) => ringMeta[RINGS[i].id]?.name || RINGS[i].name;
const ringHint = (i) => ringMeta[RINGS[i].id]?.hint ?? RINGS[i].hint;

/* --------------------------------------------------------------------------
   Geometry — everything is drawn in stage pixels, recomputed on resize.
   -------------------------------------------------------------------------- */

const stageBox = $("stage-box");
const stage = $("stage");
const svg = $("rings");
const layer = $("items");

let geo = null;

function measure() {
  const box = stageBox.getBoundingClientRect();
  const size = Math.max(260, Math.floor(Math.min(box.width - 32, box.height - 8)));
  stage.style.width = stage.style.height = `${size}px`;
  const c = size / 2;
  const outer = c - 12;
  const core = Math.max(28, size * 0.08);
  geo = { size, c, outer, core, band: (outer - core) / RINGS.length };
}

const ringInner = (i) => geo.core + geo.band * i;
const ringOuter = (i) => geo.core + geo.band * (i + 1);
const ringMid = (i) => geo.core + geo.band * (i + 0.5);
const itemSize = () => clamp(geo.band * 0.6, 14, 30);

function toPolar(clientX, clientY) {
  const b = stage.getBoundingClientRect();
  const dx = clientX - b.left - geo.c;
  const dy = clientY - b.top - geo.c;
  return { r: Math.hypot(dx, dy), deg: norm360((Math.atan2(dx, -dy) * 180) / Math.PI) };
}

function fromPolar(r, deg) {
  const a = (deg * Math.PI) / 180;
  return { x: geo.c + r * Math.sin(a), y: geo.c - r * Math.cos(a) };
}

// Ring under a stage radius: -1 for the centre ("me"), null outside the rings.
function ringAt(r, slack = 0) {
  if (r > geo.outer + slack) return null;
  if (r <= geo.core) return -1;
  return Math.min(RINGS.length - 1, Math.floor((r - geo.core) / geo.band));
}

// Middle of the widest empty stretch of a ring — where a new item fits best.
function openAngle(i, skipId) {
  const angles = items
    .filter((it) => ringIndex(it.ring) === i && it.id !== skipId)
    .map((it) => it.angle)
    .sort((a, b) => a - b);
  if (!angles.length) return (45 + i * 55) % 360;
  let best = -1, at = 0;
  angles.forEach((a, k) => {
    const next = k + 1 < angles.length ? angles[k + 1] : angles[0] + 360;
    if (next - a > best) { best = next - a; at = a + (next - a) / 2; }
  });
  return norm360(at);
}

// Nudge sorted angles (radians) apart until neighbours are at least `gap`
// apart, keeping each as close to where it was placed as possible.
function relax(angles, gap) {
  const n = angles.length;
  if (n < 2) return angles.slice();
  if (n * gap >= TAU * 0.94) return angles.map((_, k) => angles[0] + (k * TAU) / n);
  const a = angles.slice();
  for (let pass = 0; pass < 120; pass++) {
    let moved = false;
    for (let k = 0; k < n; k++) {
      const j = (k + 1) % n;
      const d = a[j] - a[k] + (j === 0 ? TAU : 0);
      if (d < gap - 1e-4) {
        const push = (gap - d) / 2;
        a[k] -= push;
        a[j] += push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return a;
}

function layoutRing(i) {
  const list = items.filter((it) => ringIndex(it.ring) === i).sort((a, b) => a.angle - b.angle);
  const n = list.length;
  if (!n) return [];

  const rMid = ringMid(i);
  const circ = TAU * rMid;
  const base = itemSize();
  let size = Math.min(base, circ / n / 1.25);
  let spacing = size * 1.25;
  let tracks = 1;
  if (size < Math.min(base, 18)) {
    // Crowded: stagger onto two tracks so neighbours can overlap in angle.
    tracks = 2;
    size = clamp(Math.min(geo.band * 0.44, circ / n / 0.7), 10, base);
    spacing = size * 0.7;
  }

  const angles = relax(list.map((it) => (it.angle * Math.PI) / 180), spacing / rMid);
  return list.map((item, k) => {
    const r = tracks === 1 ? rMid : rMid + (k % 2 ? 1 : -1) * geo.band * 0.23;
    return { item, size, x: geo.c + r * Math.sin(angles[k]), y: geo.c - r * Math.cos(angles[k]) };
  });
}

/* --------------------------------------------------------------------------
   Render
   -------------------------------------------------------------------------- */

let hot = null;           // ring index currently highlighted
let justAdded = null;     // id to animate in on next render
const nodes = new Map();  // item id → element

function render() {
  if (!geo) return;
  drawRings();
  drawItems();
  if (sheet?.mode === "add") placeGhost();

  const n = items.length;
  $("count").textContent = n ? `${n} item${n === 1 ? "" : "s"}` : "empty";
  stage.classList.toggle("is-empty", n === 0);
  const tap = touchFirst ? "tap" : "click";
  $("hint").textContent = n
    ? `${tap} a ring to add · drag to move · ${tap} a ring's name to rename it`
    : `Start with what's on you right now — ${tap} the innermost ring.`;
}

function annulus(r0, r1) {
  const { c } = geo;
  const circle = (r) => `M ${c + r} ${c} A ${r} ${r} 0 1 1 ${c - r} ${c} A ${r} ${r} 0 1 1 ${c + r} ${c} Z`;
  return `${circle(r1)} ${circle(r0)}`;
}

function drawRings() {
  const { size, c, core } = geo;
  const counts = RINGS.map(() => 0);
  items.forEach((it) => counts[ringIndex(it.ring)]++);

  let paths = "", bands = "", lines = "", knock = "", labels = "";
  RINGS.forEach((_, i) => {
    const r1 = ringOuter(i);
    const last = i === RINGS.length - 1;
    bands += `<path class="band${hot === i ? " hot" : ""}" data-ring="${i}" style="--d:${i}" fill-rule="evenodd" d="${annulus(ringInner(i), r1)}"/>`;
    lines += `<circle class="line${last ? " edge" : ""}" style="--d:${i}" cx="${c}" cy="${c}" r="${r1}"/>`;
    // Labels ride the top of each ring's outer line, reading left to right.
    paths += `<path id="lp-${i}" d="M ${c - r1} ${c} A ${r1} ${r1} 0 0 1 ${c + r1} ${c}"/>`;
    const text = esc(ringName(i).toUpperCase()) + (counts[i] ? `<tspan class="n"> ${counts[i]}</tspan>` : "");
    const tp = `<textPath href="#lp-${i}" startOffset="50%">${text}</textPath>`;
    knock += `<text class="label knock" text-anchor="middle" dominant-baseline="central">${tp}</text>`;
    labels += `<text class="label" data-ring="${i}" text-anchor="middle" dominant-baseline="central">${tp}</text>`;
  });

  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.style.setProperty("--label-size", `${clamp(geo.band * 0.24, 8.5, 10)}px`);
  svg.innerHTML = `
    <defs>
      ${paths}
      <mask id="knock" maskUnits="userSpaceOnUse" x="0" y="0" width="${size}" height="${size}">
        <rect width="${size}" height="${size}" fill="#fff"/>${knock}
      </mask>
    </defs>
    <g>${bands}</g>
    <g mask="url(#knock)">${lines}</g>
    <circle class="core" cx="${c}" cy="${c}" r="${core}"/>
    <text class="core-text" x="${c}" y="${c}" text-anchor="middle" dominant-baseline="central" style="font-size:${core * 0.66}px">me</text>
    <g>${labels}</g>`;
}

function drawItems() {
  const live = new Set();
  RINGS.forEach((_, i) => {
    for (const { item, size, x, y } of layoutRing(i)) {
      live.add(item.id);
      let el = nodes.get(item.id);
      if (!el) {
        el = document.createElement("button");
        el.type = "button";
        el.className = "item";
        el.dataset.id = item.id;
        el.innerHTML = '<span class="glyph"></span>';
        layer.append(el);
        nodes.set(item.id, el);
      }
      if (item.id === justAdded) {
        el.classList.add("is-new");
        el.addEventListener("animationend", () => el.classList.remove("is-new"), { once: true });
        justAdded = null;
      }
      el.firstChild.textContent = item.emoji;
      el.setAttribute("aria-label", `${item.name} — ${ringName(i)}`);
      el.style.setProperty("--s", `${size}px`);
      el.style.setProperty("--x", `${x - size / 2}px`);
      el.style.setProperty("--y", `${y - size / 2}px`);
    }
  });
  for (const [id, el] of nodes) {
    if (!live.has(id)) { el.remove(); nodes.delete(id); }
  }
}

function setHot(i) {
  if (hot === i) return;
  hot = i;
  svg.querySelectorAll(".band").forEach((b) => b.classList.toggle("hot", +b.dataset.ring === i));
}

/* --------------------------------------------------------------------------
   Cursor chip + tooltip
   -------------------------------------------------------------------------- */

const chip = $("chip");
const tip = $("tip");

function showChip(x, y, title, sub = "") {
  chip.innerHTML = `${esc(title)}${sub ? `<span>${esc(sub)}</span>` : ""}`;
  chip.hidden = false;
  const w = chip.offsetWidth;
  const left = x + 16 + w > innerWidth - 8 ? x - 16 - w : x + 16;
  chip.style.transform = `translate(${left}px, ${y + 14}px)`;
}
const hideChip = () => { chip.hidden = true; };

function showTip(el) {
  const it = byId(el.dataset.id);
  if (!it) return;
  tip.innerHTML = `
    <div class="tip-name"><i>${esc(it.emoji)}</i>${esc(it.name)}</div>
    ${it.note ? `<p class="tip-note">${esc(it.note)}</p>` : ""}
    <p class="tip-ring eyebrow">${esc(ringName(ringIndex(it.ring)))}</p>`;
  tip.hidden = false;
  const b = el.getBoundingClientRect();
  const t = tip.getBoundingClientRect();
  const left = clamp(b.left + b.width / 2 - t.width / 2, 8, innerWidth - t.width - 8);
  let top = b.top - t.height - 12;
  if (top < 8) top = b.bottom + 12;
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}
const hideTip = () => { tip.hidden = true; };

/* --------------------------------------------------------------------------
   Stage: hover a ring to see where you'd add, click to add there
   -------------------------------------------------------------------------- */

stage.addEventListener("pointermove", (e) => {
  if (drag || sheet || e.pointerType !== "mouse") return;
  if (e.target.closest(".item")) { setHot(null); hideChip(); return; }
  if (e.target.closest(".label")) { setHot(null); showChip(e.clientX, e.clientY, "rename ring"); return; }
  const i = ringAt(toPolar(e.clientX, e.clientY).r);
  if (i === null || i < 0) { setHot(null); hideChip(); return; }
  setHot(i);
  showChip(e.clientX, e.clientY, `+ ${ringName(i)}`, ringHint(i));
});

stage.addEventListener("pointerleave", () => {
  if (drag) return;
  setHot(null);
  hideChip();
});

stage.addEventListener("click", (e) => {
  if (e.target.closest(".item")) return;
  const label = e.target.closest(".label");
  if (label) { openRingSheet(+label.dataset.ring, { x: e.clientX, y: e.clientY }); return; }
  const { r, deg } = toPolar(e.clientX, e.clientY);
  const i = ringAt(r);
  if (i === null || i < 0) return;
  openAdd({ ring: i, angle: deg, anchor: { x: e.clientX, y: e.clientY } });
});

/* --------------------------------------------------------------------------
   Items: hover for details, click to edit, drag to move
   -------------------------------------------------------------------------- */

let drag = null;
let suppressClick = false;

layer.addEventListener("pointerover", (e) => {
  const el = e.target.closest(".item:not(.ghost)");
  if (el && e.pointerType === "mouse" && !drag && !sheet) showTip(el);
});
layer.addEventListener("pointerout", (e) => {
  const el = e.target.closest(".item");
  if (el && !el.contains(e.relatedTarget)) hideTip();
});
layer.addEventListener("focusin", (e) => {
  const el = e.target.closest(".item:not(.ghost)");
  if (el && el.matches(":focus-visible")) showTip(el);
});
layer.addEventListener("focusout", hideTip);

layer.addEventListener("pointerdown", (e) => {
  suppressClick = false;
  const el = e.target.closest(".item:not(.ghost)");
  if (!el || e.button !== 0 || sheet) return;
  drag = { el, id: el.dataset.id, x0: e.clientX, y0: e.clientY, moved: false };
  el.setPointerCapture(e.pointerId);
});

layer.addEventListener("pointermove", (e) => {
  if (!drag) return;
  if (!drag.moved) {
    if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5) return;
    drag.moved = true;
    drag.el.classList.add("dragging");
    stage.classList.add("is-dragging");
    hideTip();
  }
  const b = stage.getBoundingClientRect();
  const s = parseFloat(drag.el.style.getPropertyValue("--s"));
  drag.el.style.setProperty("--x", `${e.clientX - b.left - s / 2}px`);
  drag.el.style.setProperty("--y", `${e.clientY - b.top - s / 2}px`);
  const i = dropRing(e.clientX, e.clientY);
  setHot(i);
  if (i === null) showChip(e.clientX, e.clientY, "drop on a ring");
  else showChip(e.clientX, e.clientY, `→ ${ringName(i)}`, ringHint(i));
});

// Dropping on "me" counts as the innermost ring; well outside cancels.
function dropRing(x, y) {
  const i = ringAt(toPolar(x, y).r, geo.band * 0.5);
  return i === -1 ? 0 : i;
}

function endDrag(e, commit) {
  if (!drag) return;
  const d = drag;
  drag = null;
  if (!d.moved) return;
  suppressClick = true;
  d.el.classList.remove("dragging");
  stage.classList.remove("is-dragging");
  setHot(null);
  hideChip();
  const it = byId(d.id);
  const i = commit ? dropRing(e.clientX, e.clientY) : null;
  if (it && i !== null) {
    it.ring = RINGS[i].id;
    it.angle = toPolar(e.clientX, e.clientY).deg;
    saveItems();
  }
  render();
}
layer.addEventListener("pointerup", (e) => endDrag(e, true));
layer.addEventListener("pointercancel", (e) => endDrag(e, false));

layer.addEventListener("click", (e) => {
  const el = e.target.closest(".item:not(.ghost)");
  if (!el) return;
  if (suppressClick) { suppressClick = false; return; }
  openEdit(el.dataset.id);
});

/* --------------------------------------------------------------------------
   Add / edit sheet
   -------------------------------------------------------------------------- */

const sheetEl = $("sheet");
const scrim = $("scrim");
const fName = $("f-name");
const fNote = $("f-note");
const emojiBtn = $("emoji-btn");
const palette = $("palette");
const pills = $("ring-pills");

let sheet = null;   // { mode: "add"|"edit", id, ring, angle, autoAngle, emoji, emojiLocked, returnFocus }
let lastRing = 0;
const ghost = Object.assign(document.createElement("div"), { className: "item ghost", innerHTML: '<span class="glyph"></span>' });

function openAdd({ ring, angle, anchor }) {
  closeAll();
  sheet = {
    mode: "add",
    ring,
    angle: angle ?? openAngle(ring),
    autoAngle: angle == null,
    emoji: FALLBACK_EMOJI,
    emojiLocked: false,
    returnFocus: document.activeElement,
  };
  fName.value = "";
  fNote.value = "";
  $("sheet-title").textContent = "new item";
  $("submit-btn").textContent = "add";
  $("delete-btn").hidden = true;
  showSheet(anchor);
  layer.append(ghost);
  placeGhost();
}

function openEdit(id) {
  const it = byId(id);
  if (!it) return;
  closeAll();
  sheet = {
    mode: "edit",
    id,
    ring: ringIndex(it.ring),
    angle: it.angle,
    emoji: it.emoji,
    emojiLocked: true,
    returnFocus: nodes.get(id),
  };
  fName.value = it.name;
  fNote.value = it.note;
  $("sheet-title").textContent = "edit item";
  $("submit-btn").textContent = "save";
  $("delete-btn").hidden = false;
  const el = nodes.get(id);
  el.classList.add("editing");
  stage.classList.add("is-focusing");
  const b = el.getBoundingClientRect();
  showSheet({ x: b.right, y: b.top + b.height / 2 });
}

function showSheet(anchor) {
  hideTip();
  hideChip();
  setHot(null);
  syncEmoji();
  syncRing();
  scrim.hidden = false;
  sheetEl.hidden = false;
  position(sheetEl, anchor);
  // Skip the keyboard on touch when just looking at an existing item.
  if (sheet.mode === "add" || !touchFirst) fName.focus();
}

// Beside the anchor point on wide screens; CSS turns it into a bottom sheet on narrow ones.
function position(el, anchor) {
  if (matchMedia("(max-width: 600px)").matches) return;
  const { width: w, height: h } = el.getBoundingClientRect();
  let x, y;
  if (anchor) {
    x = anchor.x + 22 + w > innerWidth - 12 ? anchor.x - 22 - w : anchor.x + 22;
    y = anchor.y - 48;
  } else {
    const btn = $("add-btn").getBoundingClientRect();
    x = btn.right - w;
    y = btn.bottom + 10;
  }
  el.style.setProperty("--sx", `${clamp(x, 12, innerWidth - w - 12)}px`);
  el.style.setProperty("--sy", `${clamp(y, 12, innerHeight - h - 12)}px`);
}

function placeGhost() {
  const size = itemSize();
  const { x, y } = fromPolar(ringMid(sheet.ring), sheet.angle);
  ghost.firstChild.textContent = sheet.emoji;
  ghost.style.setProperty("--s", `${size}px`);
  ghost.style.setProperty("--x", `${x - size / 2}px`);
  ghost.style.setProperty("--y", `${y - size / 2}px`);
}

function syncEmoji() {
  if (!sheet.emojiLocked) sheet.emoji = suggest(fName.value)[0] || FALLBACK_EMOJI;
  emojiBtn.textContent = sheet.emoji;
  const picks = [...new Set([...suggest(fName.value), sheet.emoji, ...DEFAULT_PALETTE])].slice(0, PALETTE_SIZE);
  palette.innerHTML =
    picks.map((e) => `<button type="button" data-emoji="${esc(e)}" aria-pressed="${e === sheet.emoji}">${esc(e)}</button>`).join("") +
    `<input class="f-emoji" id="f-emoji" placeholder="other" aria-label="Type or paste any emoji">`;
  if (sheet.mode === "add") placeGhost();
}

function syncRing() {
  pills.innerHTML = RINGS.map(
    (_, i) => `<label class="pill"><input type="radio" name="ring" value="${i}"${i === sheet.ring ? " checked" : ""}><span>${esc(ringName(i))}</span></label>`
  ).join("");
  $("ring-hint").textContent = ringHint(sheet.ring);
}

fName.addEventListener("input", syncEmoji);

palette.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-emoji]");
  if (!b) return;
  sheet.emoji = b.dataset.emoji;
  sheet.emojiLocked = true;
  syncEmoji();
});

palette.addEventListener("input", (e) => {
  if (e.target.id !== "f-emoji") return;
  const g = firstGrapheme(e.target.value);
  if (!g) return;
  sheet.emoji = g;
  sheet.emojiLocked = true;
  emojiBtn.textContent = g;
  palette.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.emoji === g));
  if (sheet.mode === "add") placeGhost();
});

// The big emoji opens a free-text slot — on a Mac, ⌃⌘Space brings up every emoji.
emojiBtn.addEventListener("click", () => $("f-emoji").focus());

pills.addEventListener("change", (e) => {
  sheet.ring = +e.target.value;
  if (sheet.autoAngle) sheet.angle = openAngle(sheet.ring);
  $("ring-hint").textContent = ringHint(sheet.ring);
  if (sheet.mode === "add") placeGhost();
});

sheetEl.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = fName.value.trim();
  if (!name) { fName.focus(); return; }
  const fields = { name, note: fNote.value.trim(), emoji: sheet.emoji, ring: RINGS[sheet.ring].id };
  if (sheet.mode === "add") {
    const it = { id: uid(), ...fields, angle: sheet.angle, added: Date.now() };
    items.push(it);
    justAdded = it.id;
  } else {
    Object.assign(byId(sheet.id) || {}, fields);
  }
  lastRing = sheet.ring;
  saveItems();
  closeAll();
  render();
});

// ⌘/Ctrl+Enter saves from the notes field too.
fNote.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sheetEl.requestSubmit();
});

$("delete-btn").addEventListener("click", () => {
  const id = sheet.id;
  closeAll();
  removeItem(id);
});

function removeItem(id) {
  const k = items.findIndex((it) => it.id === id);
  if (k < 0) return;
  const [gone] = items.splice(k, 1);
  saveItems();
  hideTip();
  render();
  toast(`removed ${gone.emoji} ${gone.name}`, () => {
    items.splice(Math.min(k, items.length), 0, gone);
    justAdded = gone.id;
    saveItems();
    render();
  });
}

/* --------------------------------------------------------------------------
   Ring sheet: rename a ring and say what lives there
   -------------------------------------------------------------------------- */

const ringSheetEl = $("ring-sheet");
let ringEditing = null;

function openRingSheet(i, anchor) {
  closeAll();
  ringEditing = { i, returnFocus: document.activeElement };
  $("ring-sheet-title").textContent = `ring ${i + 1} of ${RINGS.length}`;
  $("r-name").value = ringName(i);
  $("r-hint").value = ringHint(i);
  $("ring-reset").hidden = !ringMeta[RINGS[i].id];
  hideChip();
  setHot(i);
  scrim.hidden = false;
  ringSheetEl.hidden = false;
  position(ringSheetEl, anchor);
  $("r-name").select();
}

ringSheetEl.addEventListener("submit", (e) => {
  e.preventDefault();
  const { id, name, hint } = RINGS[ringEditing.i];
  const newName = $("r-name").value.trim() || name;
  const newHint = $("r-hint").value.trim();
  if (newName === name && newHint === hint) delete ringMeta[id];
  else ringMeta[id] = { name: newName, hint: newHint };
  saveRings();
  closeAll();
  render();
});

$("ring-reset").addEventListener("click", () => {
  delete ringMeta[RINGS[ringEditing.i].id];
  saveRings();
  closeAll();
  render();
});

/* --------------------------------------------------------------------------
   Closing, toast, keyboard
   -------------------------------------------------------------------------- */

function closeAll() {
  const back = sheet?.returnFocus || ringEditing?.returnFocus;
  if (sheet?.mode === "edit") nodes.get(sheet.id)?.classList.remove("editing");
  sheet = null;
  ringEditing = null;
  ghost.remove();
  stage.classList.remove("is-focusing");
  sheetEl.hidden = true;
  ringSheetEl.hidden = true;
  scrim.hidden = true;
  setHot(null);
  if (back?.isConnected && back !== document.body) back.focus({ preventScroll: true });
}

document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeAll));

// While adding, clicking another spot on the rings moves the placement there.
scrim.addEventListener("click", (e) => {
  const { r, deg } = toPolar(e.clientX, e.clientY);
  const i = ringAt(r);
  if (sheet?.mode !== "add" || i === null || i < 0) { closeAll(); return; }
  Object.assign(sheet, { ring: i, angle: deg, autoAngle: false });
  syncRing();
  placeGhost();
  fName.focus();
});

const toastEl = $("toast");
let toastTimer = 0;
let toastUndo = null;

function toast(message, undo) {
  $("toast-msg").textContent = message;
  toastUndo = undo;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; toastUndo = null; }, 6000);
}

$("toast-undo").addEventListener("click", () => {
  toastUndo?.();
  toastUndo = null;
  toastEl.hidden = true;
});

$("add-btn").addEventListener("click", () => openAdd({ ring: lastRing }));

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (sheet || ringEditing) closeAll();
    hideTip();
    return;
  }
  if (sheet || ringEditing || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target.closest?.("input, textarea")) return;
  if (e.key === "n" || e.key === "+") {
    e.preventDefault();
    openAdd({ ring: lastRing });
  } else if ((e.key === "Delete" || e.key === "Backspace") && e.target.classList?.contains("item")) {
    e.preventDefault();
    removeItem(e.target.dataset.id);
  }
});

/* --------------------------------------------------------------------------
   Boot
   -------------------------------------------------------------------------- */

load();

new ResizeObserver(() => {
  measure();
  stage.classList.add("no-anim");
  render();
  requestAnimationFrame(() => stage.classList.remove("no-anim"));
}).observe(stageBox);

connect();
