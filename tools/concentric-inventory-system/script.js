// Concentric Inventory System

const ringsConfig = {
  totalRings: 7,
  // These must match your CSS .ring-* diameters
  ringDiameters: [130, 190, 250, 310, 370, 430, 490],
  // This must match .profile-circle diameter
  profileDiameter: 80,
};

// DOM references
const ringsSystem = document.querySelector(".rings-system");
const rings = Array.from(document.querySelectorAll(".ring"));

if (!ringsSystem || rings.length === 0) {
  console.warn("Rings system not found or no rings present.");
}

// Base radii (from CSS diameters)
const baseRadii = ringsConfig.ringDiameters.map((d) => d / 2);
const profileRadius = ringsConfig.profileDiameter / 2;

// These will change as we hover/select
let currentRadii = [...baseRadii];

// State
let selectedIndex = 0; // default: EDC (ring-1)
let hoverIndex = -1;
let selectedRing = rings[0];

// Mark default selected ring
if (selectedRing) {
  selectedRing.classList.add("ring--selected");
}

// Center of the ring system in viewport coords
let centerX = 0;
let centerY = 0;

function updateCenter() {
  if (!ringsSystem) return;
  const rect = ringsSystem.getBoundingClientRect();
  centerX = rect.left + rect.width / 2;
  centerY = rect.top + rect.height / 2;
}

updateCenter();
window.addEventListener("resize", updateCenter);

// Compute layout so that:
// - ring at index "index" expands
// - all outer rings move outward by the SAME delta
// - inner rings stay in place
function recomputeLayout(mode, index) {
  // If no controlling index, fall back to base layout
  if (index < 0 || index >= baseRadii.length) {
    currentRadii = [...baseRadii];
  } else {
    const factorSelected = 1.22; // bigger "pop" when selected
    const factorHover = 1.08; // subtle nudge when hovered

    const factor = mode === "selected" ? factorSelected : factorHover;

    const newRadii = [...baseRadii];

    // Boosted radius for the controlling ring
    const boostedRadius = baseRadii[index] * factor;
    const delta = boostedRadius - baseRadii[index];

    for (let i = 0; i < newRadii.length; i++) {
      if (i < index) {
        // inner rings untouched
        newRadii[i] = baseRadii[i];
      } else if (i === index) {
        // controlling ring gets boosted radius
        newRadii[i] = boostedRadius;
      } else {
        // outer rings are pushed outward by the same delta
        newRadii[i] = baseRadii[i] + delta;
      }
    }

    currentRadii = newRadii;
  }

  // Apply to DOM (diameter = 2 * radius)
  rings.forEach((ring, i) => {
    const diameter = currentRadii[i] * 2;
    ring.style.width = `${diameter}px`;
    ring.style.height = `${diameter}px`;
  });
}

// Map distance from center to ring index based on current radii
function getRingIndexForRadius(r) {
  for (let i = 0; i < currentRadii.length; i++) {
    const inner = i === 0 ? profileRadius : currentRadii[i - 1];
    const outer = currentRadii[i];

    if (r >= inner && r <= outer) {
      return i;
    }
  }
  return -1;
}

// Hover state helpers
function setHoverIndex(newIndex) {
  if (newIndex === hoverIndex) return;

  // Clear old hover class
  if (hoverIndex !== -1 && rings[hoverIndex]) {
    rings[hoverIndex].classList.remove("ring--hover");
  }

  hoverIndex = newIndex;

  if (hoverIndex !== -1 && rings[hoverIndex]) {
    rings[hoverIndex].classList.add("ring--hover");
  }

  // Layout driven by hover when hovering, else by selection
  if (hoverIndex !== -1) {
    recomputeLayout("hover", hoverIndex);
  } else {
    recomputeLayout("selected", selectedIndex);
  }
}

// Selection helper
function setSelectedIndex(newIndex) {
  if (newIndex === selectedIndex || newIndex < 0 || newIndex >= rings.length) {
    return;
  }

  // Remove old selected class
  if (selectedRing) {
    selectedRing.classList.remove("ring--selected");
  }

  selectedIndex = newIndex;
  selectedRing = rings[selectedIndex];

  if (selectedRing) {
    selectedRing.classList.add("ring--selected");
    const ringId = selectedRing.dataset.ringId || `ring-${selectedIndex + 1}`;
    console.log("Selected ring:", ringId);
  }

  // If not hovering, the selection controls layout
  if (hoverIndex === -1) {
    recomputeLayout("selected", selectedIndex);
  }
}

// Mouse handlers

function handleMouseMove(event) {
  if (!ringsSystem) return;

  const dx = event.clientX - centerX;
  const dy = event.clientY - centerY;
  const r = Math.sqrt(dx * dx + dy * dy);

  const index = getRingIndexForRadius(r);
  setHoverIndex(index);
}

function handleMouseLeave() {
  setHoverIndex(-1);
}

function handleClick() {
  if (hoverIndex !== -1) {
    setSelectedIndex(hoverIndex);
  }
}

// Attach listeners to the container (not individual rings)
if (ringsSystem) {
  ringsSystem.addEventListener("mousemove", handleMouseMove);
  ringsSystem.addEventListener("mouseleave", handleMouseLeave);
  ringsSystem.addEventListener("click", handleClick);
}

// Initial layout: driven by the selected ring (EDC)
recomputeLayout("selected", selectedIndex);

console.log(
  "Concentric Inventory System script loaded. Total rings:",
  ringsConfig.totalRings
);
