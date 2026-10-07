const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('the public offline cache never intercepts OAuth returns, personal responses or unknown routes', async () => {
  const handlers = {}, writes = [];
  const source = fs.readFileSync('docs/sw.js', 'utf8');
  const context = { URL, Promise, Response,
    self: { location: { href: 'https://example.com/wu_schedule/sw.js', origin: 'https://example.com' },
      addEventListener: (name, handler) => { handlers[name] = handler; } },
    caches: { match: async () => null, open: async () => ({ put: async (...args) => writes.push(args) }) },
    fetch: async () => new Response('public app', { status: 200 })
  };
  vm.createContext(context); vm.runInContext(source, context);
  for (const path of [...source.match(/const PRECACHE = \[([\s\S]*?)\];/)[1].matchAll(/'\.\/([^']+)'/g)].map(match => match[1])) {
    assert.ok(fs.existsSync(`docs/${path}`), `offline asset exists: ${path}`);
  }
  const request = (url, options = {}) => {
    let response = null;
    const waits = [];
    handlers.fetch({ request: { url, method: 'GET', mode: 'cors', headers: new Headers(), ...options },
      respondWith: value => { response = value; }, waitUntil: value => waits.push(value) });
    return { response, waits };
  };
  const cases = [
    ['https://demo.supabase.co/rest/v1/user_plans', {}],
    ['https://example.com/wu_schedule/index.html?code=secret', { mode: 'navigate' }],
    ['https://example.com/wu_schedule/index.html?error=denied', { mode: 'navigate' }],
    ['https://example.com/wu_schedule/api/account', { mode: 'navigate' }],
    ['https://example.com/wu_schedule/api/account', {}],
    ['https://example.com/wu_schedule/index.html', { headers: new Headers({ Authorization: 'Bearer test' }) }],
    ['https://example.com/wu_schedule/data/schedule.json', { method: 'POST' }]
  ];
  for (const [url, options] of cases) assert.equal(request(url, options).response, null, url);
  const navigation = request('https://example.com/wu_schedule/', { mode: 'navigate' });
  assert.equal(await (await navigation.response).text(), 'public app');
  await Promise.all(navigation.waits);
  assert.equal(writes[0][0], './index.html');
  const script = request('https://example.com/wu_schedule/app.js');
  assert.ok(script.response);
  await script.response;
  assert.equal(writes.length, 2);
});
