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

// Pushed screens open over the tabs with a back button. One with `param` always takes a
// record id after its own ('#/meal/<id>'); `parent` is where Back goes when there's no
// history to pop.
export const PUSHED = [
  { id: 'settings', label: 'Settings' },
  { id: 'meal', label: 'Meal', param: true, parent: 'meals' },
];

export const DEFAULT_ROUTE = 'today';

const ROUTE_IDS = new Set([...TABS, ...PUSHED, ...Object.values(SEGMENTS).flat()].map((route) => route.id));

// A route is a string: 'plan', or 'meal/<id>' for a screen with a param.
export function hashFor(route) {
  return `#/${route}`;
}

export function mealRoute(mealId) {
  return `meal/${mealId}`;
}

// 'meal/<id>' → 'meal'; a route without a param is its own base.
function routeBase(route) {
  return route.split('/')[0];
}

// 'meal/<id>' → '<id>'; null for a route without a param.
export function routeParam(route) {
  return route.split('/')[1] ?? null;
}

function pushedRoute(route) {
  return PUSHED.find(({ id }) => id === routeBase(route));
}

// '#/plan' → 'plan', '#/meal/<id>' → 'meal/<id>'. Anything that isn't a known route,
// or has a param missing or where none belongs, → null.
export function parseRoute(hash) {
  const match = /^#\/([a-z]+)(?:\/([0-9a-z-]+))?$/.exec(hash ?? '');
  if (!match || !ROUTE_IDS.has(match[1])) return null;
  const [, id, param] = match;
  if (Boolean(param) !== Boolean(pushedRoute(id)?.param)) return null;
  return param ? `${id}/${param}` : id;
}

export function isPushed(route) {
  return Boolean(pushedRoute(route));
}

// The tab or pushed screen a route belongs to: 'foods' → 'meals', 'meal/<id>' → 'meal',
// anything else → itself.
export function tabFor(route) {
  const base = routeBase(route);
  return Object.keys(SEGMENTS).find((tab) => SEGMENTS[tab].some((segment) => segment.id === base)) ?? base;
}

export function routeLabel(route) {
  return [...TABS, ...PUSHED].find(({ id }) => id === routeBase(route))?.label ?? null;
}

// Where Back goes from a pushed screen opened by a refresh or a link, with nothing to pop.
export function backRoute(route) {
  return pushedRoute(route)?.parent ?? DEFAULT_ROUTE;
}
