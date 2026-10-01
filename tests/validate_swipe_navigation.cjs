// Run with: node tests/validate_swipe_navigation.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, '../docs/index.html'), 'utf8');
const source = html.slice(html.indexOf('      const viewOrder ='), html.indexOf('      function renderWeekStrip('));

function fixture() {
  const mainHandlers = {}, windowHandlers = {}, timers = new Map();
  const mobile = { matches: true };
  let timerId = 0;
  function element(dataset = {}) {
    const classes = new Set(), attributes = {};
    let hidden = true;
    const node = {
      dataset, scrollTop: 0, scrollLeft: 0, hiddenChanges: [], handlers: {}, scrolls: [],
      classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) },
      setAttribute: (key, value) => { attributes[key] = value; }, removeAttribute: key => { delete attributes[key]; },
      getAttribute: key => attributes[key],
      addEventListener(type, callback) { this.handlers[type] = callback; },
      scrollTo(options) {
        this.scrolls.push(options);
        if (options.top !== undefined) this.scrollTop = options.top;
        if (options.left !== undefined) this.scrollLeft = options.left;
      }
    };
    Object.defineProperty(node, 'hidden', { get: () => hidden, set: value => { hidden = value; node.hiddenChanges.push(value); } });
    return node;
  }
  const views = ['agenda', 'planner', 'settings'].map(view => element({ view }));
  views[0].scrollTop = 1940;
  const main = element(); main.clientWidth = 390;
  main.addEventListener = (type, handler) => { mainHandlers[type] = handler; };
  const buttons = views.map(view => element({ viewButton: view.dataset.view }));
  const title = element(), today = element();
  let observerSetups = 0;
  const context = {
    DATA: { timezone: 'Europe/Vienna' }, currentView: 'agenda', viewScrollPositions: { agenda: 1940 }, activeAgendaDate: '2026-10-01',
    pageTitles: { agenda: 'My schedule', planner: 'Semester planner', settings: 'Settings' },
    document: {
      querySelector(selector) {
        if (selector === '.app-main') return main;
        if (selector === '#page-title') return title;
        if (selector === '#today-button') return today;
        return views.find(view => selector === `[data-view="${view.dataset.view}"]`);
      },
      querySelectorAll(selector) { return selector === '[data-view]' ? views : buttons; }
    },
    window: {
      scrollY: 0, matchMedia: query => query.includes('reduced-motion') ? { matches: false } : mobile,
      scrollTo(options) { this.scrollY = options.top; },
      addEventListener: (type, callback) => { windowHandlers[type] = callback; }
    },
    history: { replaceState(_, __, hash) { context.hash = hash; } },
    setTimeout(callback) { timers.set(++timerId, callback); return timerId; },
    clearTimeout(id) { timers.delete(id); },
    setupAgendaObserver() { observerSetups++; },
    focusAgendaDate() { throw new Error('Returning to Agenda must not refocus it'); },
    getToday: () => '2026-10-01'
  };
  vm.createContext(context); vm.runInContext(source + '\nsetupViewSwipes(); activateView("agenda", false);', context);
  const scroll = left => { main.scrollLeft = left; mainHandlers.scroll(); };
  const end = () => mainHandlers.scrollend();
  return { context, views, main, mainHandlers, windowHandlers, buttons, today, mobile, timers, scroll, end, observerSetups: () => observerSetups };
}
let count = 0;
function test(name, run) { run(fixture()); count++; console.log(`PASS ${name}`); }
test('mobile panels remain mounted and keep separate vertical positions', t => {
  assert.ok(t.views.every(view => !view.hidden));
  t.context.activateView('planner'); t.views[1].scrollTop = 65;
  t.views.forEach(view => { view.hiddenChanges = []; view.scrolls = []; });
  t.mainHandlers.touchstart(); t.scroll(200);
  assert.equal(t.context.currentView, 'planner');
  assert.ok(t.views.every(view => !view.hidden));
  t.scroll(0); t.end();
  assert.equal(t.context.currentView, 'agenda');
  assert.equal(t.views[0].scrollTop, 1940);
  assert.equal(t.views[1].scrollTop, 65);
  assert.ok(t.views.every(view => !view.hiddenChanges.includes(true)));
  assert.ok(t.views.every(view => view.scrolls.length === 0));
  assert.equal(t.context.window.scrollY, 0);
});
test('several round trips do not change the Agenda date offset', t => {
  for (let i = 0; i < 5; i++) {
    t.mainHandlers.touchstart(); t.scroll(390); t.end();
    t.mainHandlers.touchstart(); t.scroll(0); t.end();
    assert.equal(t.views[0].scrollTop, 1940);
  }
});
test('scroll completion updates navigation and accessibility without scrolling panels', t => {
  t.mainHandlers.touchstart(); t.scroll(390); t.end();
  assert.equal(t.context.currentView, 'planner'); assert.equal(t.context.hash, '#planner');
  assert.equal(t.views[0].inert, true); assert.equal(t.views[1].inert, false);
  assert.equal(t.today.hidden, true);
  t.mainHandlers.touchstart(); t.scroll(0); t.end();
  assert.equal(t.today.hidden, false);
  assert.equal(t.main.classList.contains('is-swiping'), false);
});
test('button navigation moves only the horizontal container', t => {
  const verticalScrolls = t.views[0].scrolls.length;
  t.context.activateView('settings');
  assert.equal(t.main.scrolls.at(-1).left, 780);
  assert.equal(t.main.scrolls.at(-1).behavior, 'smooth');
  t.scroll(390); t.end(); assert.equal(t.context.currentView, 'settings');
  t.scroll(780); t.end(); assert.equal(t.context.currentView, 'settings');
  t.context.activateView('agenda'); t.end();
  assert.equal(t.views[0].scrollTop, 1940);
  assert.equal(t.views[0].scrolls.length, verticalScrolls);
});
test('scroll settlement waits for a snapped page and supports the timer fallback', t => {
  t.mainHandlers.touchstart(); t.scroll(200); t.end();
  assert.equal(t.context.currentView, 'agenda');
  t.scroll(390); for (const callback of [...t.timers.values()]) callback();
  assert.equal(t.context.currentView, 'planner');
});
test('resizing retains the selected tab and vertical position', t => {
  t.context.activateView('planner'); t.views[1].scrollTop = 65; t.views[1].handlers.scroll();
  t.main.clientWidth = 420; t.windowHandlers.resize();
  assert.equal(t.main.scrollLeft, 420); assert.equal(t.views[1].scrollTop, 65);
  t.mobile.matches = false; t.windowHandlers.resize();
  assert.equal(t.context.window.scrollY, 65);
  assert.equal(t.views[0].hidden, true); assert.equal(t.views[1].hidden, false);
});
assert.match(html, /scroll-snap-type: x mandatory/);
assert.match(html, /scroll-snap-align: start/);
assert.match(html, /\.view \{[^}]*overflow-y: auto/);
assert.ok(!source.includes('touchmove'), 'native scrolling must handle motion without JS transforms');
assert.ok(!source.includes('style.transform'), 'sticky panes must not change transform contexts');
console.log(`${count} stable mobile navigation checks passed`);
