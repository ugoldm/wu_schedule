// Run with: node tests/validate_agenda_position.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, '../docs/app.js'), 'utf8');
const extract = (start, end) => html.slice(html.indexOf(start), html.indexOf(end));

function fixture(initialTab) {
  const classes = new Set(['is-initializing']);
  const main = { clientWidth: 390, scrollLeft: 0, scrollTo({left}) {this.scrollLeft=left;}, classList: { contains: name => classes.has(name), remove: name => classes.delete(name), add: name => classes.add(name) } };
  const views = ['agenda', 'planner', 'settings'].map(view => ({ dataset: { view }, hidden: true, scrollTop: 0, setAttribute() {}, removeAttribute() {}, getBoundingClientRect: () => ({top:64}) }));
  const buttons = views.map(view => ({ dataset: { viewButton: view.dataset.view }, setAttribute() {}, removeAttribute() {} }));
  const frames = [], scrolls = [], weekChanges = [], focused = [];
  const days = [
    { dataset: { dayDate: '2026-09-30' }, getBoundingClientRect: () => ({ bottom: 304 }) },
    { dataset: { dayDate: '2026-10-01' }, getBoundingClientRect: () => ({ bottom: 524 }) },
    { dataset: { dayDate: '2026-10-02' }, getBoundingClientRect: () => ({ bottom: 664 }) }
  ];
  const today = days[1];
  today.getBoundingClientRect = () => ({top: 1204 - views[0].scrollTop, bottom:524});
  const summary = { offsetHeight: 80 };
  const loading = { hidden: false };
  const context = {
    DATA: null, currentView: 'agenda', viewScrollPositions: {}, activeAgendaDate: null, agendaObserver: null,
    pageTitles: { agenda: 'My schedule', planner: 'Semester planner', settings: 'Settings' },
    REQUIRED_COURSES: new Set(), state: {}, eventById: {}, courseNames: [], groupsByCourse: {},
    plannerMonths: [], plannerMonthIndex: 0,
    account: null, localStorage: {},
    accountInfo: {}, receiveAccount() {}, renderAccount() {},
    WUAccount: { createController: () => ({ snapshot: () => ({}), start: async () => {} }) },
    location: { hash: initialTab ? `#${initialTab}` : '' },
    history: { replaceState() {} },
    document: {
      documentElement: { style: { setProperty() {} } },
      querySelector(selector) {
        if (selector === '.app-main') return main;
        if (selector === '.agenda-summary') return summary;
        const panel = views.find(view => selector === `#${view.dataset.view}-view` || selector === `[data-view="${view.dataset.view}"]`);
        if (panel) return panel;
        if (selector === '#loading-state') return loading;
        if (selector === '#page-title') return title;
        if (selector === '#today-button') return todayButton;
        if (selector === '#agenda-2026-10-01') return today;
        throw new Error(`Unexpected selector ${selector}`);
      },
      querySelectorAll(selector) {
        if (selector === '[data-view]') return views;
        if (selector === '[data-view-button]') return buttons;
        if (selector.includes('[data-day-date]')) return days;
        return [];
      }
    },
    window: {
      WU_AUTH_CONFIG: {}, scrollY: 0, matchMedia: () => ({ matches: true }),
      scrollTo(options) { scrolls.push(options); this.scrollY = options.top; }
    },
    fetch: async () => ({ ok: true, json: async () => ({ timezone: 'Europe/Vienna', events: [{ id: 'test', date: '2026-10-01' }], courses: [] }) }),
    getToday: () => '2026-10-01',
    getComputedStyle: () => ({ scrollMarginTop: '240px', getPropertyValue: () => '64px' }),
    requestAnimationFrame: callback => frames.push(callback),
    loadState() {}, updateVisibleEvents() {}, renderPlanner() {}, renderSettings() {},
    renderAgenda() { context.activeAgendaDate = '2026-10-01'; },
    scrollWeekIntoView(date, smooth) { weekChanges.push({ date, smooth }); },
    IntersectionObserver: class {
      constructor(callback) { context.observerCallback = callback; }
      disconnect() {} observe() {}
    }
  };
  const title = {};
  const todayButton = {};
  views[0].scrollTo = options => {
    focused.push({ options, beforeReveal: classes.has('is-initializing') });
    views[0].scrollTop = options.top;
  };
  vm.createContext(context);
  vm.runInContext(extract('      const viewOrder =', '      function setupViewSwipes('), context);
  vm.runInContext(extract('      function setupAgendaObserver(', '      function formatGenerated('), context);
  vm.runInContext(extract('      async function initialize(', '      setupViewSwipes();'), context);
  const flush = () => { while (frames.length) frames.shift()(); };
  return { context, classes, main, views, loading, days, focused, weekChanges, scrolls, flush };
}

(async () => {
  for (const tab of ['agenda', 'planner', 'settings']) {
    const t = fixture(tab);
    await t.context.initialize();
    assert.equal(t.context.currentView, tab);
    assert.equal(t.focused.length, 1);
    assert.equal(t.focused[0].beforeReveal, true);
    assert.equal(t.focused[0].options.behavior, 'instant');
    assert.equal(t.classes.has('is-initializing'), true);
    assert.equal(t.context.viewScrollPositions.agenda, 900);
    t.flush();
    assert.equal(t.classes.has('is-initializing'), false);
    assert.equal(t.focused.length, 1, 'revealing must not initiate another scroll');
    assert.equal(t.views[0].scrollTop, 900);
    assert.equal(t.context.window.scrollY, 0);
    t.context.activateView('agenda'); t.flush();
    assert.equal(t.views[0].scrollTop, 900);
    assert.equal(t.focused.length, 1, 'returning must restore pixels without refocusing the date');
    console.log(`PASS initial ${tab}: Agenda positioned before reveal; no delayed date scroll`);
  }
  const t = fixture('agenda'); await t.context.initialize(); t.flush();
  t.context.activeAgendaDate = '2026-09-30';
  t.context.observerCallback([{ isIntersecting: true, target: t.days[2], boundingClientRect: { top: 0 } }]);
  assert.equal(t.context.activeAgendaDate, '2026-10-01', 'use current viewport geometry, not the changed-entry batch');
  const changes = t.weekChanges.length;
  t.classes.add('is-swiping');
  t.context.observerCallback([]);
  assert.equal(t.weekChanges.length, changes);
  t.classes.delete('is-swiping'); t.context.currentView = 'planner';
  t.context.observerCallback([]);
  assert.equal(t.weekChanges.length, changes);
  console.log('PASS date observer stays stable during previews and reads the restored viewport');
})().catch(error => { console.error(error); process.exitCode = 1; });
