// Interview Prep: a spaced-review practice plan.
// State syncs through shared/persist.js, with a localStorage fallback so the
// tool still works when opened on its own.

const TOOL_ID = 'interview-prep';
const DAY = 86400000;
const REVIEW_DAYS = [3, 7, 21]; // gaps after each clean solve
const TIMER_MS = 25 * 60 * 1000;

/* ---------- content ---------- */

const p = (slug, title, level) => ({ slug, title, level });

const PHASES = [
  {
    id: 'phase-1', name: 'Phase 1: core patterns',
    note: 'The bulk of entry-level phone screens and online assessments.',
    topics: [
      { id: 'arrays-hashing', name: 'Arrays and hashing', problems: [
        p('contains-duplicate', 'Contains Duplicate', 'Easy'),
        p('valid-anagram', 'Valid Anagram', 'Easy'),
        p('two-sum', 'Two Sum', 'Easy'),
        p('group-anagrams', 'Group Anagrams', 'Medium'),
        p('top-k-frequent-elements', 'Top K Frequent Elements', 'Medium'),
        p('product-of-array-except-self', 'Product of Array Except Self', 'Medium'),
        p('valid-sudoku', 'Valid Sudoku', 'Medium'),
        p('longest-consecutive-sequence', 'Longest Consecutive Sequence', 'Medium'),
      ]},
      { id: 'two-pointers', name: 'Two pointers', problems: [
        p('valid-palindrome', 'Valid Palindrome', 'Easy'),
        p('two-sum-ii-input-array-is-sorted', 'Two Sum II', 'Medium'),
        p('3sum', '3Sum', 'Medium'),
        p('container-with-most-water', 'Container With Most Water', 'Medium'),
      ]},
      { id: 'sliding-window', name: 'Sliding window', problems: [
        p('best-time-to-buy-and-sell-stock', 'Best Time to Buy and Sell Stock', 'Easy'),
        p('longest-substring-without-repeating-characters', 'Longest Substring Without Repeating Characters', 'Medium'),
        p('longest-repeating-character-replacement', 'Longest Repeating Character Replacement', 'Medium'),
        p('permutation-in-string', 'Permutation in String', 'Medium'),
      ]},
      { id: 'stack', name: 'Stack', problems: [
        p('valid-parentheses', 'Valid Parentheses', 'Easy'),
        p('min-stack', 'Min Stack', 'Medium'),
        p('evaluate-reverse-polish-notation', 'Evaluate Reverse Polish Notation', 'Medium'),
        p('daily-temperatures', 'Daily Temperatures', 'Medium'),
        p('generate-parentheses', 'Generate Parentheses', 'Medium'),
      ]},
      { id: 'binary-search', name: 'Binary search', problems: [
        p('binary-search', 'Binary Search', 'Easy'),
        p('search-a-2d-matrix', 'Search a 2D Matrix', 'Medium'),
        p('koko-eating-bananas', 'Koko Eating Bananas', 'Medium'),
        p('find-minimum-in-rotated-sorted-array', 'Find Minimum in Rotated Sorted Array', 'Medium'),
        p('search-in-rotated-sorted-array', 'Search in Rotated Sorted Array', 'Medium'),
      ]},
      { id: 'linked-list', name: 'Linked list', problems: [
        p('reverse-linked-list', 'Reverse Linked List', 'Easy'),
        p('merge-two-sorted-lists', 'Merge Two Sorted Lists', 'Easy'),
        p('linked-list-cycle', 'Linked List Cycle', 'Easy'),
        p('reorder-list', 'Reorder List', 'Medium'),
        p('remove-nth-node-from-end-of-list', 'Remove Nth Node From End of List', 'Medium'),
        p('add-two-numbers', 'Add Two Numbers', 'Medium'),
        p('lru-cache', 'LRU Cache', 'Medium'),
      ]},
      { id: 'trees', name: 'Trees', problems: [
        p('invert-binary-tree', 'Invert Binary Tree', 'Easy'),
        p('maximum-depth-of-binary-tree', 'Maximum Depth of Binary Tree', 'Easy'),
        p('diameter-of-binary-tree', 'Diameter of Binary Tree', 'Easy'),
        p('balanced-binary-tree', 'Balanced Binary Tree', 'Easy'),
        p('same-tree', 'Same Tree', 'Easy'),
        p('subtree-of-another-tree', 'Subtree of Another Tree', 'Easy'),
        p('lowest-common-ancestor-of-a-binary-search-tree', 'Lowest Common Ancestor of a BST', 'Medium'),
        p('binary-tree-level-order-traversal', 'Binary Tree Level Order Traversal', 'Medium'),
        p('binary-tree-right-side-view', 'Binary Tree Right Side View', 'Medium'),
        p('validate-binary-search-tree', 'Validate Binary Search Tree', 'Medium'),
        p('kth-smallest-element-in-a-bst', 'Kth Smallest Element in a BST', 'Medium'),
      ]},
    ],
  },
  {
    id: 'phase-2', name: 'Phase 2: onsite patterns',
    note: 'What separates a pass from a strong pass in later rounds.',
    topics: [
      { id: 'heap', name: 'Heap and priority queue', problems: [
        p('kth-largest-element-in-a-stream', 'Kth Largest Element in a Stream', 'Easy'),
        p('last-stone-weight', 'Last Stone Weight', 'Easy'),
        p('k-closest-points-to-origin', 'K Closest Points to Origin', 'Medium'),
        p('kth-largest-element-in-an-array', 'Kth Largest Element in an Array', 'Medium'),
        p('task-scheduler', 'Task Scheduler', 'Medium'),
      ]},
      { id: 'backtracking', name: 'Backtracking', problems: [
        p('subsets', 'Subsets', 'Medium'),
        p('combination-sum', 'Combination Sum', 'Medium'),
        p('permutations', 'Permutations', 'Medium'),
        p('word-search', 'Word Search', 'Medium'),
        p('letter-combinations-of-a-phone-number', 'Letter Combinations of a Phone Number', 'Medium'),
      ]},
      { id: 'graphs', name: 'Graphs', problems: [
        p('number-of-islands', 'Number of Islands', 'Medium'),
        p('max-area-of-island', 'Max Area of Island', 'Medium'),
        p('clone-graph', 'Clone Graph', 'Medium'),
        p('rotting-oranges', 'Rotting Oranges', 'Medium'),
        p('pacific-atlantic-water-flow', 'Pacific Atlantic Water Flow', 'Medium'),
        p('course-schedule', 'Course Schedule', 'Medium'),
        p('course-schedule-ii', 'Course Schedule II', 'Medium'),
      ]},
      { id: 'dp-1d', name: 'Dynamic programming, one dimension', problems: [
        p('climbing-stairs', 'Climbing Stairs', 'Easy'),
        p('min-cost-climbing-stairs', 'Min Cost Climbing Stairs', 'Easy'),
        p('house-robber', 'House Robber', 'Medium'),
        p('house-robber-ii', 'House Robber II', 'Medium'),
        p('longest-palindromic-substring', 'Longest Palindromic Substring', 'Medium'),
        p('coin-change', 'Coin Change', 'Medium'),
        p('word-break', 'Word Break', 'Medium'),
        p('longest-increasing-subsequence', 'Longest Increasing Subsequence', 'Medium'),
      ]},
      { id: 'intervals', name: 'Intervals', problems: [
        p('insert-interval', 'Insert Interval', 'Medium'),
        p('merge-intervals', 'Merge Intervals', 'Medium'),
        p('non-overlapping-intervals', 'Non-overlapping Intervals', 'Medium'),
      ]},
      { id: 'greedy', name: 'Greedy', problems: [
        p('maximum-subarray', 'Maximum Subarray', 'Medium'),
        p('jump-game', 'Jump Game', 'Medium'),
        p('jump-game-ii', 'Jump Game II', 'Medium'),
        p('gas-station', 'Gas Station', 'Medium'),
      ]},
    ],
  },
  {
    id: 'phase-3', name: 'Phase 3: as needed',
    note: 'Pick these up when a specific company is known to ask them.',
    topics: [
      { id: 'tries', name: 'Tries', problems: [
        p('implement-trie-prefix-tree', 'Implement Trie', 'Medium'),
        p('design-add-and-search-words-data-structure', 'Design Add and Search Words Data Structure', 'Medium'),
      ]},
      { id: 'dp-2d', name: 'Dynamic programming, two dimensions', problems: [
        p('unique-paths', 'Unique Paths', 'Medium'),
        p('longest-common-subsequence', 'Longest Common Subsequence', 'Medium'),
        p('coin-change-ii', 'Coin Change II', 'Medium'),
        p('edit-distance', 'Edit Distance', 'Medium'),
      ]},
      { id: 'graphs-advanced', name: 'Weighted graphs', problems: [
        p('network-delay-time', 'Network Delay Time', 'Medium'),
        p('min-cost-to-connect-all-points', 'Min Cost to Connect All Points', 'Medium'),
        p('cheapest-flights-within-k-stops', 'Cheapest Flights Within K Stops', 'Medium'),
      ]},
      { id: 'math-bits', name: 'Math and bit manipulation', problems: [
        p('single-number', 'Single Number', 'Easy'),
        p('number-of-1-bits', 'Number of 1 Bits', 'Easy'),
        p('counting-bits', 'Counting Bits', 'Easy'),
        p('rotate-image', 'Rotate Image', 'Medium'),
        p('spiral-matrix', 'Spiral Matrix', 'Medium'),
      ]},
    ],
  },
];

