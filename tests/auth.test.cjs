const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const model = require('../docs/js/plan-model.js');
const { createController } = require('../docs/js/account.js');
const courses = JSON.parse(fs.readFileSync('docs/data/schedule.json')).courses;
const presets = JSON.parse(fs.readFileSync('supabase/migrations/202610070002_semester_catalog.sql', 'utf8').match(/'26W', '(\{"iurii"[^\n]+)'::jsonb/)[1]);
function storage() {
  const items = new Map();
  return { getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, value), removeItem: key => items.delete(key), items };
}
function fixture(options = {}) {
  const local = options.storage || storage(), notifications = [], requests = [];
  let listener, user = { id: options.id || 'user-a', email: 'person@example.com', user_metadata: { full_name: 'Test Person' } };
  let remote = options.remote || { is_owner: false, presets: {}, plan: null };
  const client = {
    auth: {
      getSession: async () => ({ data: { session: user ? { user } : null } }),
      getUser: async () => options.getUser ? options.getUser(user) : ({ data: { user }, error: null }),
      exchangeCodeForSession: async code => { requests.push(['exchange', code]); return { error: null }; },
      onAuthStateChange: callback => { listener = callback; return { data: { subscription: { unsubscribe() {} } } }; },
      signInWithOAuth: async args => { requests.push(['oauth', args]); return { error: null }; },
      signOut: async args => { requests.push(['signOut', args]); user = null; listener?.('SIGNED_OUT', null); return { error: null }; }
    },
    rpc: async (name, args) => {
      requests.push([name, args]);
      if (options.rpc) return options.rpc(name, args);
      if (name === 'get_schedule_context') return { data: structuredClone(remote), error: null };
      const current = remote.plan?.revision || 0;
      if (args.p_expected_revision !== current) return { error: { code: '40001' } };
      remote.plan = { selected_course_ids: args.p_course_ids, profile: args.p_profile, revision: current + 1 };
      return { data: structuredClone(remote.plan), error: null };
    }
  };
  const history = { replaceState: (...args) => requests.push(['replaceState', ...args]) };
  const controller = createController({ config: options.disabled ? { semesterCode: '26W' } : {
    semesterCode: '26W', supabaseUrl: 'https://demo.supabase.co', supabasePublishableKey: 'sb_publishable_example'
  }, courses, storage: local, createClient: (_, __, opts) => { requests.push(['createClient', opts]); return client; },
  location: { href: options.href || 'https://example.com/wu_schedule/index.html#settings' }, history,
  onChange: (info, changed) => notifications.push({ info, changed }) });
  return { controller, local, requests, notifications, remote, event: (event, next) => { user = next; listener(event, next ? { user: next } : null); } };
}

test('guests get required courses, cannot select owner presets, and never read legacy personal choices', async t => {
  const f = fixture({ disabled: true }); t.after(() => f.controller.destroy());
  model.write(f.local, model.LEGACY_KEY, { profile: 'both', activeCourses: ['Marketing and Innovation'], groups: {} });
  await f.controller.start();
  assert.deepEqual(f.controller.snapshot().plan.selected_course_ids, ['1192', '2430']);
  f.controller.setPlan({ profile: 'iurii', selected_course_ids: ['1312', '2432'] });
  assert.equal(f.controller.snapshot().plan.profile, 'custom');
  assert.equal(f.requests.length, 0);
});

test('Google uses PKCE and a callback retaining the GitHub Pages subpath', async t => {
  const f = fixture({ href: 'https://example.com/wu_schedule/index.html?code=one-time-code#settings' }); t.after(() => f.controller.destroy());
  await f.controller.start();
  assert.equal(f.requests.find(item => item[0] === 'createClient')[1].auth.flowType, 'pkce');
  assert.ok(f.requests.some(item => item[0] === 'exchange' && item[1] === 'one-time-code'));
  assert.equal(f.requests.find(item => item[0] === 'replaceState').at(-1), '/wu_schedule/index.html#settings');
  await f.controller.signIn();
  const args = f.requests.find(item => item[0] === 'oauth')[1];
  assert.equal(args.provider, 'google');
  assert.equal(args.options.redirectTo, 'https://example.com/wu_schedule/index.html');
  assert.ok(!f.requests.some(item => /otp|email/i.test(item[0])));
});

test('new accounts save guest choices, while existing accounts offer an explicit import', async t => {
  const local = storage(); model.write(local, model.GUEST_KEY, { edited: true, plan: { selected_course_ids: ['1312', '2432', '2463'] } });
  const f = fixture({ storage: local }); t.after(() => f.controller.destroy());
  await f.controller.start(); await f.controller.flush();
  assert.deepEqual(f.remote.plan.selected_course_ids, ['1312', '2432', '2463']);
  const existing = fixture({ storage: local, id: 'user-b', remote: { is_owner: false, presets: {}, plan: { selected_course_ids: ['1192', '2430'], profile: 'custom', revision: 7 } } });
  t.after(() => existing.controller.destroy()); await existing.controller.start();
  assert.equal(existing.controller.snapshot().revision, 7);
  assert.ok(existing.controller.snapshot().importCandidate);
  assert.equal(existing.requests.filter(item => item[0] === 'save_schedule_plan').length, 0);
  existing.controller.importGuest(); await existing.controller.flush();
  assert.deepEqual(existing.remote.plan.selected_course_ids, ['1312', '2432', '2463']);
});

