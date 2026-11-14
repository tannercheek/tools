// Job Search: one goal, a help desk / IT support job, as three tabs.
// Prepare is a one-time checklist of materials to apply with, Search is the
// daily and weekly rounds plus where to look, and Study is the skills help
// desk interviews ask about, ending with interview readiness.
import { PREPARE, ROUNDS, CHANNELS } from "./content.js";
import { STUDY } from "./study.js";

const COUNTERS = { apps: 10, outreach: 5, study: 5 }; // low end of each goal

// ── Dates ─────────────────────────────────────────────
function isoDate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
// Monday of the week containing d, local time.
function weekStart(d = new Date()) {
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}
const NOW = new Date();
const TODAY = isoDate(NOW);
const MONDAY = weekStart(NOW);
const WEEK = isoDate(MONDAY);
const PREV_WEEK = isoDate(new Date(MONDAY.getFullYear(), MONDAY.getMonth(), MONDAY.getDate() - 7));

function stateKey(id, kind) {
  if (kind === "weekly") return `week:${WEEK}:${id}`;
  if (kind === "daily") return `day:${TODAY}:${id}`;
  if (kind === "plan") return `plan:${id}`;
  return id; // setup / study: bare ids, unchanged from the original checklist
}

// ── Unlock ────────────────────────────────────────────
// Nothing renders until the passphrase checks out.
let gate, syncedState;
try {
  ({ gate, syncedState } = await import("../../shared/persist.js"));
} catch (err) {
  // persist.js didn't load (no signal, Firebase not cached), so there's no
  // gate and no saved state. Trust a device that has unlocked before and show
  // the page as it looked before the gate; otherwise say why it's locked.
  let trusted = false;
  try {
    trusted = !!localStorage.getItem("toolsPassphrase");
  } catch {
    // storage unavailable — stay locked
  }
  const app = document.getElementById("app");
  if (trusted) app.hidden = false;
  else app.before(el("p", "page", "Can't unlock right now. Check your connection and reload."));
  throw err;
}
await gate("#app");

// ── Rendering ─────────────────────────────────────────
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function linksNode(links) {
  const wrap = el("div", "links");
  for (const l of links) {
    const a = el("a", null, l.text);
    a.href = l.href;
    if (!l.href.startsWith("#")) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
    wrap.append(a);
  }
  return wrap;
}

function chipsNode(chips) {
  const wrap = el("div");
  const head = el("div", "chips-head");
  const copy = el("button", "quiet", "Copy titles");
  copy.type = "button";
  copy.addEventListener("click", () => {
    const done = (msg) => {
      copy.textContent = msg;
      setTimeout(() => (copy.textContent = "Copy titles"), 2000);
    };
    try {
      navigator.clipboard.writeText(chips.join("\n")).then(
        () => done("Copied"),
        () => done("Copy blocked: select the text"),
      );
    } catch {
      done("Copy blocked: select the text");
    }
  });
  head.append(el("span", null, "Titles to set alerts for"), copy);
  const ul = el("ul", "chips");
  for (const c of chips) ul.append(el("li", null, c));
  wrap.append(head, ul);
  return wrap;
}

function itemNode(item, kind) {
  const li = el("li");

  const label = el("label", "item");
  const box = el("input");
  box.type = "checkbox";
  box.disabled = true; // enabled once saved state has loaded
  box.dataset.key = stateKey(item.id, kind);
  box.dataset.kind = kind;
  if (item.objective) box.dataset.objective = "";

  const text = el("span", "item-text");
  text.append(el("span", "item-label", item.label));
  if (item.note) text.append(el("span", "item-note", item.note));
  label.append(box, text);
  li.append(label);

  if (item.links || item.chips) {
    const extras = el("div", "extras");
    if (item.links) extras.append(linksNode(item.links));
    if (item.chips) extras.append(chipsNode(item.chips));
    li.append(extras);
  }
  return li;
}

function listNode(items, kind) {
  const ul = el("ul", "items");
  for (const item of items) ul.append(itemNode(item, kind));
  return ul;
}

function summaryNode(title, tag) {
  const summary = el("summary");
  const left = el("span", "sum-left");
  const chev = el("span", "chev");
  chev.setAttribute("aria-hidden", "true");
  const name = el("span", "sum-title");
  name.append(el("h3", null, title));
  if (tag) name.append(el("span", "tag", tag));
  left.append(chev, name);
  summary.append(left, el("span", "group-count"));
  return summary;
}

