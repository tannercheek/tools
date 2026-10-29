// Screenshots of Today for a set of seeded days (PLAN 14.14, 14.18, 14.19), to compare the screen
// before and after a change to how it reads the plan. Drives this machine's Google Chrome, headless, over
// the DevTools protocol, with Node's own WebSocket: no npm. Serves the repo root itself, fails the
// request for shared/persist.js so the app saves to localStorage with no passphrase, and seeds
// that through the app's own modules, so the docs have their real shapes.
//
//   node tools/macro-planner/scripts/today-screenshots.mjs <out dir> [width ...]
//
// Writes <scenario>-<width>-<light|dark>.png for each scenario, at 390px unless widths are given.
// The days are seeded relative to today, so a run compares with another run on the same date.

import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const REPO_ROOT = resolve(import.meta.dirname, '../../..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

// Each scenario is a day on Today, `offset` days from today, on a seeded template: 'old', saved
// before slots held items, to check the data Plan used to write still reads correctly now that
// the old model is retired (PLAN 14.19), or 'items', the shape every screen writes today.
const SCENARIOS = [
  { name: '1-locked-yesterday', seed: 'old', offset: -1 },
  { name: '2-as-planned-other', seed: 'old', offset: 0 },
  { name: '3-portion-skips-filled-flex', seed: 'old', offset: 1 },
  { name: '4-swaps', seed: 'old', offset: 2 },
  { name: '5-edits-removed-foods', seed: 'old', offset: 3 },
  { name: '6-swap-to-food-food-removed', seed: 'old', offset: 4 },
  { name: '7-off-plan', seed: 'old', offset: 5 },
  { name: '8-items-two-meals-and-a-food', seed: 'items', offset: 0 },
];

// Runs in the page: clears the app's storage and seeds the core doc, the days and a weigh-in
// through the app's modules. Breakfast plans Oats & whey; Lunch a tofu rice bowl and a banana;
// Snack an apple; Dinner is flex with a pinned budget and Evening open flex. With seed 'items',
// Lunch is saved as items: the bowl, Eggs on toast and a banana, the second meal at 1.5× today.
async function seedInPage(seed) {
  const [{ addDays }, data, slots, plan, meals, ing, store, bundled, oldModel] = await Promise.all([
    ...['calc', 'data', 'slots', 'day-plan', 'saved-meals', 'ingredients', 'store', 'bundled-foods'].map((name) => import(`./js/${name}.js`)),
    // The 'old' scenario seeds a template saved before slots held items (PLAN 14.19): slots.js no
    // longer has those builders, so this frozen copy, kept for the Node tests, makes the same shapes.
    import('./tests/old-slot-model-reference.js'),
  ]);
  localStorage.clear();
  const db = await store.createPersonalStore(store.createLocalPersist(localStorage));
  const today = data.localDate(new Date());
  const day = (offset) => addDays(today, offset);
  const foods = await bundled.loadBundledFoods();
  const getFood = meals.foodLookup(foods);
  const food = (id) => getFood(id);
  const meal = (name, emoji, items) => ({ ...meals.createMeal({ name, emoji }), items: items.map(([foodId, qty, unit]) => ({ foodId, qty, unit })) });

  const oats = meal('Oats & whey', '🥣', [['usda-2346396', 80, 'g'], ['usda-173180', 30, 'g'], ['usda-2346411', 100, 'g']]);
  const bowl = meal('Tofu rice bowl', '🍚', [['usda-168878', 1, 'cup'], ['usda-172475', 150, 'g']]);
  const eggs = meal('Eggs on toast', '🍳', [['usda-171287-large', 2, 'egg'], ['usda-174101', 2, 'slice']]);
  const yogurt = meal('Yogurt & PB', '🥛', [['usda-170903', 1, 'container'], ['usda-174266', 2, 'tbsp']]);

  let doc = data.createCoreDoc(day(-3));
  doc = [oats, bowl, eggs, yogurt].reduce(meals.addMeal, doc);
  doc.profile = { sex: 'male', birthDate: '1990-04-12', heightCm: 180, activity: 'moderate', goal: 'lose', rateKgPerWeek: 0.5 };
  doc = slots.addSlot(doc, slots.createSlot('Snack'));
  doc = slots.addSlot(doc, slots.createSlot('Evening'));
  const id = Object.fromEntries(doc.slots.map((slot) => [slot.name, slot.id]));
  const slot = (name) => doc.slots.find((each) => each.name === name);
  doc = slots.moveSlot(doc, id.Snack, -1);
  doc = oldModel.oldShapeSetMeal(doc, id.Breakfast, oats.id);
  doc = slots.setSlotBudget(doc, id.Dinner, { kcal: 650, protein: 45, fat: 20, carbs: 70 });
  doc = oldModel.oldShapeAddFood(doc, id.Snack, food('usda-171688'), 1, 'apple');
  if (seed === 'items') {
    doc = slots.addPlannedMeal(doc, id.Lunch, bowl.id);
    doc = slots.addPlannedMeal(doc, id.Lunch, eggs.id);
    doc = slots.addPlannedFood(doc, id.Lunch, food('usda-173944'), 1, 'banana');
  } else {
    doc = oldModel.oldShapeSetMeal(doc, id.Lunch, bowl.id);
    doc = oldModel.oldShapeAddFood(doc, id.Lunch, food('usda-173944'), 1, 'banana');
  }

  const { addEntry, emptyDay, foodEntry, mealEntry, quickEntry, OTHER } = data;
  const lunchFoods = oldModel.oldShapeDaySlots(doc, emptyDay(), getFood).find((each) => each.id === id.Lunch).foods;
  const snackFoods = oldModel.oldShapeDaySlots(doc, emptyDay(), getFood).find((each) => each.id === id.Snack).foods;
  const oatsEdit = ing.addIngredient(ing.setIngredientQty(ing.mealIngredients(oats, getFood), 'usda-2346396', 60), food('usda-173944'), 1, 'banana');
  const bowlEdit = ing.swapIngredient(ing.mealIngredients(bowl, getFood), 'usda-172475', food('usda-172421'), 1, 'cup');
  const yogurtEntry = mealEntry(slot('Lunch'), yogurt, getFood);
  const days = {};
  if (seed === 'items') {
    const second = slots.slotItems(doc.template[id.Lunch]).find((item) => item.mealId === eggs.id).id;
    days[day(0)] = plan.setItemPortion(doc, emptyDay(), id.Lunch, second, 1.5, getFood);
  } else {
    days[day(-1)] = addEntry(oldModel.oldShapeSetPortion(emptyDay(), id.Breakfast, 1.5), foodEntry(slot('Lunch'), food('usda-171688'), 1, 'apple'));
    days[day(0)] = addEntry(emptyDay(), foodEntry(OTHER, food('usda-174266'), 2, 'tbsp'));
    let d = oldModel.oldShapeSetPortion(emptyDay(), id.Breakfast, 1.5);
    d = oldModel.oldShapeSkip(oldModel.oldShapeSkip(d, id.Lunch), id.Snack);
    d = addEntry(d, foodEntry(slot('Snack'), food('usda-173944'), 1, 'banana'));
    d = addEntry(d, quickEntry(slot('Evening'), { kcal: 320, protein: 12, fat: 14, carbs: 35 }, 'Popcorn'));
    d = addEntry(d, mealEntry(slot('Dinner'), eggs, getFood));
    days[day(1)] = addEntry(d, foodEntry(slot('Dinner'), food('usda-171688'), 1, 'apple'));
    d = oldModel.oldShapeSwap(emptyDay(), id.Breakfast, yogurt.id, oats.id);
    d = oldModel.oldShapeSwapToEntry(d, id.Lunch, quickEntry(slot('Lunch'), { kcal: 850, protein: 40, fat: 30, carbs: 95 }, 'Burrito place'));
    days[day(2)] = oldModel.oldShapeSetFoods(d, id.Snack, ing.swapIngredient(snackFoods, 'usda-171688', food('usda-173944'), 1, 'banana'));
    d = oldModel.oldShapeSetIngredients(emptyDay(), id.Breakfast, oats.id, oatsEdit);
    d = oldModel.oldShapeSetPortion(oldModel.oldShapeSetIngredients(d, id.Lunch, bowl.id, bowlEdit), id.Lunch, 1.5);
    d = addEntry(d, { ...yogurtEntry, ingredients: ing.setIngredientQty(yogurtEntry.ingredients, 'usda-174266', 1), originalIngredients: yogurtEntry.ingredients });
    days[day(3)] = oldModel.oldShapeSetFoods(d, id.Snack, []);
    d = oldModel.oldShapeSwapToEntry(emptyDay(), id.Breakfast, foodEntry(slot('Breakfast'), food('usda-171287-large'), 3, 'egg'));
    d = oldModel.oldShapeSetFoods(d, id.Lunch, ing.removeIngredient(lunchFoods, 'usda-173944'));
    days[day(4)] = addEntry(d, foodEntry(slot('Snack'), food('usda-174266'), 2, 'tbsp'));
    days[day(5)] = { ...addEntry(emptyDay(), quickEntry(slot('Evening'), { kcal: 900, protein: 35, fat: 40, carbs: 90 }, 'Pizza night')), offPlan: true };
  }
  await db.save(store.CORE_DOC_ID, doc);
  await db.save(data.DAYS_DOC_ID, days);
  await db.save(data.WEIGHT_DOC_ID, { weighIns: [{ date: day(-2), kg: 82.4 }] });
  return today;
}

function serve() {
  const server = createServer(async (request, response) => {
    const path = normalize(join(REPO_ROOT, decodeURIComponent(new URL(request.url, 'http://x').pathname)));
    const file = path.endsWith('/') ? join(path, 'index.html') : path;
    try {
      if (!file.startsWith(REPO_ROOT) || !(await stat(file)).isFile()) throw new Error('not a file');
      response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
      createReadStream(file).pipe(response);
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done(server)));
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

// One page's DevTools connection: send(method, params) resolves to its result. Fetch.requestPaused
// is answered here, failing persist.js and letting everything else through.
async function connect(port) {
  let target;
  for (let tries = 0; !target; tries++) {
    try {
      target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
    } catch (err) {
      if (tries > 50) throw err;
      await sleep(100);
    }
  }
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((done, fail) => socket.addEventListener('open', done) || socket.addEventListener('error', fail));
  let nextId = 0;
  const waiting = new Map();
  const send = (method, params = {}) =>
    new Promise((done, fail) => {
      const id = ++nextId;
      waiting.set(id, { done, fail });
      socket.send(JSON.stringify({ id, method, params }));
    });
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const { done, fail } = waiting.get(message.id);
      waiting.delete(message.id);
      if (message.error) fail(new Error(`${message.error.message}`));
      else done(message.result);
    } else if (message.method === 'Fetch.requestPaused') {
      const { requestId, request } = message.params;
      if (request.url.includes('/shared/persist.js')) send('Fetch.failRequest', { requestId, errorReason: 'Failed' });
      else send('Fetch.continueRequest', { requestId });
    }
  });
  return { send, close: () => socket.close() };
}

