// icons.js — UI icons from Lucide (https://lucide.dev), copied in as inline SVG
// strings from lucide-static 1.48.0, plus movement-pattern icons from Atlas
// Icons (https://atlasicons.vectopus.com) and a placeholder logo mark, so
// nothing is fetched at runtime. All of them draw with currentColor, so CSS
// sets their color.
//
// ISC License (Lucide)
//
// Copyright (c) 2026 Lucide Icons and Contributors
//
// Permission to use, copy, modify, and/or distribute this software for any
// purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.
//
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
// ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
// ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
// OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
//
// ---
//
// Of the Lucide icons below, these are derived from the Feather project: plus,
// x, chevron-right, chevron-left, chevron-up, chevron-down, arrow-up-right,
// trash-2, search.
//
// The MIT License (MIT) (for the icons listed above)
//
// Copyright (c) 2013-present Cole Bemis
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// ---
//
// Atlas Icons — MIT License
//
// Copyright (c) 2022 Ramy Wafaa
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

const PATHS = {
  // UI
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  'arrow-up-down': '<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'circle-minus': '<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'chevron-up': '<path d="m18 15-6-6-6 6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'arrow-up-right': '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
  'trash-2': '<path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  search: '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',

  // Tabs
  'layout-grid': '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  'chart-line': '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/>',
  settings: '<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/>',};