// Prepare and Study: a heading per phase, an accordion per group.
function renderPhases(host, phases) {
  for (const phase of phases) {
    const section = el("section", "phase");
    section.dataset.phase = "";
    const head = el("div", "phase-head");
    const title = el("div", "phase-title");
    title.append(el("h2", null, phase.title));
    if (phase.tag) title.append(el("span", "tag", phase.tag));
    head.append(title);
    section.append(head);
    if (phase.intro) section.append(el("p", "phase-intro", phase.intro));

    for (const group of phase.groups) {
      const details = el("details");
      details.open = true;
      details.dataset.group = "";
      details.dataset.countable = "";
      const body = el("div", "body");
      body.append(listNode(group.items, group.kind || phase.kind));
      details.append(summaryNode(group.label, group.tag), body);
      section.append(details);
    }
    host.append(section);
  }
}

const preparePanel = document.getElementById("panel-prepare");
const studyPanel = document.getElementById("panel-study");
renderPhases(preparePanel, PREPARE);
renderPhases(studyPanel, STUDY);

// Search: today + weekly rounds as plain grouped lists.
const roundsHost = document.getElementById("rounds");
const dayLabel = NOW.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const weekLabel = MONDAY.toLocaleDateString(undefined, { month: "short", day: "numeric" });
document.getElementById("week-meta").textContent = `Week of ${weekLabel} · resets Monday`;

for (const round of ROUNDS) {
  const section = el("section", "phase");
  section.dataset.countable = "";
  const head = el("div", "phase-head");
  head.append(el("h2", null, round.title));
  const meta = el("span", "meta");
  meta.append(
    el("span", null, round.kind === "daily" ? `${dayLabel} · ` : "Resets Monday · "),
    el("span", "group-count"),
  );
  head.append(meta);
  section.append(head);
  for (const group of round.groups) {
    const wrap = el("div");
    wrap.dataset.group = "";
    if (group.label) wrap.append(el("h3", "group-label", group.label));
    wrap.append(listNode(group.items, round.kind));
    section.append(wrap);
  }
  const empty = el("p", "empty", round.kind === "daily" ? "All done for today." : "All done for this week.");
  empty.hidden = true;
  section.append(empty);
  roundsHost.append(section);
}

// Search: where to look.
const channelsHost = document.getElementById("channels");
for (const ch of CHANNELS) {
  const details = el("details");
  details.open = !!ch.open;
  details.dataset.channel = ch.id;
  if (ch.items) details.dataset.countable = "";
  const body = el("div", "body");
  body.append(el("p", "why", ch.why));
  if (ch.links) body.append(linksNode(ch.links));
  if (ch.items) body.append(listNode(ch.items, "plan"));
  if (ch.routine) body.append(el("p", "routine", ch.routine));
  details.append(summaryNode(ch.title, ch.tag), body);
  channelsHost.append(details);
}

// ── Behavior ──────────────────────────────────────────
const boxes = [...document.querySelectorAll("main ul.items input[type=checkbox]")];
const hideDoneInput = document.getElementById("hide-done");
const foldButton = document.getElementById("fold-all");
const tabs = [...document.querySelectorAll("[role=tab]")];
const TABS = tabs.map((t) => t.dataset.tab);
let tab = "prepare";

function applyVisibility() {
  const hideDone = hideDoneInput.checked;
  for (const box of boxes) box.closest("li").hidden = hideDone && box.checked;
  // Hide groups and phases with nothing left to show.
  for (const g of document.querySelectorAll("[data-group]")) {
    g.hidden = !g.querySelector("li:not([hidden])");
  }
  for (const p of document.querySelectorAll("[data-phase]")) {
    p.hidden = !p.querySelector("[data-group]:not([hidden])");
  }
  // Channels keep their context; only a finished list disappears.
  for (const ch of document.querySelectorAll("[data-channel]")) {
    const ul = ch.querySelector("ul.items");
    if (ul) ul.hidden = !ul.querySelector("li:not([hidden])");
  }
}

function tally(scope) {
  const list = [...scope.querySelectorAll("ul.items input")];
  return { done: list.filter((b) => b.checked).length, total: list.length };
}

function updateCounts() {
  for (const scope of document.querySelectorAll("[data-countable]")) {
    const { done, total } = tally(scope);
    const count = scope.querySelector(".group-count");
    count.textContent = total ? `${done} of ${total}` : "";
    count.classList.toggle("done", total > 0 && done === total);
    const empty = scope.querySelector(":scope > .empty");
    if (empty) empty.hidden = !(total > 0 && done === total && hideDoneInput.checked);
  }

  const { kind, text } = BARS[tab];
  const panel = document.getElementById("panel-" + tab);
  const list = boxes.filter((b) => b.dataset.kind === kind && panel.contains(b));
  const done = list.filter((b) => b.checked).length;
  const total = list.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById("bar-label").textContent = text;
  document.getElementById("bar-count").textContent = `${done} of ${total}`;
  document.getElementById("fill").style.width = pct + "%";
  document.getElementById("meter").setAttribute("aria-valuenow", String(pct));
}

