import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { callMcp, discoverMcp, MCP_PROTOCOL_VERSIONS } from '../src/server/mcp';

async function serve(handler: http.RequestListener) {
  const server = http.createServer(handler); await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  const endpoint = `http://127.0.0.1:${(server.address() as any).port}/mcp`;
  const previous = process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS;
  process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS = endpoint;
  return { endpoint, async close() { process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS = previous || ''; server.closeAllConnections(); await new Promise<void>(r => server.close(() => r())); } };
}

test('official MCP SDK server: negotiation, JSON/SSE tools, sessions and termination', async () => {
  for (const enableJsonResponse of [true, false]) {
    const sessions = new Map<string, StreamableHTTPServerTransport>(); let executed = 0, ended = 0;
    const fixture = await serve(async (req, res) => {
      try {
        const id = req.headers['mcp-session-id'] as string;
        let transport = sessions.get(id);
        if (!transport) {
          const server = new McpServer({ name: 'vac-test-sdk', version: '1' });
          server.registerTool('sum', { inputSchema: { a: z.number(), b: z.number() } }, async ({ a, b }) => { executed++; return { content: [{ type: 'text', text: String(a + b) }] }; });
          transport = new StreamableHTTPServerTransport({ enableJsonResponse, sessionIdGenerator: randomUUID, onsessioninitialized: id => { sessions.set(id, transport!); } });
          await server.connect(transport);
        }
        if (req.method === 'DELETE') ended++;
        await transport.handleRequest(req, res);
      } catch { if (!res.headersSent) res.writeHead(500); res.end(); }
    });
    try {
      const discovery = await discoverMcp(fixture, new AbortController().signal);
      assert.equal(discovery.server?.name, 'vac-test-sdk'); assert.equal(discovery.tools[0].name, 'sum'); assert.equal(executed, 0);
      const result = await callMcp(fixture, 'sum', { a: 17, b: 23 }, new AbortController().signal);
      assert.deepEqual(result.content, [{ type: 'text', text: '40' }]); assert.equal(executed, 1); assert.equal(ended, 2);
      await assert.rejects(callMcp(fixture, 'not-approved', {}, new AbortController().signal), /discovery failed/);
      assert.equal(executed, 1);
    } finally { for (const session of sessions.values()) await session.close(); await fixture.close(); }
  }
});

test('independent protocol fixture: pagination, session headers, uncertain writes never replay, secret-safe errors', async () => {
  let writes = 0; const methods: string[] = []; const previousKey = process.env.VAC_CONNECTOR_TEST;
  process.env.VAC_CONNECTOR_TEST = 'fixture-secret';
  const fixture = await serve(async (req, res) => {
    if (req.method === 'DELETE') { res.writeHead(204).end(); return; }
    let raw = ''; for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw); methods.push(body.method);
    assert.equal(req.headers.authorization, 'Bearer fixture-secret');
    let result: any;
    if (body.method === 'initialize') { res.setHeader('Mcp-Session-Id', 'fixture-session'); result = { protocolVersion: '2025-11-25', capabilities: { tools: {} }, serverInfo: { name: 'independent-fixture', version: '1' } }; }
    else {
      assert.equal(req.headers['mcp-session-id'], 'fixture-session'); assert.equal(req.headers['mcp-protocol-version'], '2025-11-25');
      if (body.method === 'notifications/initialized') { res.writeHead(202).end(); return; }
      if (body.method === 'tools/list') result = body.params?.cursor ? { tools: [{ name: 'write', inputSchema: { type: 'object' } }] } : { tools: [], nextCursor: 'next' };
      if (body.method === 'tools/call') { writes++; res.writeHead(503).end('fixture-secret'); return; }
    }
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ jsonrpc: '2.0', id: body.id, result }));
  });
  try {
    const config = { ...fixture, tokenEnv: 'VAC_CONNECTOR_TEST' };
    assert.equal((await discoverMcp(config, new AbortController().signal)).tools[0].name, 'write');
    await assert.rejects(callMcp(config, 'write', {}, new AbortController().signal), e => { assert.match(String(e), /remote outcome may be unknown, no retry sent/); assert.doesNotMatch(String(e), /fixture-secret/); return true; });
    assert.equal(writes, 1); assert.ok(methods.includes('notifications/initialized'));
  } finally { process.env.VAC_CONNECTOR_TEST = previousKey || ''; await fixture.close(); }
});

test('MCP rejects unapproved private destinations, cancellation, malformed and oversized responses', async () => {
  await assert.rejects(discoverMcp({ endpoint: 'http://127.0.0.1:99/mcp' }, new AbortController().signal), /public|HTTPS/);
  const fixture = await serve((_req, res) => { res.setHeader('Content-Type', 'application/json'); res.end('x'.repeat(130_000)); });
  try {
    await assert.rejects(discoverMcp(fixture, new AbortController().signal), /negotiation/);
    const cancelled = new AbortController(); cancelled.abort();
    await assert.rejects(discoverMcp(fixture, cancelled.signal), /cancelled/);
  } finally { await fixture.close(); }
});

