// Temporary placeholder body shared by every view until its real step lands.

export function renderPlaceholder(container, name) {
  const heading = document.createElement('h2');
  heading.className = 'placeholder-title';
  heading.textContent = `${name} placeholder`;
  container.replaceChildren(heading);
}
