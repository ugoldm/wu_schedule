// Run with: node tests/validate_swipe_navigation.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, '../docs/index.html'), 'utf8');
const source = html.slice(html.indexOf('      function activateView('), html.indexOf('      function renderWeekStrip('));

function fixture() {
  const handlers = {}, windowHandlers = {}, frames = new Map(), animations = [];
  let clock = 0, frameId = 0;
  function element(dataset = {}) {
    const classes = new Set(), attributes = {};
    return {
      dataset, hidden: true, inert: false,
      style: { removeProperty(key) { delete this[key]; if (key === 'will-change') delete this.willChange; } },
      classList: { add(key) { classes.add(key); }, remove(key) { classes.delete(key); }, contains(key) { return classes.has(key); } },
      setAttribute(key, value) { attributes[key] = value; }, removeAttribute(key) { delete attributes[key]; }, getAttribute(key) { return attributes[key]; },
      addEventListener(type, callback) { this[type] = callback; },
      animate(keyframes, options) {
        let resolve, reject;
        const finished = new Promise((ok, fail) => { resolve = ok; reject = fail; });
        const animation = { keyframes, options, finished, finish: resolve, cancel() { reject(new Error('Cancelled')); } };
        animations.push(animation);
        return animation;
      }
    };
  }
  const views = ['agenda', 'planner', 'settings'].map(view => element({ view }));
  views.forEach(view => {
    let hidden = true;
    view.hiddenChanges = [];
    Object.defineProperty(view, 'hidden', {
      get() { return hidden; },
      set(value) { hidden = value; view.hiddenChanges.push(value); }
    });
  });
  views[0].hidden = false;
  const buttons = views.map(view => element({ viewButton: view.dataset.view }));
  const main = element(); main.clientWidth = 390;
  main.addEventListener = (type, handler) => { handlers[type] = handler; };
  const mobile = { matches: true }, reduced = { matches: false };
  const context = {
    DATA: { timezone: 'Europe/Vienna' }, currentView: 'agenda', viewScrollPositions: {},
    pageTitles: { agenda: 'My schedule', planner: 'Semester planner', settings: 'Settings' },
    activeAgendaDate: '2026-10-01', dialog: false,
    document: {
      querySelector(selector) {
        if (selector === '.app-main') return main;
        if (selector === 'dialog[open]') return context.dialog;
        if (selector === '#page-title') return title;
        if (selector === '#today-button') return todayButton;
        return views.find(view => selector === `[data-view="${view.dataset.view}"]`);
      },
      querySelectorAll(selector) { return selector === '[data-view]' ? views : buttons; }
    },
    window: {
      innerWidth: 390, scrollY: 120,
      matchMedia(query) { return query.includes('reduced-motion') ? reduced : mobile; },
      scrollTo({ top }) { this.scrollY = top; },
      addEventListener(type, handler) { windowHandlers[type] = handler; }
    },
    history: { replaceState(_, __, hash) { context.hash = hash; } },
    performance: { now() { return clock; } },
    requestAnimationFrame(fn) { frames.set(++frameId, fn); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); },
    getToday() { return '2026-10-01'; }, focusAgendaDate() {}
  };
  const title = element();
  const todayButton = element();
  vm.createContext(context);
  vm.runInContext(source + '\nsetupViewSwipes();', context);
  const touch = (x, y = 240) => ({ identifier: 1, clientX: x, clientY: y });
  const event = (touches, changedTouches = touches, excluded = false) => ({
    touches, changedTouches, cancelable: true, prevented: false,
    target: { closest() { return excluded; } }, preventDefault() { this.prevented = true; }
  });
  const flush = () => { for (const [id, fn] of [...frames]) { frames.delete(id); fn(); } };
  const start = (x = 300, excluded = false) => { clock += 1000; handlers.touchstart(event([touch(x)], undefined, excluded)); };
  const move = (x, y = 240) => { clock += 100; const e = event([touch(x, y)]); handlers.touchmove(e); flush(); return e; };
  const end = x => { clock += 100; handlers.touchend(event([], [touch(x)])); };
  const finish = async () => { animations.forEach(animation => animation.finish()); await new Promise(resolve => setImmediate(resolve)); };
  return { context, main, views, buttons, animations, handlers, windowHandlers, mobile, reduced, touch, event, start, move, end, finish, flush };
}

