import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '../src/index';
import { MODEL, SEARCH_ENDPOINT, SEARCH_USER_AGENT } from '../src/web-context';

type Call = { method: string; params?: any; id?: number };
const page = { url: 'https://react.dev/reference/react/useEffect', title: 'useEffect', excerpts: ['Call useEffect(setup, dependencies) at the top level of your component.'] };
const sessionA = 'c7aca557-bd92-46fc-b190-10c82c9aa36b';
const sessionB = '671566eb-a7d1-4d82-860e-0804f0e18412';
let calls: Call[];
let requests: { url: string; headers: Headers }[];
let mode: string;
let inference: ReturnType<typeof vi.fn>;
let active: AbortSignal | undefined;

function generation(prompt = 'Use React effect cleanup', options: Record<string, string> = {}, signal?: AbortSignal) {
  const query = new URLSearchParams({ fileName: 'private-file.ts', line: '2', code: 'PRIVATE_CODE_SENTINEL', instructions: prompt, ...options });
  return new Request(`https://ai.example/api?${query}`, { signal });
}

async function mcpFetch(url: any, init?: RequestInit) {
  requests.push({ url: String(url), headers: new Headers(init?.headers) });
  if (init?.method === 'GET') return new Response(null, { status: 405 });
  const call = JSON.parse(String(init?.body)) as Call;
  calls.push(call);
  if (mode === 'auth') return new Response('Unauthorized', { status: 401 });
  if (!('id' in call)) return new Response(null, { status: 202 });
  let result: any;
  if (call.method === 'initialize') {
    result = { protocolVersion: '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'fixture', version: '1' } };
  } else if (call.method === 'tools/list') {
    result = { tools: mode === 'missing' ? [] : ['web_search', 'web_fetch'].map(name => ({ name, inputSchema: { type: 'object' }, ...(mode === 'textOnly' || mode === 'malformed' ? {} : { outputSchema: { type: 'object', properties: { results: { type: 'array' } }, required: ['results'] } }) })) };
  } else if (call.method === 'tools/call') {
    if (mode === 'stalledBody') {
      active = init?.signal ?? undefined;
      return new Response(new ReadableStream({ start(controller) { active?.addEventListener('abort', () => controller.error(new DOMException('Aborted', 'AbortError')), { once: true }); } }), { headers: { 'Content-Type': 'text/event-stream' } });
    }
    if (mode === 'hang') {
      active = init?.signal ?? undefined;
      return new Promise<Response>((_, reject) => {
        const abort = () => reject(new DOMException('Aborted', 'AbortError'));
        if (active?.aborted) abort();
        else active?.addEventListener('abort', abort, { once: true });
      });
    }
    const data = { results: mode === 'empty' ? [] : mode === 'unsafe' ? [{ ...page, url: 'javascript:alert(1)' }] : [page] };
    result = mode === 'toolError' ? { isError: true, content: [{ type: 'text', text: 'Private provider diagnostic' }] } : { content: [{ type: 'text', text: mode === 'malformed' ? 'not JSON' : JSON.stringify(data) }], ...(mode === 'malformed' || mode === 'textOnly' ? {} : { structuredContent: data }) };
  } else throw new Error(`Unexpected MCP method ${call.method}`);
  const envelope = JSON.stringify({ jsonrpc: '2.0', id: call.id, result });
  return mode === 'sse' && call.method === 'tools/call'
    ? new Response(`event: message\ndata: ${envelope}\n\n`, { headers: { 'Content-Type': 'text/event-stream' } })
    : new Response(envelope, { headers: { 'Content-Type': 'application/json', 'Mcp-Session-Id': 'transport-session' } });
}

beforeEach(() => {
  mode = 'normal'; calls = []; requests = []; active = undefined;
  inference = vi.fn().mockResolvedValue({ response: 'useEffect(() => cleanup, []);' });
  vi.stubGlobal('fetch', vi.fn(mcpFetch));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('production code generation with Search MCP', () => {
  it('defaults to anonymous search and consumes excerpts in the unchanged model/code response path', async () => {
    const response = await worker.fetch(generation(), { AI: { run: inference } });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ response: 'useEffect(() => cleanup, []);', sources: [{ url: page.url, title: page.title }] });
    expect(calls.some(call => call.method === 'initialize')).toBe(true);
    expect(calls.some(call => call.method === 'tools/list')).toBe(true);
    const tool = calls.find(call => call.method === 'tools/call')!.params;
    expect(tool.name).toBe('web_search');
    expect(tool.arguments.session_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(tool.arguments.model_name).toBe(MODEL);
    expect(JSON.stringify(calls)).not.toContain('PRIVATE_CODE_SENTINEL');
    expect(JSON.stringify(calls)).not.toContain('private-file.ts');
    for (const req of requests) {
      expect(req.url).toBe(SEARCH_ENDPOINT);
      expect(req.headers.get('User-Agent')).toBe(SEARCH_USER_AGENT);
      expect(req.headers.has('Authorization')).toBe(false);
      expect(req.headers.has('x-api-key')).toBe(false);
    }
    expect(inference).toHaveBeenCalledWith(MODEL, expect.anything());
    const messages = inference.mock.calls[0][1].messages;
    expect(JSON.stringify(messages)).toContain(page.excerpts[0]);
    expect(JSON.stringify(messages)).toContain('PRIVATE_CODE_SENTINEL');
    expect(messages[0].content).toContain('ONLY return the code');
  });

  it.each(['textOnly', 'sse'])('supports the advertised HTTP response encoding: %s', async encoding => {
    mode = encoding;
    const response = await worker.fetch(generation(), { AI: { run: inference } });
    expect(response.status).toBe(200);
    expect(inference).toHaveBeenCalledOnce();
  });

  it('fetches a prompt documentation URL without leaking file contents', async () => {
    const prompt = 'Use https://react.dev/reference/react/useEffect?x=1&y=2#cleanup to add cleanup';
    const response = await worker.fetch(generation(prompt, { searchSessionId: sessionA }), { AI: { run: inference } });
    expect(response.status).toBe(200);
    const tool = calls.find(call => call.method === 'tools/call')!.params;
    expect(tool.name).toBe('web_fetch');
    expect(tool.arguments.urls).toEqual(['https://react.dev/reference/react/useEffect?x=1&y=2#cleanup']);
    expect(tool.arguments.session_id).toBe(sessionA);
    expect(JSON.stringify(inference.mock.calls)).toContain(page.excerpts[0]);
  });

  it('keeps related search/fetch/regenerate requests isolated from another interleaved popup', async () => {
    const env = { AI: { run: inference } };
    await Promise.all([
      worker.fetch(generation('React cleanup docs', { searchSessionId: sessionA }), env),
      worker.fetch(generation('Node stream docs', { searchSessionId: sessionB }), env),
    ]);
    await worker.fetch(generation('Use https://react.dev/', { searchSessionId: sessionA }), env);
    await worker.fetch(generation('React cleanup docs', { searchSessionId: sessionA }), env);
    const args = calls.filter(c => c.method === 'tools/call').map(c => c.params.arguments);
    expect(args.filter(a => a.session_id === sessionA)).toHaveLength(3);
    expect(args.filter(a => a.session_id === sessionB)).toHaveLength(1);
    expect(args.filter(a => a.session_id === sessionA).some(a => a.urls)).toBe(true);
  });

  it('allocates distinct opaque IDs for independent standalone generations', async () => {
    await worker.fetch(generation(), { AI: { run: inference } });
    await worker.fetch(generation(), { AI: { run: inference } });
    const ids = calls.filter(c => c.method === 'tools/call').map(c => c.params.arguments.session_id);
    expect(new Set(ids).size).toBe(2);
  });

  it.each([{ request: { webSearch: 'false' }, env: {} }, { request: {}, env: { WEB_SEARCH_ENABLED: 'false' } }])('respects an explicit request or deployment disable: %j', async test => {
    const response = await worker.fetch(generation('React code', test.request), { AI: { run: inference }, ...test.env });
    expect(response.status).toBe(200);
    expect(requests).toHaveLength(0);
    expect(inference.mock.calls[0][1].messages).toHaveLength(4);
    expect(await response.json()).not.toHaveProperty('sources');
  });

  it.each(['auth', 'missing', 'toolError', 'malformed', 'empty', 'unsafe'])('reports %s without silently generating ungrounded code or leaking diagnostics', async failure => {
    mode = failure;
    const response = await worker.fetch(generation(), { AI: { run: inference } });
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('Private provider diagnostic');
    expect(inference).not.toHaveBeenCalled();
  });

  it.each(['hang', 'stalledBody'])('propagates cancellation into the actual MCP transport: %s', async failure => {
    mode = failure;
    const controller = new AbortController();
    const result = worker.fetch(generation('React cleanup docs', {}, controller.signal), { AI: { run: inference } });
    await vi.waitFor(() => expect(active).toBeDefined());
    controller.abort();
    expect((await result).status).toBe(502);
    expect(active!.aborted).toBe(true);
    expect(inference).not.toHaveBeenCalled();
  });

  it.each(['hang', 'stalledBody'])('bounds stalled tool execution/response bodies by the timeout: %s', async failure => {
    vi.useFakeTimers(); mode = failure;
    const result = worker.fetch(generation(), { AI: { run: inference } });
    await vi.waitFor(() => expect(active).toBeDefined());
    await vi.advanceTimersByTimeAsync(15_001);
    expect((await result).status).toBe(502);
    expect(active!.aborted).toBe(true);
    expect(inference).not.toHaveBeenCalled();
  });

  it('rejects invalid sessions/prompts before external calls', async () => {
    expect((await worker.fetch(generation('React docs', { searchSessionId: 'someone@example.com' }), { AI: { run: inference } })).status).toBe(400);
    expect((await worker.fetch(generation(' '), { AI: { run: inference } })).status).toBe(400);
    expect((await worker.fetch(new Request('https://ai.example/', { method: 'POST' }), { AI: { run: inference } })).status).toBe(405);
    expect(requests).toHaveLength(0);
  });
});
