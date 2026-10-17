// Empty state (DESIGN §13): one dashed card with an icon tile, a heading,
// one sentence and at most one primary button. No emoji or illustrations.

import { icon } from '../icons.js';
import { primaryButton } from './buttons.js';

// action: { label, onClick }, or omitted where no action makes sense.
export function emptyState({ iconName, heading, message, action }) {
  const card = document.createElement('div');
  card.className = 'empty-state';

  const tile = document.createElement('span');
  tile.className = 'empty-state__tile';
  tile.innerHTML = icon(iconName);

  const title = document.createElement('h2');
  title.className = 'empty-state__heading';
  title.textContent = heading;

  const text = document.createElement('p');
  text.className = 'empty-state__message';
  text.textContent = message;

  card.append(tile, title, text);
  if (action) card.append(primaryButton(action.label, { onClick: action.onClick }));
  return card;
}
