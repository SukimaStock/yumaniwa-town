'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'works/steamclock/sw.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'works/steamclock/index.html'), 'utf8');
const base = 'https://sukimastock.github.io/yumaniwa-town/works/steamclock/';
const current = 'steamclock-v11';
const resolve = value => new URL(typeof value === 'string' ? value : value.url, base).href;
const response = (body, status = 200, type = 'basic') => ({ body, status, type, clone() { return response(body, status, type); } });
const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

function harness({ offline = false, installFailure = false, networkResponse, initial = new Map() } = {}) {
  const stores = new Map([...initial].map(([name, items]) => [name, new Map(items)]));
  const handlers = new Map(), deleted = [], requests = [], precached = [];
  let skips = 0, claims = 0;
  const caches = {
    async keys() { return [...stores.keys()]; },
    async delete(name) { deleted.push(name); return stores.delete(name); },
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const items = stores.get(name);
      return {
        async addAll(urls) {
          if (installFailure) throw Error('precache unavailable');
          for (const url of urls) { precached.push(resolve(url)); items.set(resolve(url), response(url)); }
        },
        async put(key, value) { items.set(resolve(key), value); },
      };
    },
    async match(key) {
      for (const items of stores.values()) if (items.has(resolve(key))) return items.get(resolve(key));
      return undefined;
    },
  };
  const self = {
    location: { origin: new URL(base).origin },
    clients: { async claim() { claims++; } },
    async skipWaiting() { skips++; },
    addEventListener(name, fn) { handlers.set(name, fn); },
  };
  const fetch = async request => {
    requests.push(resolve(request));
    if (offline) throw Error('network offline');
    return networkResponse || response('network:' + resolve(request));
  };
  vm.runInNewContext(worker, { self, caches, fetch, URL });
  async function lifecycle(name) {
    let pending;
    handlers.get(name)({ waitUntil(promise) { pending = promise; } });
    await pending;
  }
  async function get(url, options = {}) {
    let pending, handled = false;
    handlers.get('fetch')({ request: { url: resolve(url), method: 'GET', mode: 'cors', ...options }, respondWith(promise) { handled = true; pending = promise; } });
    const result = await pending;
    await tick();
    return { handled, response: result };
  }
  return { stores, deleted, requests, precached, lifecycle, get, get skips() { return skips; }, get claims() { return claims; } };
}

test('install caches the matching versioned sketch, canonical Engine and critical images', async () => {
  const h = harness();
  await h.lifecycle('install');
  const sketch = html.match(/<script src="(sketch\.js[^\"]*)"/)[1];
  assert.ok(sketch.includes('?v='));
  assert.ok(h.precached.includes(resolve(sketch)));
  assert.ok(h.precached.includes(resolve('../../engine/sukimastock-engine.v0.2.0.js')));
  assert.ok(!h.precached.includes(resolve('./sukimastock-engine.js')));
  for (const name of ['background.jpg', 'dial.png', 'hour_hand.png', 'minute_hand.png', 'second_hand.png', 'nixie_tube.png']) {
    assert.ok(h.precached.includes(resolve('./assets/' + name)));
  }
  assert.ok(!h.precached.includes(resolve('./assets/gear1.png')));
  assert.ok(!h.precached.includes(resolve('./assets/spring.png')));
  for (const url of h.precached) {
    const local = new URL(url).pathname.replace('/yumaniwa-town/', '');
    assert.ok(fs.existsSync(path.join(root, local)), local);
  }
  assert.equal(h.skips, 1);
});

test('failed precache does not activate an incomplete worker', async () => {
  const h = harness({ installFailure: true });
  await assert.rejects(h.lifecycle('install'), /precache unavailable/);
  assert.equal(h.skips, 0);
});

test('activation removes only old production SteamClock caches and preserves all other caches', async () => {
  const names = ['steamclock-v9', 'steamclock-v10', current, 'steamclock-staging-v12', 'steamclock-staging-v13', 'yumaniwa-town-v7', 'dotweather-v3', 'unrelated-cache'];
  const initial = new Map(names.map(name => [name, [[resolve('./sentinel-' + name), response(name)]]]));
  const h = harness({ initial });
  await h.lifecycle('activate');
  assert.deepEqual(h.deleted.sort(), ['steamclock-v10', 'steamclock-v9']);
  for (const name of names.filter(name => !h.deleted.includes(name))) {
    assert.equal(h.stores.get(name).get(resolve('./sentinel-' + name)).body, name);
  }
  assert.equal(h.claims, 1);
});

test('offline navigation returns the precached clock entry', async () => {
  const h = harness({ offline: true });
  await h.lifecycle('install');
  const r = await h.get('./', { mode: 'navigate' });
  assert.equal(r.handled, true);
  assert.equal(r.response.body, './index.html');
});

test('online navigation refreshes the cached entry for the next offline visit', async () => {
  const h = harness();
  await h.lifecycle('install');
  const r = await h.get('./?from=town', { mode: 'navigate' });
  assert.match(r.response.body, /^network:/);
  assert.equal(h.stores.get(current).get(resolve('./index.html')).body, r.response.body);
});

for (const asset of ['../../engine/sukimastock-engine.v0.2.0.js', './sketch.js?v=20261003-assets-v2']) {
  test(`offline startup serves cached ${asset} without a network request`, async () => {
    const h = harness({ offline: true });
    await h.lifecycle('install');
    const r = await h.get(asset);
    assert.equal(r.response.body, asset);
    assert.equal(h.requests.length, 0);
  });
}

test('successfully loaded decorative image is retained in the current cache', async () => {
  const h = harness();
  await h.lifecycle('install');
  const r = await h.get('./assets/gear1.png');
  assert.equal(h.stores.get(current).get(resolve('./assets/gear1.png')).body, r.response.body);
});

for (const [label, result] of [['failed response', response('missing', 404)], ['opaque response', response('opaque', 200, 'opaque')]]) {
  test(`${label} is passed through without poisoning the asset cache`, async () => {
    const h = harness({ networkResponse: result });
    const r = await h.get('./assets/gear2.png');
    assert.equal(r.response, result);
    assert.ok(!h.stores.get(current)?.has(resolve('./assets/gear2.png')));
  });
}

for (const [label, url, options] of [['external font', 'https://fonts.gstatic.com/font.woff2', {}], ['POST', './event', { method: 'POST' }]]) {
  test(`${label} bypasses the SteamClock worker cache`, async () => {
    const h = harness();
    const r = await h.get(url, options);
    assert.equal(r.handled, false);
    assert.equal(h.requests.length, 0);
    assert.equal(h.stores.size, 0);
  });
}
