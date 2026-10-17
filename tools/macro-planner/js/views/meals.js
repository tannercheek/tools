// Meals tab: a Meals / Foods segmented control over the chosen segment (SPEC §5, DESIGN §11).

import { SEGMENTS } from '../routes.js';
import { segmentedControl } from '../ui/controls.js';
import * as foods from './foods.js';
import { renderPlaceholder } from './placeholder.js';

// The Meals segment keeps its placeholder until step 4.2.
const SEGMENT_VIEWS = {
  meals: { render: (container) => renderPlaceholder(container, 'Meals') },
  foods,
};

// route: the segment to show. A switch only swaps the content below the control,
// so the pill slides (DESIGN §14), and replaceRoute records it without a history entry.
// store is passed on to the segment.
export function render(container, { route, replaceRoute, store }) {
  const body = document.createElement('div');
  body.className = 'segment-body';

  const control = segmentedControl({
    label: 'Meals or foods',
    value: route,
    options: SEGMENTS.meals.map(({ id, label }) => ({ value: id, label })),
    onChange: (segment) => {
      replaceRoute(segment);
      SEGMENT_VIEWS[segment].render(body, { store });
    },
  });

  container.replaceChildren(control.element, body);
  SEGMENT_VIEWS[route].render(body, { store });
}
