const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const { randomUUID } = require('node:crypto');
const { registerCodeGeneration } = require('../src/generation.ts');

const originalFetch = global.fetch;
const originalEnv = { ...process.env };
afterEach(() => { global.fetch = originalFetch; process.env = { ...originalEnv }; });
function socket() {
  const listeners = new Map();
  const value = {
    on(event, handler) { listeners.set(event, handler); return value; },
    trigger(event, ...args) { return listeners.get(event)?.(...args); },
  };
  process.env.AI_WORKER_URL = 'https://ai.example';
  process.env.DATABASE_WORKER_URL = 'https://db.example';
  process.env.CF_AI_KEY = 'existing-model-key';
  process.env.WORKERS_KEY = 'existing-db-key';
  registerCodeGeneration(value, { userId: 'authenticated-user' });
  return value;
}
function argumentsFor(options = {}) {
  return ['demo&文.ts', 'const secret = "x&y#z"', 3, 'Use https://example.com/docs?a=1&b=2#api ✓', options];
}
function mockResponse(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
}

test('real socket handler defaults to web search and preserves encoded input and existing credentials', async () => {
  const client = socket();
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return calls.length === 1 ? new Response('Success') : mockResponse({ response: 'generated()', sources: [{ url: 'https://example.com/docs' }] });
  };
  let result;
  await client.trigger('generateCode', ...argumentsFor(), (value) => { result = value; });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://db.example/api/sandbox/generate');
  assert.deepEqual(JSON.parse(calls[0].init.body), { userId: 'authenticated-user' });
  assert.equal(calls[0].init.headers.Authorization, 'existing-db-key');
  const params = new URL(calls[1].url).searchParams;
  assert.equal(params.get('fileName'), argumentsFor()[0]);
  assert.equal(params.get('code'), argumentsFor()[1]);
  assert.equal(params.get('instructions'), argumentsFor()[3]);
  assert.equal(params.get('webSearch'), 'true');
  assert.match(params.get('searchSessionId'), /^[0-9a-f-]{36}$/);
  assert.equal(calls[1].init.headers.Authorization, 'existing-model-key');
  assert.equal(result.success, true);
  assert.equal(result.response, 'generated()');
  assert.deepEqual(result.sources, [{ url: 'https://example.com/docs' }]);
});

test('explicit disable and popup session identity reach worker unchanged', async () => {
  const client = socket();
  const session = randomUUID();
  let params;
  global.fetch = async (url) => {
    if (String(url).startsWith('https://db.example')) return new Response('Success');
    params = new URL(url).searchParams;
    return mockResponse({ response: 'code' });
  };
  await client.trigger('generateCode', ...argumentsFor({ webSearch: false, searchSessionId: session }), () => {});
  assert.equal(params.get('webSearch'), 'false');
  assert.equal(params.get('searchSessionId'), session);
});

test('original five-argument protocol remains supported without a search key', async () => {
  const client = socket();
  const calls = [];
  global.fetch = async (url) => {
    calls.push(String(url));
    return calls.length === 1 ? new Response('Success') : mockResponse({ response: 'legacy()' });
  };
  let result;
  await client.trigger('generateCode', ...argumentsFor().slice(0, 4), (value) => { result = value; });
  assert.equal(result.response, 'legacy()');
  assert.equal(new URL(calls[1]).searchParams.get('webSearch'), 'true');
});

test('rejected generation allowance prevents inference and external search', async () => {
  const client = socket();
  let calls = 0, result;
  global.fetch = async () => { calls++; return new Response('Denied', { status: 400 }); };
  await client.trigger('generateCode', ...argumentsFor(), (value) => { result = value; });
  assert.equal(calls, 1);
  assert.equal(result.success, false);
  assert.match(result.error, /allowance/);
});

test('worker failure and invalid response are acknowledged without raw diagnostics or fallback', async () => {
  for (const response of [new Response('secret diagnostic', { status: 502 }), mockResponse({ response: '' }), mockResponse({})]) {
    const client = socket();
    let calls = 0, result;
    global.fetch = async () => ++calls === 1 ? new Response('Success') : response;
    await client.trigger('generateCode', ...argumentsFor(), (value) => { result = value; });
    assert.equal(calls, 2);
    assert.equal(result.success, false);
    assert.equal(result.error.includes('secret'), false);
  }
});

function blockingFetch(signals) {
  return async (url, init) => {
    if (String(url).startsWith('https://db.example')) return new Response('Success');
    signals.push(init.signal);
    return new Promise((resolve, reject) => {
      if (init.signal.aborted) return reject(new Error('aborted'));
      init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    });
  };
}
async function flush() { await Promise.resolve(); await Promise.resolve(); }

test('cancellation is scoped to request and socket; disconnect cancels remaining requests', async () => {
  const a = socket(), b = socket(), signals = [];
  global.fetch = blockingFetch(signals);
  const aId = randomUUID(), bId = randomUUID();
  const results = [];
  const first = a.trigger('generateCode', ...argumentsFor({ requestId: aId }), (value) => results.push(value));
  const second = b.trigger('generateCode', ...argumentsFor({ requestId: bId }), (value) => results.push(value));
  await flush();
  a.trigger('cancelGeneration', bId);
  assert.equal(signals[1].aborted, false);
  a.trigger('cancelGeneration', aId);
  await first;
  assert.equal(signals[0].aborted, true);
  assert.equal(signals[1].aborted, false);
  b.trigger('disconnect');
  await second;
  assert.equal(signals[1].aborted, true);
  assert.equal(results.every((value) => value.success === false), true);
});

test('generation timeout aborts outstanding worker request', async () => {
  const originalSetTimeout = global.setTimeout;
  let timeout;
  global.setTimeout = (callback) => { timeout = callback; return 0; };
  const client = socket(), signals = [];
  global.fetch = blockingFetch(signals);
  let result;
  try {
    const request = client.trigger('generateCode', ...argumentsFor(), (value) => { result = value; });
    await flush();
    timeout();
    await request;
    assert.equal(signals[0].aborted, true);
    assert.equal(result.success, false);
    assert.match(result.error, /timed out/);
  } finally { global.setTimeout = originalSetTimeout; }
});

test('malformed options and duplicate request identities do not start another operation', async () => {
  const client = socket(), signals = [], results = [];
  global.fetch = blockingFetch(signals);
  await client.trigger('generateCode', ...argumentsFor({ searchSessionId: 'personal-information' }), (value) => results.push(value));
  assert.equal(signals.length, 0);
  const requestId = randomUUID();
  const pending = client.trigger('generateCode', ...argumentsFor({ requestId }), (value) => results.push(value));
  await flush();
  await client.trigger('generateCode', ...argumentsFor({ requestId }), (value) => results.push(value));
  assert.equal(signals.length, 1);
  client.trigger('cancelGeneration', requestId);
  await pending;
  assert.equal(results.every((value) => value.success === false), true);
});
