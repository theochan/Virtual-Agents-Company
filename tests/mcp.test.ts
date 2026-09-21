import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { callMcp, discoverMcp } from '../src/server/mcp';

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