const ALL = PHASES.flatMap(ph => ph.topics.flatMap(t =>
  t.problems.map(pr => ({ ...pr, topic: t.name, phase: ph.id }))));
const BY_SLUG = Object.fromEntries(ALL.map(pr => [pr.slug, pr]));

/* ---------- persistence ---------- */

async function openStore() {
  try {
    const { syncedState } = await import('../../shared/persist.js');
    const s = await syncedState(TOOL_ID);
    return { mode: 'synced', get: k => s.get(k), set: (k, v) => s.set(k, v) };
  } catch (err) {
    const key = k => `${TOOL_ID}:${k}`;
    return {
      mode: 'local',
      get: k => { try { return JSON.parse(localStorage.getItem(key(k))); } catch { return null; } },
      set: (k, v) => { localStorage.setItem(key(k), JSON.stringify(v)); },
    };
  }
}

const state = {
  problems: {},  // slug -> { s: 'solved' | 'help', n: clean solves so far, t: last attempt }
  current: null, // slug of the problem that was opened but not finished
};

const syncEl = document.getElementById('sync');
const store = await openStore();
for (const k of Object.keys(state)) {
  try {
    const v = await store.get(k);
    if (v !== null && v !== undefined) state[k] = v;
  } catch { /* keep the default */ }
}
const MODE_TEXT = store.mode === 'synced' ? 'Synced across devices' : 'Saved on this device only';
syncEl.textContent = MODE_TEXT;

