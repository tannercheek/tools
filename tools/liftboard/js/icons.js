// icons.js — UI icons from Lucide (https://lucide.dev), copied in as inline SVG
// strings from lucide-static 1.48.0; equipment icons from Atlas Icons (below,
// with their license); and the logo mark from brand/. Nothing is fetched at
// runtime. All of them draw with currentColor, so CSS sets their color; the
// two-tone logo's two parts are colored by class in style.css instead.
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
// minus, x, chevron-right, chevron-left, chevron-up, chevron-down, arrow-up-right,
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

export const PATHS = {
  // UI
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
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

// Equipment icons: Atlas Icons (https://atlasicons.vectopus.com), bold weight,
// redrawn from their published outlines onto Lucide's 24×24 grid. Each fills
// Lucide's 20px drawing area (the wide barbell may use the full 24px width),
// and its stroke-width thickens the filled outline to Lucide's ~2px line weight.
// Each entry is the whole inside of one icon, so other art can replace it with
// a single string drawn the same way: filled, on a 24×24 grid.
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
export const EQUIPMENT_PATHS = {
  barbell: '<path d="M4 4.96c1.68 0 3.04 1.36 3.04 3.04v8c0 1.68-1.36 3.04-3.04 3.04s-3.04-1.36-3.04-3.04v0v-8c0-1.68 1.36-3.04 3.04-3.04h0zM4 16.96c.53 0 .95-.43 .95-.95v-8c0-.53-.43-.95-.95-.95s-.95 .43-.95 .95v0v8c0 .53 .43 .95 .95 .95h0zM20 4.96c1.68 0 3.04 1.36 3.04 3.04v8c0 1.68-1.36 3.04-3.04 3.04s-3.04-1.36-3.04-3.04v0v-8c0-1.68 1.36-3.04 3.04-3.04h0zM20 16.96c.53 0 .95-.43 .95-.95v-8c0-.53-.43-.95-.95-.95s-.95 .43-.95 .95v0v8c0 .53 .43 .95 .95 .95h0zM2 13.04h-2v-2.09h2zM18 13.04h-12v-2.09h12zM24 13.04h-2v-2.09h2z" stroke-width="0"/>',   // at-weights-gym
  dumbbell: '<path d="M19.25 12.04c-.72 0-1.37-.3-1.84-.77l-4.7-4.7c-.44-.46-.71-1.09-.71-1.79c0-.04 0-.09 0-.13l0 .01c.01-1.42 1.16-2.56 2.58-2.56c0 0 0 0 0 0h.02c.7 .02 1.33 .32 1.79 .79l0 0l4.73 4.73c.47 .47 .76 1.12 .76 1.83c0 1.42-1.15 2.58-2.57 2.59h0zM13.95 5.37l4.69 4.69c.16 .16 .38 .26 .62 .26c.01 0 .01 0 .02 0l0 0h.02c.48 0 .86-.39 .86-.86v0v-.01c0 0 0 0 0 0c0-.24-.1-.46-.25-.61v0l-4.75-4.75c-.15-.16-.37-.27-.61-.27c-.46 0-.83 .37-.83 .83c0 .01 0 .02 0 .04l0 0v.05c0 .02 0 .03 0 .05c0 .23 .09 .43 .23 .59l0 0zM9.42 21.9v0c-.7 0-1.33-.28-1.79-.74l0 0l-.01-.01l-4.73-4.73c-.47-.47-.76-1.12-.76-1.83c0-1.42 1.15-2.58 2.57-2.59h0c.03 0 .07 0 .11 0c.69 0 1.32 .27 1.78 .71l0 0l.02 .02l4.64 4.73c.48 .47 .77 1.12 .77 1.84c0 1.43-1.16 2.59-2.59 2.59c0 0 0 0 0 0h0zM8.83 19.93c.15 .15 .36 .24 .6 .24c.47 0 .86-.38 .86-.86c0 0 0 0 0-.01v0v-.01c0 0 0 0 0-.01c0-.24-.1-.46-.26-.61l-.01-.01l-4.64-4.73c-.15-.14-.36-.23-.58-.23c-.02 0-.03 0-.05 0l0 0h-.04c-.48 0-.86 .39-.86 .86v0v.01c0 .24 .1 .46 .26 .62l0 0zM14.53 5.93l3.54 3.54l-8.61 8.61l-3.54-3.54zM15.64 9.47l-1.11-1.11l-6.18 6.18l1.11 1.11z" stroke-width="0.2"/>',   // at-dumbbell-gym
  machine: '<path d="M4.72 5.47c1.36 0 2.47 1.11 2.47 2.47v3.24c0 1.36-1.1 2.47-2.47 2.47s-2.47-1.1-2.47-2.47v0v-3.24c0-1.36 1.11-2.47 2.47-2.47h0zM4.72 11.95c.43 0 .77-.35 .77-.77v-3.24c0-.43-.35-.77-.77-.77s-.77 .35-.77 .77v0v3.24c0 .43 .35 .77 .77 .77h0zM19.28 5.47c1.36 0 2.47 1.11 2.47 2.47v3.24c0 1.36-1.1 2.47-2.47 2.47s-2.47-1.1-2.47-2.47v0v-3.24c0-1.36 1.11-2.47 2.47-2.47h0zM19.28 11.95c.43 0 .77-.35 .77-.77v-3.24c0-.43-.35-.77-.77-.77s-.77 .35-.77 .77v0v3.24c0 .43 .35 .77 .77 .77h0zM7.18 19.27h-1.7v-15.38h1.7zM18.51 19.27h-1.7v-15.38h1.7zM17.66 10.4h-11.33v-1.7h11.33zM15.24 16.07h-6.48v-1.7h6.48zM12.85 19.27h-1.7v-4.04h1.7zM7.96 20.11h-3.24v-1.7h3.24zM13.62 20.11h-3.24v-1.7h3.24zM19.28 20.11h-3.24v-1.7h3.24z" stroke-width="0.5"/>',   // at-weight-lifting
  cable: '<path d="M8.74 14.41h6.54c1.37 0 2.49 1.11 2.49 2.49v2.49h-11.51v-2.49c0-1.37 1.11-2.49 2.49-2.49h0zM16.06 17.68v-.78c0-.43-.35-.78-.78-.78h-6.54c-.43 0-.78 .35-.78 .78v.78zM9.59 21.8h-1.7v-3.26h1.7zM16.12 21.8h-1.7v-3.26h1.7zM7.88 3.8h8.24v12.32h-8.24zM14.42 5.51h-4.83v8.91h4.83zM12.85 7.92h-1.7v-5.72h1.7zM19.56 10.15l-1.38-1.38h-12.36l-1.38 1.38l-1.21-1.2l1.87-1.89h13.79l1.87 1.89z" stroke-width="0.4"/>',   // at-weights-chair
  bodyweight: '<path d="M3.84 21.84h-1.72v-19.68h1.72zM12.86 21.84h-1.72v-19.68h1.72zM21.88 21.84h-1.72v-14.76h1.72zM12 4.65h-9.02v-1.72h9.02zM21.02 9.58h-9.02v-1.72h9.02z" stroke-width="0.24"/>',   // at-lifting-bars
  kettlebell: '<path d="M17.02 9.38l-1.59-.68l1.39-3.24c.06-.14 .1-.3 .1-.47v0c0 0 0 0 0 0c0-.65-.53-1.18-1.18-1.18c0 0 0 0 0 0h-7.45c0 0 0 0 0 0c-.65 0-1.18 .53-1.18 1.18c0 0 0 0 0 .01v0c0 .17 .04 .33 .1 .48l0-.01l1.39 3.24l-1.59 .68l-1.39-3.25c-.14-.33-.23-.72-.23-1.13v0c0-.01 0-.01 0-.02c0-1.61 1.3-2.91 2.91-2.91c0 0 0 0 0 0h7.45c0 0 0 0 0 0c1.61 0 2.91 1.3 2.91 2.91c0 0 0 .01 0 .01v0c0 .41-.09 .8-.24 1.16l.01-.02v.01zM12.01 7.01v0c5.03 .01 9.1 4.09 9.1 9.12c0 0 0 0 0 0v0v.41c0 .05 0 .12 0 .18c0 1.1-.22 2.15-.61 3.11l.02-.06c-.2 .51-.51 .94-.9 1.28l0 0l-.01 .01c-.64 .54-1.48 .86-2.39 .86h-10.39c0 0 0 0 0 0c-.92 0-1.77-.33-2.42-.88l.01 0l-.01-.01c-.4-.35-.71-.79-.91-1.28l-.01-.02c-.37-.9-.58-1.95-.58-3.04c0-.01 0-.02 0-.02v0v-.56c0-5.03 4.08-9.11 9.12-9.11c0 0 0 0 0 0v0zM18.49 19.75c.18-.16 .32-.36 .41-.58l0-.01v-.01c.3-.72 .47-1.55 .47-2.42c0-.05 0-.1 0-.16l0 .01v-.44c0 0 0 0 0 0c0-4.08-3.3-7.38-7.38-7.38c-4.07 0-7.38 3.3-7.38 7.38v.56c0 .01 0 .01 0 .02c0 .87 .17 1.7 .47 2.46l-.02-.04c.1 .25 .25 .46 .44 .62l0 0c.35 .29 .81 .47 1.3 .47c0 0 .01 0 .01 0h10.39c.49 0 .93-.18 1.28-.46l0 0zM8.75 18.6h-1.73v-6.6h1.73zM11.22 18.68h-1.73v-.86c0-.89-.72-1.61-1.61-1.61h0v-1.73c0 0 0 0 0 0c.89 0 1.61-.72 1.61-1.61c0 0 0-.01 0-.01v0v-.86h1.73v.86c0 0 0 0 0 0c0 .92-.37 1.76-.97 2.36l0 0q-.06 .06-.12 .12q.06 .05 .12 .11c.6 .6 .98 1.43 .98 2.35c0 0 0 .01 0 .01v0zM14.49 18.64h-.03c-1.36-.04-2.45-1.15-2.45-2.51c0 0 0 0 0 0v0v-1.68c.04-1.33 1.11-2.4 2.44-2.45l0 0h1.68v1.73h-1.63c-.41 .02-.74 .35-.76 .76l0 0v1.63c0 0 0 0 0 .01c0 .42 .34 .76 .76 .76c.41 0 .74-.32 .76-.73l0 0h-.79v-1.73h2.51v1.68c0 0 0 .01 0 .01c0 1.38-1.12 2.51-2.51 2.51c0 0 0 0 0 0v0z" stroke-width="0.13"/>',   // at-kg-weight
  band: '<path d="M8.73 7.89c0 0 0 0 0 0c2.61 0 4.86 1.52 5.92 3.72l.02 .04c.4 .82 .64 1.79 .64 2.81c0 0 0 .01 0 .01v0c0 3.63-2.95 6.58-6.58 6.58s-6.58-2.95-6.58-6.58v0c0 0 0-.01 0-.01c0-1.02 .24-1.99 .66-2.85l-.02 .04c1.08-2.24 3.33-3.76 5.94-3.76h0zM8.73 19.34c2.69 0 4.86-2.18 4.87-4.87v0c0 0 0-.01 0-.01c0-.75-.17-1.46-.48-2.09l.01 .03v-.01c-.8-1.66-2.46-2.78-4.39-2.78s-3.59 1.12-4.38 2.75l-.01 .03v.01c-.3 .6-.47 1.31-.47 2.07c0 0 0 .01 0 .01v0c0 2.68 2.17 4.86 4.86 4.87h0zM8.73 11.16c1.31 0 2.44 .76 2.98 1.86l.01 .02c.2 .41 .32 .88 .32 1.39v0c0 .05 0 .11 0 .17c0 1.83-1.48 3.31-3.31 3.31s-3.31-1.48-3.31-3.31c0-.06 0-.12 0-.18l0 .01c.01-.5 .12-.98 .33-1.4l-.01 .02c.55-1.12 1.68-1.89 2.98-1.89h0zM8.73 16.22c0 0 0 0 0 0c.88 0 1.6-.72 1.6-1.6c0-.03 0-.07 0-.1l0 0v-.05c0 0 0 0 0 0c0-.24-.06-.47-.16-.68l0 .01v-.01c-.26-.54-.81-.91-1.44-.91s-1.18 .37-1.44 .9l0 .01v.01c-.1 .19-.15 .42-.15 .67c0 0 0 0 0 0v0v.05c0 .03 0 .06 0 .09c0 .88 .71 1.6 1.59 1.6h0zM8.75 2.95h.01l13.1 .04v6.62h-13.12c-1.92 .01-3.57 1.13-4.36 2.75l-.01 .03v.01c-.29 .6-.47 1.3-.47 2.05v.03h-1.71v-4.89c0-.03 0-.06 0-.09c0-.32 .03-.63 .09-.94l0 .03c.47-3.2 3.2-5.63 6.49-5.63h0zM20.14 4.69l-11.39-.03c-2.43 .01-4.44 1.81-4.79 4.14l0 .03l-.01 .03c-.04 .18-.06 .4-.06 .62c0 .02 0 .05 0 .07l0 0v.49c1.2-1.32 2.92-2.15 4.83-2.15h11.41zM18.58 7.11h-1.71v-3.27h1.71zM15.31 6.3h-1.71v-2.46h1.71zM12.04 7.11h-1.71v-3.27h1.71zM8.77 6.3h-1.71v-2.46h1.71z" stroke-width="0.3"/>',   // at-tape-measure
  other: '<path d="M7.88 21.26c-1.93 0-3.38-2.53-4.26-4.66c-.89-2.05-1.48-4.42-1.62-6.92l0-.06v-4.03c0-1.51 1.18-2.74 2.67-2.82l.01 0c.24-.02 .52-.03 .8-.03c.62 0 1.23 .05 1.82 .15l-.06-.01c.95 .08 1.76 .61 2.2 1.39l.01 .01c.16 .4 .25 .86 .25 1.35c0 .83-.27 1.6-.72 2.23l.01-.01c-.43 .71-1.04 1.26-1.78 1.6l-.02 .01c.4 1.11 .9 2.07 1.51 2.95l-.03-.04c.23-.67 .58-1.25 1.04-1.73l0 0l.03-.03l.04-.03c.66-.55 1.39-1.05 2.17-1.47l.07-.03c.28-2.53 2.41-4.47 4.98-4.47c2.77 0 5.01 2.24 5.01 5.01c0 2.33-1.58 4.28-3.73 4.85l-.03 .01c-1.82 2.66-5.43 6.78-10.35 6.78zM5.55 4.48c-.24 0-.49 .01-.78 .02c-.58 .03-1.03 .51-1.03 1.09c0 0 0 0 0 0v0v4.03c.15 2.31 .68 4.46 1.54 6.43l-.05-.12c1.02 2.47 2.09 3.59 2.65 3.59c4.3 0 7.55-3.95 9.11-6.3l.21-.31l.37-.07c1.55-.28 2.71-1.62 2.71-3.23c0-1.81-1.47-3.28-3.28-3.28s-3.28 1.47-3.28 3.28c0 0 0 0 0 0v0v.55l-.49 .24c-.88 .43-1.64 .92-2.33 1.49l.02-.02c-1.37 1.47-.6 4.08-.59 4.11l-1.65 .52c-.15-.48-.25-1.04-.29-1.62l0-.02c-.73-.85-1.39-1.8-1.94-2.82l-.04-.09c-.56-.9-.94-1.98-1.07-3.12l0-.04v-.87h.87c.59-.11 1.07-.49 1.33-1l0-.01c.28-.37 .44-.83 .44-1.33c0-.2-.03-.4-.08-.58l0 .02l-.01-.01c-.01-.03-.27-.54-2.33-.54z" stroke-width="0"/>',   // at-muscle-gain
};

const svg = (paths, cls) =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ` +
  `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;

/** An icon as an SVG string. Decorative: pair it with visible text or an aria-label. */
export const icon = name => svg(PATHS[name], 'icon');

/** The icon for a lift's equipment; unknown equipment gets the "other" icon. */
export const equipmentIcon = equipment =>
  '<svg class="icon equipment-art" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" ' +
  'stroke-linejoin="round" aria-hidden="true" focusable="false">' +
  `${EQUIPMENT_PATHS[equipment] ?? EQUIPMENT_PATHS.other}</svg>`;

/** The logo mark, for the Board header: brand/logo-mark.svg (filled, on a 96×96
 *  grid), with its black fill swapped for currentColor so CSS colors it. Its
 *  export clipped it to its own box, which changed nothing, so the clip is left
 *  out. Decorative, like the icons. */
export const logoMark = () =>
  '<svg class="icon" viewBox="0 0 96 96" fill="currentColor" aria-hidden="true" focusable="false">' +
  '<path d="M0 8C0 2.6667 2.6667 0 8 0H32C37.3333 0 40 2.6667 40 8V32C40 37.3333 37.3333 40 32 40H8C2.6667 40 0 37.3333 0 32V8ZM0 64C0 58.6667 2.6667 56 8 56H32C37.3333 56 40 58.6667 40 64V88C40 93.3333 37.3333 96 32 96H8C2.6667 96 0 93.3333 0 88V64ZM56 64C56 58.6667 58.6667 56 64 56H88C93.3333 56 96 58.6667 96 64V88C96 93.3333 93.3333 96 88 96H64C58.6667 96 56 93.3333 56 88V64ZM57 34C56.1473 33.0312 56.1473 31.8527 57 31L74 14C74.9688 13.0312 74.7247 12.4419 73 12H62C60.3914 12.4419 59.5581 11.6086 60 10V3C59.5581 1.2753 60.3914 0.4419 62 0H88C92.8914 0.4419 95.5581 3.1086 96 8V34C95.5581 35.6086 94.7247 36.4419 93 36H86C84.3914 36.4419 83.5581 35.6086 84 34V23C83.5581 21.2753 82.9688 21.0312 82 22L65 39C64.1473 39.8527 62.9688 39.8527 62 39L57 34Z"/></svg>';

/** An experimental two-tone version of the mark: brand/logo-mark-two-tone.svg,
 *  the same drawing split in two. It has no fills of its own: style.css colors
 *  .logo-squares with the text color and .logo-arrow with the accent. Decorative. */
export const logoMarkTwoTone = () =>
  '<svg class="icon" viewBox="0 0 96 96" aria-hidden="true" focusable="false">' +
  '<path class="logo-squares" d="M0 8C0 2.6667 2.6667 0 8 0H32C37.3333 0 40 2.6667 40 8V32C40 37.3333 37.3333 40 32 40H8C2.6667 40 0 37.3333 0 32V8ZM0 64C0 58.6667 2.6667 56 8 56H32C37.3333 56 40 58.6667 40 64V88C40 93.3333 37.3333 96 32 96H8C2.6667 96 0 93.3333 0 88V64ZM56 64C56 58.6667 58.6667 56 64 56H88C93.3333 56 96 58.6667 96 64V88C96 93.3333 93.3333 96 88 96H64C58.6667 96 56 93.3333 56 88V64Z"/>' +
  '<path class="logo-arrow" d="M57 34C56.1473 33.0312 56.1473 31.8527 57 31L74 14C74.9688 13.0312 74.7247 12.4419 73 12H62C60.3914 12.4419 59.5581 11.6086 60 10V3C59.5581 1.2753 60.3914 0.4419 62 0H88C92.8914 0.4419 95.5581 3.1086 96 8V34C95.5581 35.6086 94.7247 36.4419 93 36H86C84.3914 36.4419 83.5581 35.6086 84 34V23C83.5581 21.2753 82.9688 21.0312 82 22L65 39C64.1473 39.8527 62.9688 39.8527 62 39L57 34Z"/></svg>';

/** Which mark the Board header shows: 'original' (all accent) or 'two-tone'. */
export const HEADER_LOGO = 'two-tone';

/** The mark HEADER_LOGO picks, for the Board header. */
export const headerLogo = () => (HEADER_LOGO === 'two-tone' ? logoMarkTwoTone() : logoMark());
