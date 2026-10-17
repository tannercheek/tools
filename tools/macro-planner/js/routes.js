// Route table and hash parsing. Pure: no DOM, so it can be tested in Node.

export const TABS = [
  { id: 'today', label: 'Today', icon: 'disc' },
  { id: 'plan', label: 'Plan', icon: 'calendar' },
  { id: 'meals', label: 'Meals', icon: 'soup' },
  { id: 'stats', label: 'Stats', icon: 'chart-no-axes-column' },
];

// Routes shown inside a tab under its segmented control (SPEC §5), by tab.
// The first is where the tab opens, so it shares the tab's id.
export const SEGMENTS = {
  meals: [
    { id: 'meals', label: 'Meals' },
    { id: 'foods', label: 'Foods' },
  ],
};

// Pushed screens open over the tabs with a back button.
// 'components' is an unlinked showcase of js/ui/ for checking; step 7.2 removes it.
export const PUSHED = [
  { id: 'settings', label: 'Settings' },
  { id: 'components', label: 'Components' },
];

export const DEFAULT_ROUTE = 'today';

const ROUTE_IDS = new Set([...TABS, ...PUSHED, ...Object.values(SEGMENTS).flat()].map((route) => route.id));

export function hashFor(id) {
  return `#/${id}`;
}

// '#/plan' → 'plan'. Anything that isn't a known route → null.
export function parseRoute(hash) {
  const match = /^#\/([a-z]+)$/.exec(hash ?? '');
  return match && ROUTE_IDS.has(match[1]) ? match[1] : null;
}

export function isPushed(id) {
  return PUSHED.some((route) => route.id === id);
}

// The tab or pushed screen a route belongs to: 'foods' → 'meals', anything else → itself.
export function tabFor(id) {
  return Object.keys(SEGMENTS).find((tab) => SEGMENTS[tab].some((segment) => segment.id === id)) ?? id;
}

export function routeLabel(id) {
  return [...TABS, ...PUSHED].find((route) => route.id === id)?.label ?? null;
}
