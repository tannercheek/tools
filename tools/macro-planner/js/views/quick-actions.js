// Today's quick actions (SPEC §3.6, DESIGN §8): four compact buttons between the rings and the
// slots, each opening a sheet that already exists. One that doesn't apply to the day shown is
// disabled rather than hidden, so the row keeps its four places.

import { compactButton } from '../ui/buttons.js';

// Each callback runs on its button's tap. Returns the row, the buttons focus can go back to, and
// show({ canAdd, canGoOffPlan }) for the day shown: canAdd is false on a day that takes nothing,
// and canGoOffPlan false on a day off plan can't start or that's already off plan.
export function quickActions({ onAddFood, onQuickNumbers, onWeighIn, onOffPlan }) {
  const addFood = compactButton('apple', 'Add food', { onClick: onAddFood });
  // "Quick numbers" is too long for the button at 360px, so it shows the add sheet segment it
  // opens on, and keeps the full name for screen readers.
  const quickNumbers = compactButton('hash', 'Quick', { onClick: onQuickNumbers });
  quickNumbers.setAttribute('aria-label', 'Quick numbers');
  const weighIn = compactButton('weight', 'Weigh in', { onClick: onWeighIn });
  const offPlan = compactButton('calendar-off', 'Off plan', { onClick: onOffPlan });

  const element = document.createElement('div');
  element.className = 'today__actions';
  element.append(addFood, quickNumbers, weighIn, offPlan);

  return {
    element,
    addFood,
    quickNumbers,
    offPlan,
    show({ canAdd, canGoOffPlan }) {
      addFood.disabled = !canAdd;
      quickNumbers.disabled = !canAdd;
      offPlan.disabled = !canGoOffPlan;
    },
  };
}
