import { test } from 'node:test';
process.env.VAC_SEARCH_REQUESTS_PER_DAY = '100';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fetchTavily, fetchBrave, fetchDuckDuckGo, executeSearch } from '../src/server/tools';
import { INFERENCE_TIMEOUT_SCHEMA, setSearchKey, resolveProvider, infer } from '../src/server/providers';
import { RUN_TIMEOUT_SCHEMA, RunEngine } from '../src/server/runs';
import { Store } from '../src/server/store';
import { SearchCredentials } from '../src/server/searchCredentials';

test('retired providers cannot resolve or execute persisted runs', async () => {
  const config = { provider: 'omniroute', model: 'auto', endpoint: 'http://127.0.0.1:20128/v1', temperature: 0.2, maxTokens: 128 };
  assert.throws(() => resolveProvider({ llmConfig: config } as any, { omniroute: { enabled: true } } as any), /unsupported/);
  await assert.rejects(infer(config, [], new AbortController().signal), /unsupported/);
});

test('credential migration preserves keys outside database records and removal survives restart', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vac-credentials-'));
  const store = new Store(directory);
  try {
    store.put('settings', 'search', { activeProvider: 'tavily', tavilyApiKey: 'legacy-test-key' });
    const credentials = new SearchCredentials(directory, store);
    assert.deepEqual(store.get('settings', 'search'), { activeProvider: 'tavily' });
    const file = path.join(directory, 'search-credentials.json');
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).tavily, 'legacy-test-key');
    credentials.update({ tavily: '', brave: 'test-brave-key' });
    new SearchCredentials(directory, store);
    assert.equal(process.env.TAVILY_API_KEY, '');
    assert.equal(process.env.BRAVE_SEARCH_API_KEY, 'test-brave-key');
  } finally {
    store.close(); fs.rmSync(directory, { recursive: true, force: true });
    setSearchKey('tavily', ''); setSearchKey('brave', '');
  }
});

test('search failures preserve attempts, explicit selection stays pinned, and cancellation stops fallback', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vac-fallback-'));
  const store = new Store(directory);
  setSearchKey('tavily', 'test-key'); setSearchKey('brave', 'test-key');
  try {
    const calls: string[] = [];
    const fetcher: typeof fetch = async (input, init) => {
      assert.equal(init?.redirect, 'error'); calls.push(String(input));
      if (String(input).includes('tavily')) return new Response('unavailable', { status: 503 });
      return new Response(JSON.stringify({ web: { results: [] } }));
    };
    store.put('settings', 'search', { activeProvider: 'auto' });
    const fallback = await executeSearch('test', store, new AbortController().signal, fetcher);
    assert.equal(fallback.provider, 'brave');
    assert.equal(fallback.found, false);
    assert.deepEqual(fallback.attempts?.map(a => a.status), ['failed', 'empty']);
    store.put('settings', 'search', { activeProvider: 'tavily' });
    calls.length = 0;
    const pinned = await executeSearch('test', store, new AbortController().signal, fetcher);
    assert.match(pinned.error!, /503/); assert.equal(calls.length, 1);
    store.put('settings', 'search', { activeProvider: 'auto' });
    const controller = new AbortController(); calls.length = 0;
    await assert.rejects(executeSearch('test', store, controller.signal, async input => {
      calls.push(String(input)); controller.abort(); throw new Error('aborted');
    }), /abort/i);
    assert.equal(calls.length, 1);
  } finally {
    store.close(); fs.rmSync(directory, { recursive: true, force: true });
    setSearchKey('tavily', ''); setSearchKey('brave', '');
  }
});

test('search responses reject invalid destinations and bound source excerpts', async () => {
  const signal = new AbortController().signal;
  await assert.rejects(fetchTavily('test', 'key', signal, async () => new Response(JSON.stringify({ results: [{ title: 'bad', url: 'javascript:alert(1)', content: 'bad' }] }))));
  await assert.rejects(fetchTavily('test', 'key', signal, async () => new Response('{}')));
  const output = await fetchBrave('original', 'key', signal, async () => new Response(JSON.stringify({ query: { altered: 'corrected' }, web: { results: Array.from({ length: 20 }, () => ({ title: 'title', url: 'https://example.com', description: 'x'.repeat(10000) })) } })));
  assert.equal(output.executedQuery, 'corrected');
  assert.equal(output.results.length, 5);
  assert.equal(output.results[0].snippet.length, 2000);
});

test('unsuccessful query rewrite is still recorded', async () => {
  const output = await fetchDuckDuckGo('is UiPath worth investing', new AbortController().signal, async () => new Response('{}'));
  assert.equal(output.executedQuery, 'UiPath');
  assert.equal(output.found, false);
  assert.equal(output.attempts?.length, 2);
});

