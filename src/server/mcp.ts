import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { publicRequest, checkedUrl } from './browser';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface McpConnection { endpoint: string; tokenEnv?: string }
const MAX_RESPONSE = 128_000;
export const MCP_PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26'] as const;
const MAX_CATALOG_PAGES = 5;
const MAX_CATALOG_TOOLS = 100;

class BoundedTransport extends StreamableHTTPClientTransport {
  override setProtocolVersion(version: string) {
    if (!MCP_PROTOCOL_VERSIONS.some(supported => supported === version)) throw new Error('Unsupported MCP protocol version');
    super.setProtocolVersion(version);
  }
}

// Validate the complete catalog before any dispatch, even when the requested
// tool appears on the first page. Discovery and execution share the same gate.
async function catalog(client: Client, signal: AbortSignal): Promise<Tool[]> {
  if (!client.getServerCapabilities()?.tools) throw new Error('MCP server did not negotiate tools capability');
  const tools: Tool[] = [], names = new Set<string>(), cursors = new Set<string>();
  let cursor: string | undefined;
  for (let pageNumber = 0; pageNumber < MAX_CATALOG_PAGES; pageNumber++) {
    const page = await client.listTools(cursor ? { cursor } : undefined, { signal, timeout: 10_000 });
    for (const tool of page.tools) {
      if (names.has(tool.name)) throw new Error('MCP duplicate tool names');
      names.add(tool.name); tools.push(tool);
      if (tools.length > MAX_CATALOG_TOOLS) throw new Error('MCP discovery exceeds bounded catalog');
    }
    cursor = page.nextCursor;
    if (cursor === undefined) return tools;
    if (!cursor || cursors.has(cursor)) throw new Error('MCP discovery cursor invalid');
    cursors.add(cursor);
  }
  throw new Error('MCP discovery exceeds bounded catalog');
}

// One short-lived, isolated protocol session per discovery/call. No transport
// fallback, OAuth redirect, background event stream or uncertain-write replay.
export async function withMcp<T>(config: McpConnection, signal: AbortSignal, action: (client: Client) => Promise<T>): Promise<T> {
  const local = (process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS || '').split(',').includes(config.endpoint);
  const url = new URL(config.endpoint);
  if (url.username || url.password || url.search || url.hash) throw new Error('Invalid MCP endpoint');
  if (!local) { checkedUrl(config.endpoint); if (url.protocol !== 'https:') throw new Error('Public MCP requires HTTPS'); }
  const secret = config.tokenEnv ? process.env[config.tokenEnv] : undefined;
  if (config.tokenEnv && !secret) throw new Error('Connector credential unavailable');
  const lifetime = AbortSignal.any([signal, AbortSignal.timeout(15_000)]);
  let requests = 0, toolSent = false;
  const client = new Client({ name: 'vac', version: '0.1.0' }, { capabilities: {} });
  const transport = new BoundedTransport(url, {
    requestInit: { headers: secret ? { Authorization: `Bearer ${secret}` } : {} },
    reconnectionOptions: { maxRetries: 0, initialReconnectionDelay: 1000, maxReconnectionDelay: 1000, reconnectionDelayGrowFactor: 1 },
    fetch: async (input, init) => {
      lifetime.throwIfAborted();
      if (String(input) !== config.endpoint) throw new Error('MCP destination changed');
      // Servers may require GET streams for notifications. This client deliberately
      // advertises no server-initiated capabilities and does not subscribe to them.
      if (init?.method === 'GET') return new Response(null, { status: 405 });
      if (++requests > 12) throw new Error('MCP session request allowance exhausted');
      const headers = Object.fromEntries(new Headers(init?.headers).entries());
      const body = init?.body == null ? null : Buffer.from(String(init.body));
      if (body && body.length > 64_000) throw new Error('MCP request too large');
      if (body) {
        const message = JSON.parse(body.toString());
        if (message.method === 'tools/call') {
          if (toolSent) throw new Error('MCP tool replay blocked; reconcile uncertain outcome');
          toolSent = true;
        }
      }
      const requestSignal = AbortSignal.any([lifetime, ...(init?.signal ? [init.signal] : [])]);
      if (!local) {
        const response = await publicRequest({ url: config.endpoint, method: init?.method || 'POST', headers, body }, requestSignal);
        if (response.body.length > MAX_RESPONSE) throw new Error('MCP response too large');
        if (response.status >= 300 && response.status < 400) throw new Error('MCP redirects are prohibited');
        return new Response(response.status === 202 || response.status === 204 ? null : response.body, { status: response.status, headers: response.headers });
      }
      const response = await fetch(config.endpoint, { ...init, headers, body, redirect: 'error', signal: requestSignal });
      const reader = response.body?.getReader(); let size = 0; const chunks: Uint8Array[] = [];
      try { if (reader) while (true) { const next = await reader.read(); if (next.done) break; size += next.value.length; if (size > MAX_RESPONSE) throw new Error('MCP response too large'); chunks.push(next.value); } }
      finally { await reader?.cancel().catch(() => {}); }
      return new Response(response.status === 202 || response.status === 204 ? null : Buffer.concat(chunks), { status: response.status, headers: response.headers });
    },
  });
  const abort = () => { void client.close().catch(() => {}); };
  lifetime.addEventListener('abort', abort, { once: true });
  try {
    await client.connect(transport, { signal: lifetime, timeout: 15_000 });
    const result = await action(client); lifetime.throwIfAborted(); return result;
  } catch (error) {
    // Never copy server-supplied error strings, which may contain credential echoes.
    if (signal.aborted) throw new Error('MCP operation cancelled; remote outcome may be unknown');
    throw new Error(`MCP ${toolSent ? 'tool operation failed; remote outcome may be unknown, no retry sent' : 'negotiation or discovery failed'} (${error instanceof Error ? error.name : 'error'})`);
  } finally {
    // Best effort termination is a separate request, never a repeated tool call.
    if (!lifetime.aborted && transport.sessionId) await transport.terminateSession().catch(() => {});
    lifetime.removeEventListener('abort', abort); await client.close().catch(() => {});
  }
}

export async function discoverMcp(config: McpConnection, signal: AbortSignal) {
  return withMcp(config, signal, async client => {
    const tools = await catalog(client, signal);
    return { server: client.getServerVersion(), capabilities: client.getServerCapabilities(), tools };
  });
}

export async function callMcp(config: McpConnection, name: string, args: Record<string, unknown>, signal: AbortSignal) {
  return withMcp(config, signal, async client => {
    // Discovery does not grant authority: Workspace independently enforces the
    // owner's exact tool allowlist and approval before entering this function.
    const tools = await catalog(client, signal);
    if (!tools.some(tool => tool.name === name)) throw new Error('Approved MCP tool is no longer advertised');
    const result = await client.callTool({ name, arguments: args }, undefined, { signal, timeout: 10_000 });
    if (result.isError) throw new Error('MCP tool reported failure');
    return result;
  });
}