async function evaluate(send, expression) {
  const { result, exceptionDetails } = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  return result.value;
}

// Until the page says yes, or a few seconds pass.
async function waitFor(send, expression) {
  for (let tries = 0; tries < 100; tries++) {
    if (await evaluate(send, expression)) return;
    await sleep(50);
  }
  const state = await evaluate(send, `location.href + " " + document.body?.innerHTML.slice(0, 600)`);
  throw new Error(`Timed out waiting for ${expression}: ${state}`);
}

// A fresh load of Today: through about:blank, since the app keeps its docs in memory.
async function openToday(send, appUrl) {
  await send('Page.navigate', { url: 'about:blank' });
  await sleep(100);
  await send('Page.navigate', { url: `${appUrl}#today` });
  await waitFor(send, `document.querySelector('.today__slots')?.childElementCount > 0`);
}

async function main() {
  const [outDir, ...widthArgs] = process.argv.slice(2);
  if (!outDir) throw new Error('Usage: today-screenshots.mjs <out dir> [width ...]');
  const widths = widthArgs.length > 0 ? widthArgs.map(Number) : [390];
  await mkdir(outDir, { recursive: true });

  const server = await serve();
  const appUrl = `http://127.0.0.1:${server.address().port}/tools/macro-planner/`;
  const profile = await mkdtemp(join(tmpdir(), 'macro-planner-chrome-'));
  const port = 9300 + Math.floor(Math.random() * 500);
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  const { send, close } = await connect(port);
  try {
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
    // The app's origin, for the seed's imports. A first launch opens Settings, not Today.
    await send('Page.navigate', { url: appUrl });
    await waitFor(send, `document.querySelector('#view')?.childElementCount > 0`);
    let seeded = null;
    for (const scheme of ['light', 'dark']) {
      await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
      for (const width of widths) {
        for (const { name, seed, offset } of SCENARIOS) {
          await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 2, mobile: true });
          if (seed !== seeded) {
            await evaluate(send, `(${seedInPage})(${JSON.stringify(seed)})`);
            seeded = seed;
          }
          await openToday(send, appUrl);
          const label = (button) => `document.querySelector('[aria-label="${button} day"]')`;
          for (let step = 0; step !== offset; step += Math.sign(offset)) {
            const before = await evaluate(send, `document.querySelector('.today__slots').innerHTML`);
            await evaluate(send, `${label(offset > 0 ? 'Next' : 'Previous')}.click()`);
            await waitFor(send, `document.querySelector('.today__slots').innerHTML !== ${JSON.stringify(before)}`);
          }
          await sleep(250);
          const height = await evaluate(send, 'Math.ceil(document.documentElement.scrollHeight)');
          await send('Emulation.setDeviceMetricsOverride', { width, height: Math.max(height, 844), deviceScaleFactor: 2, mobile: true });
          await sleep(150);
          const { data } = await send('Page.captureScreenshot', { format: 'png' });
          const file = join(outDir, `${name}-${width}-${scheme}.png`);
          await writeFile(file, Buffer.from(data, 'base64'));
          console.log(file);
        }
      }
    }
  } finally {
    close();
    chrome.kill();
    server.close();
    await sleep(200);
    await rm(profile, { recursive: true, force: true });
  }
}

await main();
