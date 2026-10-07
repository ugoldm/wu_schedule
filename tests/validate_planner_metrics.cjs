// Run with: node tests/validate_planner_metrics.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'docs/app.js'), 'utf8');
const data = JSON.parse(fs.readFileSync(path.join(root, 'docs/data/schedule.json'), 'utf8'));
const nodes = {};
const context = {
  DATA: data, visibleEvents: [], state: { profile: 'both' },
  plannerMonths: ['2026-10', '2026-11', '2026-12', '2027-01'], plannerMonthIndex: 0,
  document: {
    querySelector: selector => nodes[selector] ||= {},
    querySelectorAll: () => []
  },
  monthFormatter: new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
  getToday: () => '2026-10-01', escapeHtml: value => String(value),
  eventDuration: event => {
    const minutes = time => { const [h, m] = time.split(':').map(Number); return h * 60 + m; };
    return minutes(event.end_time) - minutes(event.start_time);
  }
};
vm.createContext(context);
vm.runInContext(html.slice(html.indexOf('      const PEOPLE ='), html.indexOf('      const pageTitles =')), context);
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/202610070002_semester_catalog.sql'), 'utf8');
const presets = JSON.parse(migration.match(/'26W', '(\{"iurii"[^\n]+)'::jsonb/)[1]);
context.testPresets = presets;
vm.runInContext('for (const [key, person] of Object.entries(testPresets)) PEOPLE[key] = { ...person, courseIds: new Set(person.courseIds) };', context);
vm.runInContext(html.slice(html.indexOf('      function eventIsVisible('), html.indexOf('      function setProfile(')), context);
vm.runInContext(html.slice(html.indexOf('      function renderPlanner('), html.indexOf('      function renderSettings(')), context);
const render = profile => {
  context.state.profile = profile;
  context.renderPlanner();
  return nodes['#planner-metrics'].innerHTML;
};
for (let month = 0; month < context.plannerMonths.length; month++) {
  context.plannerMonthIndex = month;
  const both = render('both');
  for (const person of ['iurii', 'anna']) {
    const section = both.match(new RegExp(`<section[^>]*aria-labelledby="planner-metrics-${person}"[\\s\\S]*?</section>`))[0];
    const individual = render(person);
    assert.ok(section.includes(individual), `${person}: Both must match the individual schedule in month ${month}`);
    assert.match(individual, /<strong>5<\/strong> courses/);
    assert.match(individual, /<strong>24<\/strong> ECTS/);
  }
}
context.state.activeCourses = new Set(data.courses.map(course => course.course));
context.state.groups = Object.fromEntries(data.courses.filter(course => course.group === 'A').map(course => [course.course, 'A']));
const custom = render('custom');
assert.match(custom, /<strong>9<\/strong> courses/);
assert.match(custom, /<strong>40<\/strong> ECTS/);
assert.ok(!custom.includes('planner-person-metrics'));
console.log('PASS Both shows each person’s individual metrics across all four months; Custom keeps its totals');