test('fetchTavily returns structured output with partial coverage, dates, and score', async () => {
  const mockFetch: typeof fetch = async (input, init) => {
    assert.match(String(input), /api\.tavily\.com\/search/);
    const body = JSON.parse(String(init?.body));
    assert.equal(body.query, 'uipath stock analysis');
    assert.equal((init?.headers as any).Authorization, 'Bearer tvly-mock-key');
    assert.equal(init?.redirect, 'error');
    assert.equal(body.include_answer, false);

    return new Response(JSON.stringify({
      answer: 'UiPath (PATH) showed strong Q2 growth.',
      query: 'uipath stock analysis',
      results: [
        {
          title: 'UiPath Valuation in 2026',
          url: 'https://finance.example.com/uipath',
          content: 'UiPath reported quarterly revenue growth and expanding operating margins.',
          score: 0.94,
          published_date: '2026-08-20',
        },
      ],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const controller = new AbortController();
  const output = await fetchTavily('uipath stock analysis', 'tvly-mock-key', controller.signal, mockFetch);

  assert.equal(output.found, true);
  assert.equal(output.provider, 'tavily');
  assert.equal(output.coverage, 'partial');
  assert.equal(output.originalQuery, 'uipath stock analysis');
  assert.equal(output.executedQuery, 'uipath stock analysis');
  assert.equal(output.results.length, 1);
  assert.equal(output.results[0].url, 'https://finance.example.com/uipath');
  assert.equal(output.results[0].score, 0.94);
  assert.equal(output.results[0].publishedDate, '2026-08-20');
  assert.ok(!JSON.stringify(output).includes('Tavily Summary Answer'));
});

test('fetchTavily handles empty search results explicitly', async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(JSON.stringify({ results: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const controller = new AbortController();
  const output = await fetchTavily('nonexistent entity xyz123', 'tvly-mock-key', controller.signal, mockFetch);

  assert.equal(output.found, false);
  assert.equal(output.coverage, 'none');
  assert.equal(output.results.length, 0);
  assert.match(output.guidance || '', /No web search results were found/);
});

test('fetchBrave returns structured output, strips HTML markup, and captures page_age', async () => {
  const mockFetch: typeof fetch = async (input, init) => {
    assert.match(String(input), /api\.search\.brave\.com\/res\/v1\/web\/search/);
    assert.equal(init?.headers && (init.headers as any)['X-Subscription-Token'], 'brave-mock-key');

    return new Response(JSON.stringify({
      web: {
        results: [
          {
            title: 'UiPath: Turnaround Play in <b>2026</b>',
            url: 'https://markets.example.com/uipath',
            description: 'Analysts evaluate <b>UiPath</b> enterprise automation demand in <b>2026</b>.',
            page_age: '2026-09-01T12:00:00Z',
          },
        ],
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const controller = new AbortController();
  const output = await fetchBrave('uipath turnaround', 'brave-mock-key', controller.signal, mockFetch);

  assert.equal(output.found, true);
  assert.equal(output.provider, 'brave');
  assert.equal(output.coverage, 'partial');
  assert.equal(output.results[0].title, 'UiPath: Turnaround Play in 2026');
  assert.equal(output.results[0].snippet, 'Analysts evaluate UiPath enterprise automation demand in 2026.');
  assert.equal(output.results[0].pageDate, '2026-09-01T12:00:00Z');
});

test('fetchDuckDuckGo preserves query rewriting provenance and separates guidance from source snippets', async () => {
  const mockFetch: typeof fetch = async (input) => {
    const url = new URL(String(input));
    const q = url.searchParams.get('q');
    if (q === 'UiPath') {
      return new Response(JSON.stringify({
        Heading: 'UiPath',
        AbstractText: 'UiPath is a global software company for robotic process automation.',
        AbstractURL: 'https://en.wikipedia.org/wiki/UiPath',
        RelatedTopics: [],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ Heading: '', AbstractText: '', RelatedTopics: [] }), { status: 200 });
  };

  const controller = new AbortController();
  const original = 'is UiPath worth investing';
  const output = await fetchDuckDuckGo(original, controller.signal, mockFetch);

  assert.equal(output.found, true);
  assert.equal(output.provider, 'duckduckgo');
  assert.equal(output.coverage, 'partial'); // Rewritten query -> partial coverage
  assert.equal(output.originalQuery, original);
  assert.equal(output.executedQuery, 'UiPath'); // Stripped filler/financial words
  // Verify guidance is in guidance field, NOT polluted into snippet
  assert.match(output.guidance || '', /instant-answer/i);
  assert.equal(output.results[0].snippet, 'UiPath is a global software company for robotic process automation.');
  assert.doesNotMatch(output.results[0].snippet, /instant-answer|guidance/i);
});

test('executeSearch honors activeProvider preference and falls back correctly', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vac-search-test-'));
  try {
    const store = new Store(tmpDir);

    let calledTavily = false;
    let calledBrave = false;
    let calledDdg = false;

    const mockFetch: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('tavily.com')) {
        calledTavily = true;
        return new Response(JSON.stringify({
          query: 'test',
          results: [{ title: 'Tavily Result', url: 'https://tavily.com', content: 'Tavily content' }],
        }), { status: 200 });
      }
      if (url.includes('brave.com')) {
        calledBrave = true;
        return new Response(JSON.stringify({
          web: { results: [{ title: 'Brave Result', url: 'https://brave.com', description: 'Brave description' }] },
        }), { status: 200 });
      }
      if (url.includes('duckduckgo.com')) {
        calledDdg = true;
        return new Response(JSON.stringify({
          Heading: 'DDG', AbstractText: 'DDG content', AbstractURL: 'https://duckduckgo.com', RelatedTopics: [],
        }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    };

    // Configure keys
    setSearchKey('tavily', 'test-tvly-key');
    setSearchKey('brave', 'test-brave-key');

    // Case 1: activeProvider = 'brave' -> calls Brave
    store.put('settings', 'search', { activeProvider: 'brave' });
    const braveOutput = await executeSearch('test brave', store, new AbortController().signal, mockFetch);
    assert.equal(braveOutput.provider, 'brave');
    assert.equal(calledBrave, true);

    // Case 2: activeProvider = 'tavily' -> calls Tavily
    store.put('settings', 'search', { activeProvider: 'tavily' });
    const tavilyOutput = await executeSearch('test tavily', store, new AbortController().signal, mockFetch);
    assert.equal(tavilyOutput.provider, 'tavily');
    assert.equal(calledTavily, true);

    // Case 3: activeProvider = 'duckduckgo' -> bypasses keys and calls DDG
    store.put('settings', 'search', { activeProvider: 'duckduckgo' });
    const ddgOutput = await executeSearch('test ddg', store, new AbortController().signal, mockFetch);
    assert.equal(ddgOutput.provider, 'duckduckgo');
    assert.equal(calledDdg, true);

    // Clean up keys
    setSearchKey('tavily', '');
    setSearchKey('brave', '');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('timeout schemas strictly validate and bound timeout settings', () => {
  // INFERENCE_TIMEOUT_SCHEMA (5,000ms to 900,000ms)
  assert.equal(INFERENCE_TIMEOUT_SCHEMA.safeParse(300000).success, true);
  assert.equal(INFERENCE_TIMEOUT_SCHEMA.safeParse(5000).success, true);
  assert.equal(INFERENCE_TIMEOUT_SCHEMA.safeParse(900000).success, true);
  assert.equal(INFERENCE_TIMEOUT_SCHEMA.safeParse(4999).success, false);
  assert.equal(INFERENCE_TIMEOUT_SCHEMA.safeParse(900001).success, false);
  assert.equal(INFERENCE_TIMEOUT_SCHEMA.safeParse('not-a-number').success, false);
  assert.equal(INFERENCE_TIMEOUT_SCHEMA.safeParse(12345.67).success, false);

  // RUN_TIMEOUT_SCHEMA (30,000ms to 1,800,000ms)
  assert.equal(RUN_TIMEOUT_SCHEMA.safeParse(300000).success, true);
  assert.equal(RUN_TIMEOUT_SCHEMA.safeParse(30000).success, true);
  assert.equal(RUN_TIMEOUT_SCHEMA.safeParse(1800000).success, true);
  assert.equal(RUN_TIMEOUT_SCHEMA.safeParse(29999).success, false);
  assert.equal(RUN_TIMEOUT_SCHEMA.safeParse(1800001).success, false);
  assert.equal(RUN_TIMEOUT_SCHEMA.safeParse(-1).success, false);
});

test('RunEngine.stats reports active and queued run metrics', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vac-engine-stats-test-'));
  try {
    const store = new Store(tmpDir);
    const engine = new RunEngine(store, () => ({} as any));
    const stats = engine.stats();
    assert.equal(stats.activeRuns, 0);
    assert.equal(stats.queuedRuns, 0);
    assert.equal(stats.activeCount, 0);
    assert.equal(stats.queuedCount, 0);
    assert.equal(stats.oldestQueueAgeMs, 0);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