test('only server owner permission exposes presets and migrates the old owner selection', async t => {
  const local = storage(); model.write(local, model.LEGACY_KEY, { profile: 'both', activeCourses: ['Foundations of Digital Economy', 'Digital Markets and Strategies', 'Data Management'], groups: { 'Foundations of Digital Economy': 'C', 'Digital Markets and Strategies': 'B', 'Data Management': 'B' } });
  const f = fixture({ storage: local, remote: { is_owner: true, presets, plan: null } }); t.after(() => f.controller.destroy());
  await f.controller.start();
  assert.equal(f.controller.snapshot().owner, true);
  assert.equal(f.controller.snapshot().plan.profile, 'both');
  assert.deepEqual(f.controller.snapshot().plan.selected_course_ids, ['1312', '2432', '2463']);
  await f.controller.flush();
  assert.equal(f.remote.plan.profile, 'both');
  assert.equal(model.read(local, model.LEGACY_KEY), null);
  await f.controller.signOut();
  assert.equal(f.controller.snapshot().owner, false);
  assert.deepEqual(f.controller.snapshot().presets, {});
  assert.equal(model.read(local, model.accountKey('user-a', '26W')), null);
});

test('conflicting writes preserve the local draft until the user chooses a version', async t => {
  const f = fixture(); t.after(() => f.controller.destroy());
  await f.controller.start(); await f.controller.flush();
  f.remote.plan.revision = 4;
  f.controller.setPlan({ selected_course_ids: ['1192', '2430', '2463'] });
  await f.controller.flush();
  assert.equal(f.controller.snapshot().status, 'conflict');
  assert.ok(f.controller.snapshot().plan.selected_course_ids.includes('2463'));
  await f.controller.resolveConflict('local');
  assert.equal(f.remote.plan.revision, 5);
  assert.ok(f.remote.plan.selected_course_ids.includes('2463'));
  f.controller.setPlan({ selected_course_ids: ['1192', '2430', '1195'] });
  f.remote.plan.revision = 6;
  await f.controller.flush(); await f.controller.resolveConflict('cloud');
  assert.ok(f.controller.snapshot().plan.selected_course_ids.includes('2463'));
  assert.equal(f.controller.snapshot().pending, false);
});

test('offline drafts survive reload and detect a remote revision change', async t => {
  const local = storage(); model.write(local, model.accountKey('user-a', '26W'), { pending: true, revision: 2, owner: false, presets: {}, plan: { selected_course_ids: ['1192', '2430', '1195'] } });
  const f = fixture({ storage: local, remote: { is_owner: false, presets: {}, plan: { selected_course_ids: ['1192', '2430'], profile: 'custom', revision: 3 } } });
  t.after(() => f.controller.destroy()); await f.controller.start();
  assert.equal(f.controller.snapshot().status, 'conflict');
  assert.ok(f.controller.snapshot().plan.selected_course_ids.includes('1195'));
  assert.equal(model.read(local, model.accountKey('user-a', '26W')).revision, 2, 'conflicting draft keeps its original base revision across reloads');
  const reloaded = fixture({ storage: local, remote: f.remote });
  t.after(() => reloaded.controller.destroy()); await reloaded.controller.start();
  assert.equal(reloaded.controller.snapshot().status, 'conflict');
  assert.equal(reloaded.requests.filter(item => item[0] === 'save_schedule_plan').length, 0);
  await f.controller.resolveConflict('cloud');
  assert.deepEqual(f.controller.snapshot().plan.selected_course_ids, ['1192', '2430']);
});

test('granting owner access after the first sign-in still offers legacy migration', async t => {
  const local = storage();
  model.write(local, model.LEGACY_KEY, { profile: 'both', activeCourses: ['Foundations of Digital Economy', 'Digital Markets and Strategies'], groups: { 'Foundations of Digital Economy': 'C', 'Digital Markets and Strategies': 'B' } });
  const f = fixture({ storage: local, remote: { is_owner: true, presets, plan: { selected_course_ids: ['1192', '2430'], profile: 'custom', revision: 1 } } });
  t.after(() => f.controller.destroy()); await f.controller.start();
  assert.equal(f.controller.snapshot().importCandidate.profile, 'both');
  assert.ok(model.read(local, model.LEGACY_KEY));
  f.controller.importGuest(); await f.controller.flush();
  assert.equal(f.remote.plan.profile, 'both');
  assert.equal(model.read(local, model.LEGACY_KEY), null);
});

test('a response arriving after sign-out cannot restore another account or its cache', async t => {
  let resolveSave;
  const f = fixture({ rpc: async name => {
    if (name === 'get_schedule_context') return { data: { is_owner: true, presets, plan: null } };
    return new Promise(resolve => { resolveSave = resolve; });
  } }); t.after(() => f.controller.destroy()); await f.controller.start();
  const saving = f.controller.flush(); await f.controller.signOut();
  resolveSave({ data: { revision: 1 } }); await saving;
  assert.equal(f.controller.snapshot().user, null);
  assert.equal(f.controller.snapshot().owner, false);
  assert.equal(model.read(f.local, model.accountKey('user-a', '26W')), null);
});

test('edits made during an in-flight save are kept for the next revision', async t => {
  let resolveSave, calls = 0;
  const f = fixture({ rpc: async name => {
    if (name === 'get_schedule_context') return { data: { is_owner: false, presets: {}, plan: null } };
    if (++calls === 1) return new Promise(resolve => { resolveSave = resolve; });
    return { data: { revision: calls } };
  } }); t.after(() => f.controller.destroy()); await f.controller.start();
  const saving = f.controller.flush();
  f.controller.setPlan({ selected_course_ids: ['1192', '2430', '2463'] });
  resolveSave({ data: { revision: 1 } }); await saving;
  assert.equal(f.controller.snapshot().pending, true);
  await f.controller.flush();
  assert.equal(f.controller.snapshot().revision, 2);
  assert.ok(f.requests.filter(item => item[0] === 'save_schedule_plan').at(-1)[1].p_course_ids.includes('2463'));
});
