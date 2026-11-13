// Inline SVG icons, 24×24. Size, stroke and colour come from `.icon` in
// style.css; `.f` marks filled details. Shuffle, undo, redo, bookmark, link, chevrons-up-down,
// download, upload, plus, minus, scissors, the arrows and x are Lucide shapes
// (ISC licence); the rest are drawn for Song Seed.
const svg = (body) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;

const SPEAKER = '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/>';

export const ICONS = {
  play: svg('<path class="f" d="M7 4.6v14.8a1 1 0 0 0 1.5.86l12.2-7.4a1 1 0 0 0 0-1.72L8.5 3.74A1 1 0 0 0 7 4.6z"/>'),
  stop: svg('<rect class="f" x="6" y="6" width="12" height="12" rx="2"/>'),
  shuffle: svg('<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"/><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"/>'),
  undo: svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/>'),
  redo: svg('<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13"/>'),
  bookmark: svg('<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>'),
  link: svg('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
  // Both shackles; CSS shows the closed one when the lock's aria-pressed is true.
  lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path class="sh-closed" d="M8 11V7.5a4 4 0 0 1 8 0V11"/><path class="sh-open" d="M8 11V7.5a4 4 0 0 1 7.76-1.37"/>'),
  dice: svg('<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle class="f" cx="8.5" cy="8.5" r="1.4"/><circle class="f" cx="12" cy="12" r="1.4"/><circle class="f" cx="15.5" cy="15.5" r="1.4"/>'),
  speaker: svg(`${SPEAKER}<path d="M15.5 9.5a3.5 3.5 0 0 1 0 5"/><path d="M18.5 6.5a8 8 0 0 1 0 11"/>`),
  speakerOff: svg(`${SPEAKER}<path d="M3.5 3.5l17 17"/>`),
  trash: svg('<path d="M4 7h16"/><path d="M9.5 7V4.5h5V7"/><path d="M6.5 7l.8 12.2a1.5 1.5 0 0 0 1.5 1.3h6.4a1.5 1.5 0 0 0 1.5-1.3L17.5 7"/><path d="M10 11v6M14 11v6"/>'),
  download: svg('<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>'),
  upload: svg('<path d="M12 3v12"/><path d="m17 8-5-5-5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>'),
  plus: svg('<path d="M5 12h14"/><path d="M12 5v14"/>'),
  minus: svg('<path d="M5 12h14"/>'),
  scissors: svg('<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>'),
  arrowLeft: svg('<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>'),
  arrowRight: svg('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  chevron: svg('<path d="M6 9l6 6 6-6"/>'),
  chevronsUpDown: svg('<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>'),
  x: svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
};

// Fill every <span data-icon="name"> in the page.
export function paintIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = ICONS[el.dataset.icon] || ''; });
}