async function save(k) {
  try {
    await store.set(k, state[k]);
    syncEl.textContent = MODE_TEXT;
    syncEl.classList.remove('is-error');
  } catch {
    syncEl.textContent = 'Last change was not saved. Check your connection and change it again.';
    syncEl.classList.add('is-error');
  }
}

/* ---------- scheduling ---------- */

function dueAt(slug) {
  const r = state.problems[slug];
  if (!r) return null;
  if (r.s === 'help') return r.t + DAY;
  if (r.n > REVIEW_DAYS.length) return null; // learned
  return r.t + REVIEW_DAYS[r.n - 1] * DAY;
}
const dueNow = () => ALL
  .filter(pr => { const d = dueAt(pr.slug); return d !== null && d <= Date.now(); })
  .sort((a, b) => dueAt(a.slug) - dueAt(b.slug));
const unseen = () => ALL.filter(pr => !state.problems[pr.slug]);

function record(slug, result) {
  const prev = state.problems[slug];
  const n = result === 'solved' ? (prev && prev.s === 'solved' ? prev.n + 1 : 1) : 0;
  state.problems[slug] = { s: result, n, t: Date.now() };
  if (state.current === slug) { state.current = null; save('current'); }
  save('problems');
}

/* ---------- rendering ---------- */

const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const link = pr => `<a href="https://leetcode.com/problems/${pr.slug}/" target="_blank" rel="noopener" data-act="open" data-slug="${pr.slug}">${esc(pr.title)}</a>`;
const days = ms => Math.max(1, Math.ceil(ms / DAY));

function problemOrder(pr, kind) {
  const label = { review: 'Review, from a blank editor', resume: 'Pick up where you stopped', fresh: 'New problem' }[kind];
  return `<li class="order">
    <p class="order-kind${kind === 'review' ? ' is-due' : ''}">${label}</p>
    <p class="order-title">${link(pr)}</p>
    <p class="order-meta">${pr.level}, ${esc(pr.topic)}</p>
    <div class="order-actions">
      <button type="button" data-act="solved" data-slug="${pr.slug}" data-key="solved-${pr.slug}">Solved it</button>
      <button type="button" data-act="help" data-slug="${pr.slug}" data-key="help-${pr.slug}">Needed the solution</button>
    </div>
  </li>`;
}

function renderNext() {
  // An opened-but-unfinished problem comes first, then due reviews, then new problems.
  const current = state.current && !state.problems[state.current] ? BY_SLUG[state.current] : null;
  const due = dueNow()[0];
  const fresh = unseen()[0];
  const next = current ? problemOrder(current, 'resume')
    : due ? problemOrder(due, 'review')
    : fresh ? problemOrder(fresh, 'fresh') : null;

  document.getElementById('orders').innerHTML = next ||
    `<li class="order"><p class="order-title">Nothing is due.</p>
     <p class="order-meta">Every problem is solved and no review is due yet.</p></li>`;
}