(async () => {
  let count = 0;
  async function test(name, run) { await run(fixture()); console.log(`PASS ${name}`); count++; }
  await test('adjacent content appears before release and panels share an edge', async t => {
    t.start(); t.move(180);
    assert.equal(t.context.currentView, 'agenda');
    assert.equal(t.views[1].hidden, false);
    assert.equal(t.views[1].inert, true);
    assert.equal(t.views[1].getAttribute('aria-hidden'), 'true');
    assert.equal(t.views[0].style.transform, 'translate3d(-120px, 0, 0)');
    assert.equal(t.views[1].style.transform, 'translate3d(270px, 0, 0)');
    assert.equal(t.views[1].style.top, '120px');
    t.end(180);
    assert.equal(t.views[0].hidden, false);
    assert.equal(t.views[1].hidden, false);
    assert.equal(t.context.currentView, 'agenda');
    assert.equal(t.animations[0].keyframes[0].transform, 'translate3d(-120px, 0, 0)');
    assert.equal(t.animations[0].keyframes[1].transform, 'translate3d(-390px, 0, 0)');
    assert.equal(t.animations[1].keyframes[0].transform, 'translate3d(270px, 0, 0)');
    assert.equal(t.animations[1].keyframes[1].transform, 'translate3d(0px, 0, 0)');
    await t.finish();
    assert.equal(t.context.currentView, 'planner');
    assert.equal(t.context.hash, '#planner');
    assert.equal(t.views[0].hidden, true);
    assert.equal(t.views[1].hidden, false);
    assert.equal(t.views[1].inert, false);
    assert.equal(t.views[1].style.transform, undefined);
    assert.equal(t.views[1].classList.contains('swipe-neighbor'), false);
    assert.equal(t.main.classList.contains('is-swiping'), false);
    assert.equal(t.context.viewScrollPositions.agenda, 120);
  });
  await test('cancel returns both panels without changing the selected tab', async t => {
    t.start(); t.move(275); t.end(275);
    assert.equal(t.views[1].hidden, false);
    assert.equal(t.animations[0].keyframes[1].transform, 'translate3d(0px, 0, 0)');
    assert.equal(t.animations[1].keyframes[1].transform, 'translate3d(390px, 0, 0)');
    await t.finish();
    assert.equal(t.context.currentView, 'agenda');
    assert.equal(t.views[1].hidden, true);
    assert.equal(t.views[0].style.transform, undefined);
  });
  await test('back swipe previews and restores the previous scroll position', async t => {
    t.start(); t.move(180); t.end(180); await t.finish();
    t.context.window.scrollY = 65;
    t.start(90); t.move(220);
    assert.equal(t.views[0].hidden, false);
    assert.equal(t.views[0].style.top, '-55px');
    assert.equal(t.views[0].style.transform, 'translate3d(-260px, 0, 0)');
    t.end(220); await t.finish();
    assert.equal(t.context.currentView, 'agenda');
    assert.equal(t.context.window.scrollY, 120);
    assert.equal(t.context.viewScrollPositions.planner, 65);
  });
  await test('repeated round trips keep the original Agenda offset', async t => {
    t.context.window.scrollY = 1940;
    for (let trip = 0; trip < 4; trip++) {
      t.start(); t.move(180);
      // Simulate browser scroll anchoring/clamping during the temporary layout.
      t.context.window.scrollY = 1875 - trip * 15;
      t.end(180); await t.finish();
      assert.equal(t.context.viewScrollPositions.agenda, 1940);
      t.context.window.scrollY = 50;
      t.start(90); t.move(220); t.end(220); await t.finish();
      assert.equal(t.context.window.scrollY, 1940);
      assert.equal(t.context.currentView, 'agenda');
    }
  });
  await test('Planner to Agenda commit never hides the incoming page again', async t => {
    t.context.activateView('planner');
    t.context.viewScrollPositions.agenda = 1940;
    t.start(90); t.move(220);
    t.views[0].hiddenChanges = [];
    t.end(220); await t.finish();
    assert.equal(t.views[0].hiddenChanges.includes(true), false);
    assert.equal(t.views[0].hidden, false);
    assert.equal(t.context.window.scrollY, 1940);
    assert.equal(t.views[0].style.transform, undefined);
    assert.equal(t.views[0].style.top, undefined);
  });
  await test('button navigation restores offsets without queued date scrolling', async t => {
    let dateFocuses = 0;
    t.context.focusAgendaDate = () => { dateFocuses++; };
    t.context.window.scrollY = 1940;
    t.context.activateView('planner');
    t.context.activateView('agenda');
    t.flush();
    assert.equal(t.context.window.scrollY, 1940);
    assert.equal(dateFocuses, 0);
    t.context.activateView('agenda');
    t.flush();
    assert.equal(t.context.window.scrollY, 1940);
    assert.equal(dateFocuses, 0);
  });
  await test('direction reversal replaces the preview', async t => {
    t.context.activateView('planner');
    t.start(200); t.move(100);
    assert.equal(t.views[2].hidden, false);
    t.move(280);
    assert.equal(t.views[2].hidden, true);
    assert.equal(t.views[0].hidden, false);
    assert.equal(t.views[0].style.transform, 'translate3d(-310px, 0, 0)');
    t.end(280); await t.finish();
    assert.equal(t.context.currentView, 'agenda');
  });
  await test('screen-edge, date-strip, vertical, desktop and dialog gestures stay native', async t => {
    t.start(10); t.move(200); t.end(200);
    t.start(300, true); t.move(100); t.end(100);
    t.start(); assert.equal(t.move(295, 420).prevented, false); t.end(295);
    t.mobile.matches = false; t.start(); t.move(100); t.end(100);
    t.mobile.matches = true; t.context.dialog = true; t.start(); t.move(100); t.end(100);
    assert.equal(t.animations.length, 0);
    assert.equal(t.views[1].hidden, true);
  });
  await test('first and last tabs resist without wrapping', async t => {
    t.start(100); t.move(250); t.end(250); await t.finish();
    assert.equal(t.context.currentView, 'agenda');
    t.context.activateView('settings');
    t.start(); t.move(100); t.end(100); await t.finish();
    assert.equal(t.context.currentView, 'settings');
  });
  await test('touchcancel and multitouch roll back previews', async t => {
    t.start(); t.move(160); t.handlers.touchcancel(); await t.finish();
    assert.equal(t.views[1].hidden, true);
    t.start(); t.move(160);
    t.handlers.touchmove(t.event([t.touch(160), t.touch(100)])); await t.finish();
    assert.equal(t.views[1].hidden, true);
    assert.equal(t.context.currentView, 'agenda');
  });
  await test('resize and tab-button navigation abort pending animation safely', async t => {
    t.start(); t.move(160); t.end(160);
    t.windowHandlers.resize(); await t.finish();
    assert.equal(t.context.currentView, 'agenda');
    t.start(); t.move(160); t.end(160);
    t.buttons[2].click(); t.context.activateView('settings'); await t.finish();
    assert.equal(t.context.currentView, 'settings');
    assert.equal(t.views[1].hidden, true);
    assert.equal(t.views[2].hidden, false);
  });
  await test('reduced motion commits without a settling animation', async t => {
    t.reduced.matches = true; t.start(); t.move(160);
    assert.equal(t.views[1].hidden, false);
    t.end(160); await t.finish();
    assert.equal(t.context.currentView, 'planner');
    assert.equal(t.animations.length, 0);
  });
  await test('swipe suppresses accidental clicks and keeps keyboard navigation', async t => {
    t.start(); t.move(160); t.end(160);
    let blocked = false;
    const click = { detail: 1, preventDefault() {}, stopImmediatePropagation() { blocked = true; } };
    t.handlers.click(click); assert.equal(blocked, true);
    click.detail = 0; blocked = false;
    t.handlers.click(click); assert.equal(blocked, false);
    await t.finish();
  });
  console.log(`${count} swipe navigation checks passed`);
})().catch(error => { console.error(error); process.exitCode = 1; });