const BARS = {
  prepare: { kind: "setup", text: "Ready to apply" },
  search: { kind: "weekly", text: "Weekly rounds" },
  study: { kind: "study", text: "Ready to interview" },
};

// Collapse / expand all: acts on every section in the current tab. The label
// names what a click will do, judged by the sections you can see.
const currentPanel = () => document.getElementById("panel-" + tab);
const sectionsIn = (panel) => [...panel.querySelectorAll("details")];
function paintFold() {
  const panel = currentPanel();
  const visible = sectionsIn(panel).filter((d) => !d.closest("[hidden]"));
  const anyOpen = visible.some((d) => d.open);
  foldButton.textContent = anyOpen ? "Collapse all" : "Expand all";
  foldButton.setAttribute("aria-label", anyOpen ? "Collapse all sections" : "Expand all sections");
  foldButton.hidden = visible.length === 0;
}
foldButton.addEventListener("click", () => {
  const open = foldButton.textContent === "Expand all";
  for (const d of sectionsIn(currentPanel())) d.open = open;
  paintFold();
});
// toggle doesn't bubble, so listen in the capture phase for hand toggles.
document.addEventListener("toggle", (e) => {
  if (e.target.tagName === "DETAILS") paintFold();
}, true);

function refresh() {
  applyVisibility();
  updateCounts();
  paintFold();
}

// Tabs: #prepare / #search / #study in the URL, last one remembered per browser.
function showTab(name) {
  tab = TABS.includes(name) ? name : "prepare";
  for (const t of tabs) {
    const selected = t.dataset.tab === tab;
    t.setAttribute("aria-selected", String(selected));
    t.tabIndex = selected ? 0 : -1;
    document.getElementById(t.getAttribute("aria-controls")).hidden = !selected;
  }
  try {
    localStorage.setItem("jobSearchPlan:tab", tab);
  } catch {
    // storage unavailable — the tab just won't be remembered
  }
  updateCounts();
  paintFold();
}

function selectTab(name, focus) {
  showTab(name);
  history.replaceState(null, "", "#" + tab);
  if (focus) document.getElementById("tab-" + tab).focus();
}

tabs.forEach((t, i) => {
  t.addEventListener("click", () => selectTab(t.dataset.tab));
  t.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    selectTab(next.dataset.tab, true);
  });
});
window.addEventListener("hashchange", () => {
  showTab(location.hash.slice(1));
  window.scrollTo({ top: 0 });
});

let savedTab = null;
try {
  savedTab = localStorage.getItem("jobSearchPlan:tab");
} catch {
  // ignore
}
showTab(location.hash.slice(1) || savedTab || "prepare");
refresh();

// ── Saved state ───────────────────────────────────────
const state = await syncedState("job-search-checklist");

const statusEl = document.getElementById("sync");
const STATUS_TEXT = {
  synced: "Synced across devices",
  "saved-locally": "Saved on this device, syncing when reachable",
  offline: "Offline. Changes are saved on this device.",
};
state.onStatus((s) => {
  statusEl.textContent = STATUS_TEXT[s] || "";
  statusEl.classList.toggle("is-error", s === "offline");
});

for (const box of boxes) {
  box.checked = !!state.get(box.dataset.key);
  box.disabled = false;
  box.addEventListener("change", () => {
    state.set(box.dataset.key, box.checked);
    refresh();
  });
}

function renderCounters() {
  for (const [name, goal] of Object.entries(COUNTERS)) {
    const n = state.get(`week:${WEEK}:count:${name}`) || 0;
    const count = document.getElementById("count-" + name);
    count.textContent = n;
    count.classList.toggle("met", n >= goal);
    const prev = state.get(`week:${PREV_WEEK}:count:${name}`);
    document.getElementById("last-" + name).textContent = prev != null ? `Last week: ${prev}` : "";
  }
}
for (const btn of document.querySelectorAll(".step")) {
  btn.disabled = false;
  btn.addEventListener("click", () => {
    const key = `week:${WEEK}:count:${btn.dataset.counter}`;
    state.set(key, Math.max(0, (state.get(key) || 0) + Number(btn.dataset.delta)));
    renderCounters();
  });
}
renderCounters();

hideDoneInput.checked = !!state.get("hideDone");
hideDoneInput.addEventListener("change", () => {
  state.set("hideDone", hideDoneInput.checked);
  refresh();
});
refresh();

// Finished Prepare and Study groups start collapsed; open the rest.
for (const details of [...preparePanel.querySelectorAll("details"), ...studyPanel.querySelectorAll("details")]) {
  const { done, total } = tally(details);
  details.open = !(total > 0 && done === total);
}
paintFold();
