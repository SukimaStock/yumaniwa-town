'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const legacyEngine = read('works/dotweather/sukimastock-engine.js');
const canonicalEngine = read('engine/sukimastock-engine.v0.2.0.js');
const sketch = read('works/dotweather/sketch.js');
const plain = value => JSON.parse(JSON.stringify(value));
const saved = {
  cityState: { version: 1, ids: ['tokyo', 'london', 'custom-city'], activeId: 'london' },
  activeCity: 'london',
  temperatureUnit: 'F',
  lowPower: true,
  viewMode: 'ambient',
  customCitiesV1: { version: 1, cities: [{ id: 'custom-city', name: 'Porto', latitude: 41.15, longitude: -8.61 }] },
  weatherCacheV1: { version: 1, updatedAt: 1790996400000, forecasts: { london: { temperature: 14, weather: 'clear' } } },
};

function runtime(engine, records = new Map(), blocked = false) {
  const w = {
    console, performance: { now: () => 0 },
    localStorage: {
      getItem(key) { if (blocked) throw Error('Storage denied'); return records.get(key) ?? null; },
      setItem(key, value) { if (blocked) throw Error('Storage denied'); records.set(key, String(value)); },
      removeItem(key) { if (blocked) throw Error('Storage denied'); records.delete(key); },
    },
  };
  w.window = w;
  const context = vm.createContext(w);
  vm.runInContext(engine, context);
  if (engine === canonicalEngine) {
    vm.runInContext(sketch, context);
    w.SSE.runtime.config.setup();
  } else {
    w.SSE.createApp({ id: 'dotweather', debug: false });
  }
  return { storage: w.SSE.storage, records };
}

function legacyRecords() {
  const h = runtime(legacyEngine);
  for (const [key, value] of Object.entries(saved)) h.storage.set(key, value);
  return h.records;
}

for (const [key, value] of Object.entries(saved)) {
  test(`legacy ${key} survives canonical migration without rewriting persistent data`, () => {
    const records = legacyRecords(), before = [...records];
    const h = runtime(canonicalEngine, records);
    assert.equal(h.storage.key(key), 'sse:dotweather:data:' + key);
    assert.deepEqual(plain(h.storage.get(key)), value);
    assert.deepEqual([...records], before);
  });
}

test('new values remain readable by the legacy Engine and after reload', () => {
  const records = legacyRecords(), h = runtime(canonicalEngine, records);
  h.storage.set('temperatureUnit', 'C');
  h.storage.set('viewMode', 'forecast');
  h.storage.set('cityState', { version: 1, ids: ['tokyo', 'london'], activeId: 'tokyo' });
  for (const engine of [legacyEngine, canonicalEngine]) {
    const next = runtime(engine, records);
    assert.equal(next.storage.get('temperatureUnit'), 'C');
    assert.equal(next.storage.get('viewMode'), 'forecast');
    assert.equal(next.storage.get('cityState').activeId, 'tokyo');
  }
});

test('invalid new settings do not overwrite valid saved values', () => {
  const records = legacyRecords(), h = runtime(canonicalEngine, records), before = [...records];
  for (const [key, value] of [['temperatureUnit', 'K'], ['viewMode', 'unknown'], ['cityState', { version: 1, ids: [123] }]]) {
    assert.equal(h.storage.set(key, value), false);
    assert.deepEqual(plain(h.storage.get(key)), saved[key]);
  }
  assert.deepEqual([...records], before);
});

test('missing saved values use expected defaults', () => {
  const h = runtime(canonicalEngine);
  for (const [key, value] of Object.entries({ cityState: null, activeCity: '', temperatureUnit: 'C', lowPower: false, viewMode: 'forecast', customCitiesV1: null, weatherCacheV1: null })) {
    assert.deepEqual(plain(h.storage.get(key)), value);
  }
  assert.equal(h.records.size, 0);
});

test('malformed JSON and invalid saved settings fall back without destructive rewrite', () => {
  const records = new Map([
    ['sse:dotweather:data:weatherCacheV1', '{broken'],
    ['sse:dotweather:data:temperatureUnit', JSON.stringify({ version: 1, value: 'K' })],
    ['sse:dotweather:data:cityState', JSON.stringify({ version: 1, value: { version: 1, ids: [123] } })],
  ]);
  const before = [...records], h = runtime(canonicalEngine, records);
  assert.equal(h.storage.get('weatherCacheV1'), null);
  assert.equal(h.storage.get('temperatureUnit'), 'C');
  assert.equal(h.storage.get('cityState'), null);
  assert.deepEqual([...records], before);
});

test('denied persistent storage retains the latest valid value in memory', () => {
  const h = runtime(canonicalEngine, new Map(), true);
  const result = h.storage.set('temperatureUnit', 'F');
  assert.equal(result, true);
  assert.equal(h.storage.info('temperatureUnit').persistent, false);
  assert.equal(h.storage.get('temperatureUnit'), 'F');
  assert.equal(h.records.size, 0);
});