// Movement-pattern icons from Atlas Icons (yoga and fitness-gym packs), copied
// in from @vectopus/atlas-icons 0.0.7's icon-font glyphs. Glyphs are drawn
// y-up on a 1024-unit em, so each is flipped into place; the viewBox is a
// square centered on the glyph. They're filled outlines, drawn in currentColor.
const PATTERNS = {
  squat: ['-169 -64 1024 1024', 'M251 939c67 0 121-54 121-121s-54-121-121-121c-67 0-121 54-121 121v0c0 67 54 121 121 121h0zM251 765c29 0 53 24 53 53s-24 53-53 53c-29 0-53-24-53-53v0c0-29 24-53 53-53h0zM295-85h-165v92l213 212h-234c-60 1-109 50-109 110v0c0 0 0 1 0 1 0 11 2 21 5 31l0-1 68 238c14 46 56 80 106 80h508v-68h-507c-19 0-35-13-40-30l0 0-68-239c-1-3-2-6-2-10 0 0 0 0 0 0v0 0c0-23 19-42 42-42l0 0h307v-92l-213-212h91zM197 243l-66 19 87 304 66-19z'],   // squat-pose
  hinge: ['0 -64 1024 1024', 'M1013 138h-117v511h-2l-494-304c-22-14-36-38-36-65 0-42 34-76 76-76h359v-67h-359c-79 0-142 64-142 143 0 51 27 96 67 121l1 0 510 314h87v-511h50zM478 229l-37 56 175 116c25 17 42 46 42 79 0 11-2 21-5 31l0-1-12 35 63 21 12-35c5-15 8-33 8-51 0-56-28-105-71-134l-1 0zM140 418c77 0 140-63 140-140s-63-140-140-140c-77 0-140 63-140 140v0c0 77 63 140 140 140h0zM140 205c40 0 73 33 73 73s-33 73-73 73c-40 0-73-33-73-73v0c0-40 33-73 73-73h0z'],   // bridge-yoga-pose
  lunge: ['-81 -64 1024 1024', 'M862-85h-120v258h-311v68h378v-258h53zM322-85h-322v68h281l116 233v206c0 66 54 120 120 120s120-54 120-120v0-129h-68v129c0 29-23 52-52 52s-52-23-52-52v0-222zM465 422h-68v517h68zM538 800c78 0 141-63 141-141s-63-141-141-141c-78 0-141 63-141 141v0c0 78 63 141 141 141h0zM538 585c41 0 74 33 74 74s-33 74-74 74c-41 0-74-33-74-74v0c0-41 33-74 74-74h0z'],   // lunge-pose
  horizontalPush: ['0 -64 1024 1024', 'M67 150h-67v150l602 258c12 5 26 8 40 8 0 0 0 0 0 0h0c57 0 104-47 104-104v-234h137v-67h-203v301c0 20-17 37-37 37 0 0 0 0 0 0h0c0 0 0 0 0 0-5 0-11-1-15-3l0 0-561-240zM387 247l-27 61 340 146 26-61zM883 694c65 0 118-53 118-118s-53-118-118-118c-65 0-118 53-118 118v0c0 65 53 118 118 118h0zM883 524c29 0 52 23 52 52s-23 52-52 52c-29 0-52-23-52-52v0c0-29 23-52 52-52h0z'],   // plank-pose
  verticalPush: ['-167.5 -64 1024 1024', 'M344 154c66 0 120-54 120-120s-54-120-120-120c-66 0-120 54-120 120v0c0 66 54 120 120 120h0zM344-18c29 0 52 23 52 52s-23 52-52 52c-29 0-52-23-52-52v0c0-29 23-52 52-52h0zM689-85h-120v223l-143 36h-164l-143-36v-223h-120v68h52v208l202 51h180l202-51v-208h52zM464 173h-239v766h68v-698h104v698h68z'],   // handstand-pose
  horizontalPull: ['0 -73 1042 1042', 'M1042 870h-1042v68h1042zM217 331c115 0 208-93 208-208s-93-208-208-208c-115 0-208 93-208 208v0c0 115 93 208 208 208h0zM217-17c77 0 140 63 140 140s-63 140-140 140c-77 0-140-63-140-140v0c0-77 63-140 140-140h0zM825 331c115 0 208-93 208-208s-93-208-208-208c-115 0-208 93-208 208v0c0 115 93 208 208 208h0zM825-17c77 0 140 63 140 140s-63 140-140 140c-77 0-140-63-140-140v0c0-77 63-140 140-140h0zM251 210h-68v695h68zM859 210h-68v695h68z'],   // balance-rings
  verticalPull: ['-9 -64 1024 1024', 'M67-85h-67v1024h67zM537-85h-67v1024h67zM1006-85h-67v768h67zM503 820h-470v67h470zM973 564h-470v67h470z'],   // lifting-bars
  core: ['-126 -64 1024 1024', 'M164 939c91 0 164-74 164-164s-74-164-164-164c-91 0-164 74-164 164v0c0 91 74 164 164 164h0zM164 678c53 0 96 43 96 96s-43 96-96 96c-53 0-96-43-96-96v0c0-53 43-96 96-96h0zM223-85h-2c-98 1-177 80-177 178v334c1 67 54 120 121 121l0 0h608v-68h-608c-29 0-52-24-53-53v-334c1-61 50-110 111-110 40 0 75 21 95 53l213 379h103v-432h52v-68h-121v424l-189-336c-32-53-89-88-154-88h0zM329-31h-68v414h68z'],   // sit-ups-pose
  accessory: ['0 -64 1024 1024', 'M334 229c-66 73-119 160-153 256l-2 5 63 22c33-92 81-172 142-240l-1 1zM289-84c-92 0-163 127-206 233-45 104-75 224-82 350l0 3v207c0 19 4 37 11 53l0-1 62-25c-3-8-5-17-6-27v-207c8-120 35-231 80-334l-3 7c58-142 114-192 145-192 226 0 396 206 476 328l8 12 14 2c85 15 149 88 149 176 0 99-80 179-179 179s-179-80-179-179c0 0 0-1 0-1v0-21l-19-9c-46-23-86-49-122-80l1 1c-29-33-47-76-47-124 0-5 0-10 1-15l0 1v-1c1-29 6-57 14-83l-1 2-64-19c-9 29-15 62-16 96l0 1c0 6-1 12-1 19 0 66 25 126 67 171l0 0 1 2 2 1c35 30 74 56 115 79l4 2c10 127 116 226 245 226 136 0 246-110 246-246 0-116-80-213-188-239l-2 0c-91-135-274-347-524-347zM225 916c124 0 225-101 225-225s-101-225-225-225c-124 0-225 101-225 225v0c0 124 101 225 225 225h0zM225 534c87 0 158 71 158 158s-71 158-158 158c-87 0-158-71-158-158v0c0-87 71-158 158-158h0zM225 746c30 0 55-25 55-55s-25-55-55-55c-30 0-55 25-55 55v0c0 30 25 55 55 55h0z'],   // strength
};

/** An icon as an SVG string. Decorative: pair it with visible text or an aria-label. */
export function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`;
}

/** The icon for a movement pattern; unknown patterns get the accessory icon. */
export function patternIcon(pattern) {
  const [viewBox, d] = PATTERNS[pattern] ?? PATTERNS.accessory;
  return `<svg class="icon pattern-art" viewBox="${viewBox}" fill="currentColor" aria-hidden="true" focusable="false">` +
    `<path transform="matrix(1 0 0 -1 0 896)" d="${d}"/></svg>`;
}

/** The logo mark, for the Board header. A placeholder until the mark is drawn:
 *  replace this one SVG string. Decorative, like the icons. */
export const logoMark = () =>
  '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">' +
  '<rect x="3" y="3" width="18" height="18" rx="6"/></svg>';