// Independent wire implementation: no server SDK parsing/session logic.
async function wireFixture(options: {
  version?: string;
  capabilities?: object;
  respond?: (body: any, req: http.IncomingMessage, res: http.ServerResponse) => boolean;
} = {}) {
  const sessions = new Set<string>();
  const events: { method: string; session?: string }[] = [];
  const fixture = await serve(async (req, res) => {
    const session = req.headers['mcp-session-id'] as string | undefined;
    if (req.method === 'DELETE') {
      events.push({ method: 'DELETE', session }); sessions.delete(session!);
      res.writeHead(204).end(); return;
    }
    let raw = ''; for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw); events.push({ method: body.method, session });
    res.setHeader('Content-Type', 'application/json');
    let result: unknown;
    if (body.method === 'initialize') {
      const id = randomUUID(); sessions.add(id); res.setHeader('Mcp-Session-Id', id);
      result = { protocolVersion: options.version || '2025-11-25', capabilities: options.capabilities ?? { tools: {} }, serverInfo: { name: 'wire-conformance', version: '1' } };
    } else {
      if (!sessions.has(session!)) { res.writeHead(404).end(); return; }
      if (body.method === 'notifications/initialized' || body.method === 'notifications/cancelled') { res.writeHead(202).end(); return; }
      if (options.respond?.(body, req, res)) return;
      if (body.method === 'tools/list') result = { tools: [{ name: 'write', inputSchema: { type: 'object' } }] };
      else if (body.method === 'tools/call') result = { content: [{ type: 'text', text: 'saved' }] };
      else { res.writeHead(400).end(); return; }
    }
    res.end(JSON.stringify({ jsonrpc: '2.0', id: body.id, result }));
  });
  return { ...fixture, sessions, events };
}

test('MCP pins Streamable HTTP versions and requires tools capability before dispatch', async () => {
  for (const version of [...MCP_PROTOCOL_VERSIONS, '2024-11-05', '2099-01-01']) {
    const fixture = await wireFixture({ version });
    try {
      if (MCP_PROTOCOL_VERSIONS.some(v => v === version)) {
        await callMcp(fixture, 'write', {}, new AbortController().signal);
        assert.equal(fixture.events.filter(e => e.method === 'tools/call').length, 1);
      } else {
        await assert.rejects(callMcp(fixture, 'write', {}, new AbortController().signal), /negotiation or discovery failed/);
        assert.equal(fixture.events.filter(e => e.method === 'tools/call').length, 0);
      }
    } finally { await fixture.close(); }
  }
  const fixture = await wireFixture({ capabilities: {} });
  try {
    await assert.rejects(callMcp(fixture, 'write', {}, new AbortController().signal), /discovery failed/);
    assert.equal(fixture.events.filter(e => e.method === 'tools/call').length, 0);
  } finally { await fixture.close(); }
});

test('MCP execution validates all catalog pages, duplicates, limits and malformed results before writing', async () => {
  for (const mode of ['duplicate', 'too-many-tools', 'too-many-pages', 'repeated-cursor', 'empty-cursor', 'malformed-json', 'malformed-schema', 'oversized']) {
    let lists = 0;
    const fixture = await wireFixture({ respond(body, _req, res) {
      if (body.method !== 'tools/list') return false;
      lists++;
      const tool = { name: 'write', inputSchema: { type: 'object' } };
      let result: any = { tools: [tool] };
      if (mode === 'duplicate') result = lists === 1 ? { tools: [tool], nextCursor: 'next' } : { tools: [tool] };
      if (mode === 'too-many-tools') result = { tools: [tool, ...Array.from({ length: 100 }, (_, i) => ({ ...tool, name: 't' + i }))] };
      if (mode === 'too-many-pages') result = { tools: lists === 1 ? [tool] : [], nextCursor: 'p' + lists };
      if (mode === 'repeated-cursor') result = { tools: lists === 1 ? [tool] : [], nextCursor: 'repeat' };
      if (mode === 'empty-cursor') result.nextCursor = '';
      if (mode === 'malformed-schema') result = { tools: [{ name: 'write', inputSchema: { type: 'string' } }] };
      res.end(mode === 'malformed-json' ? '{broken' : mode === 'oversized' ? 'x'.repeat(128_001) : JSON.stringify({ jsonrpc: '2.0', id: body.id, result }));
      return true;
    } });
    try {
      for (const invoke of [() => discoverMcp(fixture, new AbortController().signal), () => callMcp(fixture, 'write', {}, new AbortController().signal)]) {
        lists = 0;
        await assert.rejects(invoke(), /discovery failed/, mode);
        assert.ok(lists <= 5, mode);
        assert.equal(fixture.events.filter(e => e.method === 'tools/call').length, 0, mode);
      }
    } finally { await fixture.close(); }
  }
});