function renderStats() {
  const solved = ALL.filter(pr => state.problems[pr.slug]).length;
  document.getElementById('stats').innerHTML = `
    <div><dt>of ${ALL.length} problems attempted</dt><dd>${solved}</dd></div>
    <div><dt>due for review</dt><dd>${dueNow().length}</dd></div>`;
}

const openPhases = new Set();
function problemRow(pr) {
  const r = state.problems[pr.slug];
  const st = r ? r.s : 'new';
  const word = { new: 'not started', solved: 'solved', help: 'needed the solution' }[st];
  const glyph = { new: '', solved: '✓', help: '?' }[st];
  let when = '';
  if (r) {
    const d = dueAt(pr.slug);
    when = d === null ? 'Learned' : d <= Date.now() ? '<span class="due">Review due</span>'
      : `Review in ${days(d - Date.now())} ${days(d - Date.now()) === 1 ? 'day' : 'days'}`;
  }
  return `<li class="prob is-${st}">
    <button type="button" class="mark" data-act="cycle" data-slug="${pr.slug}" data-key="cycle-${pr.slug}"
      aria-label="${esc(pr.title)}: ${word}. Change status">${glyph}</button>
    <span>${link(pr)}</span>
    <span class="prob-side">${when || pr.level}</span>
  </li>`;
}
function renderRoadmap() {
  document.getElementById('roadmap').innerHTML = PHASES.map(ph => {
    const all = ph.topics.flatMap(t => t.problems);
    const done = all.filter(pr => state.problems[pr.slug]).length;
    return `<details class="phase" data-phase="${ph.id}"${openPhases.has(ph.id) ? ' open' : ''}>
      <summary><span>${esc(ph.name)}</span><span class="count">${done} of ${all.length}</span></summary>
      <p class="phase-note">${esc(ph.note)}</p>
      ${ph.topics.map(t => `<div class="topic">
        <div class="topic-head"><h3>${esc(t.name)}</h3>
          <span class="count">${t.problems.filter(pr => state.problems[pr.slug]).length} of ${t.problems.length}</span></div>
        <ul class="probs">${t.problems.map(problemRow).join('')}</ul>
      </div>`).join('')}
    </details>`;
  }).join('');
}

function render() {
  const key = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.key : null;
  renderStats(); renderNext(); renderRoadmap();
  if (key) { const el = document.querySelector(`[data-key="${key}"]`); if (el) el.focus(); }
}

/* ---------- timer ---------- */

const timer = { left: TIMER_MS, endsAt: null, tick: null };
const readEl = document.getElementById('timer-read');
const toggleEl = document.getElementById('timer-toggle');
const msgEl = document.getElementById('timer-msg');
function paintTimer() {
  const left = timer.endsAt ? Math.max(0, timer.endsAt - Date.now()) : timer.left;
  const s = Math.ceil(left / 1000);
  readEl.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  toggleEl.textContent = timer.endsAt ? 'Pause timer' : left < TIMER_MS && left > 0 ? 'Resume timer' : 'Start timer';
  if (timer.endsAt && left === 0) {
    stopTimer(0);
    msgEl.textContent = 'Time. Finish in the next few minutes, or read the solution and rewrite it from memory.';
  }
}
function stopTimer(left) {
  clearInterval(timer.tick);
  timer.left = left; timer.endsAt = null; timer.tick = null;
  paintTimer();
}
function toggleTimer() {
  if (timer.endsAt) return stopTimer(Math.max(0, timer.endsAt - Date.now()));
  if (timer.left <= 0) timer.left = TIMER_MS;
  msgEl.textContent = '';
  timer.endsAt = Date.now() + timer.left;
  timer.tick = setInterval(paintTimer, 500);
  paintTimer();
}

/* ---------- events ---------- */

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const { act, slug } = el.dataset;
  switch (act) {
    case 'open':
      if (!state.problems[slug] && state.current !== slug) { state.current = slug; save('current'); }
      break; // let the link open
    case 'solved': case 'help': record(slug, act); break;
    case 'cycle': {
      const r = state.problems[slug];
      if (!r) record(slug, 'solved');
      else if (r.s === 'solved') record(slug, 'help');
      else { delete state.problems[slug]; save('problems'); }
      break;
    }
    case 'timer-toggle': toggleTimer(); return;
    case 'timer-reset': stopTimer(TIMER_MS); msgEl.textContent = ''; return;
    default: return;
  }
  render();
});

// <details> toggle does not bubble, so listen in the capture phase.
document.addEventListener('toggle', e => {
  const ph = e.target.dataset && e.target.dataset.phase;
  if (!ph) return;
  if (e.target.open) openPhases.add(ph); else openPhases.delete(ph);
}, true);

const first = unseen()[0];
openPhases.add(first ? first.phase : PHASES[0].id);
render();
paintTimer();