test('MCP expired discovery and post-send failures do not reconnect or replay; explicit new operations use fresh sessions', async () => {
  for (const mode of ['expired-discovery', 'expired-call', 'lost-response', 'unauthorized', 'rate-limit', 'rpc-error', 'tool-error']) {
    let fault = true, applied = 0;
    const fixture = await wireFixture({ respond(body, _req, res) {
      if (fault && mode === 'expired-discovery' && body.method === 'tools/list') { res.writeHead(404).end(); return true; }
      if (body.method !== 'tools/call') return false;
      if (fault) {
        if (mode === 'expired-call') res.writeHead(404).end();
        else if (mode === 'lost-response') { applied++; res.destroy(); }
        else if (mode === 'unauthorized') res.writeHead(401).end('credential-echo');
        else if (mode === 'rate-limit') res.writeHead(429, { 'Retry-After': '0' }).end();
        else if (mode === 'rpc-error') res.end(JSON.stringify({ jsonrpc: '2.0', id: body.id, error: { code: -32603, message: 'credential-echo' } }));
        else if (mode === 'tool-error') res.end(JSON.stringify({ jsonrpc: '2.0', id: body.id, result: { isError: true, content: [{ type: 'text', text: 'credential-echo' }] } }));
        else return false;
        return true;
      }
      applied++; return false;
    } });
    try {
      await assert.rejects(callMcp(fixture, 'write', {}, new AbortController().signal), error => {
        assert.match(String(error), mode === 'expired-discovery' ? /discovery failed/ : /unknown, no retry sent/);
        assert.doesNotMatch(String(error), /credential-echo/); return true;
      });
      assert.equal(fixture.events.filter(e => e.method === 'initialize').length, 1, mode);
      assert.equal(fixture.events.filter(e => e.method === 'tools/call').length, mode === 'expired-discovery' ? 0 : 1, mode);
      assert.equal(applied, mode === 'lost-response' ? 1 : 0, mode);
      fault = false;
      // Reconnection is a separate read-only discovery; never retry the write.
      await discoverMcp(fixture, new AbortController().signal);
      const listed = fixture.events.filter(e => e.method === 'tools/list');
      assert.notEqual(listed[0].session, listed.at(-1)!.session, mode);
      assert.equal(fixture.events.filter(e => e.method === 'initialize').length, 2, mode);
      assert.equal(fixture.events.filter(e => e.method === 'tools/call').length, mode === 'expired-discovery' ? 0 : 1, mode);
    } finally { await fixture.close(); }
  }
});

test('official SDK session expiry fails closed and the next discovery establishes a fresh session', async () => {
  const sessions = new Map<string, StreamableHTTPServerTransport>();
  const sessionIds: string[] = []; let expire = true, writes = 0;
  const fixture = await serve(async (req, res) => {
    try {
      const id = req.headers['mcp-session-id'] as string | undefined;
      if (id && (!sessions.has(id) || (expire && req.method === 'POST'))) { res.writeHead(404).end(); return; }
      let transport = id ? sessions.get(id) : undefined;
      if (!transport) {
        const server = new McpServer({ name: 'expiring-sdk', version: '1' });
        server.registerTool('write', { inputSchema: {} }, async () => { writes++; return { content: [] }; });
        transport = new StreamableHTTPServerTransport({ enableJsonResponse: true, sessionIdGenerator: randomUUID, onsessioninitialized: sid => { sessionIds.push(sid); sessions.set(sid, transport!); } });
        await server.connect(transport);
      }
      await transport.handleRequest(req, res);
    } catch { if (!res.headersSent) res.writeHead(500); res.end(); }
  });
  try {
    await assert.rejects(callMcp(fixture, 'write', {}, new AbortController().signal), /discovery failed/);
    assert.equal(sessionIds.length, 1); assert.equal(writes, 0);
    expire = false;
    await discoverMcp(fixture, new AbortController().signal);
    assert.equal(sessionIds.length, 2); assert.notEqual(sessionIds[0], sessionIds[1]); assert.equal(writes, 0);
  } finally { for (const session of sessions.values()) await session.close(); await fixture.close(); }
});

test('MCP cancellation after remote application aborts promptly without another write', async () => {
  let applied = 0;
  const controller = new AbortController();
  const fixture = await wireFixture({ respond(body, _req, _res) {
    if (body.method !== 'tools/call') return false;
    applied++; controller.abort(); return true;
  } });
  try {
    const started = Date.now();
    await assert.rejects(callMcp(fixture, 'write', {}, controller.signal), /cancelled/);
    assert.ok(Date.now() - started < 2000);
    assert.equal(applied, 1);
    assert.equal(fixture.events.filter(e => e.method === 'initialize').length, 1);
    assert.equal(fixture.events.filter(e => e.method === 'tools/call').length, 1);
  } finally { await fixture.close(); }
});
