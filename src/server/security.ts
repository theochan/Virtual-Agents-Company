import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Express, Request } from 'express';
import { z } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const uid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export const hash = (value: unknown) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const equal = (a: string, b: string) => {
  const x = crypto.createHash('sha256').update(a).digest();
  const y = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(x, y);
};

export function installSecurity(app: Express, directory: string, port: number) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const tokenPath = path.join(directory, 'access-token');
  if (!process.env.VAC_ACCESS_TOKEN && !fs.existsSync(tokenPath)) {
    fs.writeFileSync(tokenPath, crypto.randomBytes(32).toString('hex'), { mode: 0o600, flag: 'wx' });
  }
  const token = process.env.VAC_ACCESS_TOKEN || fs.readFileSync(tokenPath, 'utf8').trim();
  if (token.length < 32) throw new Error('VAC_ACCESS_TOKEN must contain at least 32 characters');
  // A session is ephemeral; restarting requires signing in again, not reauthorizing work.
  const sessions = new Map<string, number>();
  let attempts = 0;
  let resetAt = Date.now() + 60000;
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const allowed = new Set([`localhost:${port}`, `127.0.0.1:${port}`, `[::1]:${port}`]);
    if (!allowed.has(req.headers.host || '')) return res.status(403).json({ error: 'Untrusted host' });
    const origin = req.headers.origin;
    if (origin && ![`http://${req.headers.host}`, `https://${req.headers.host}`].includes(origin)) {
      return res.status(403).json({ error: 'Cross-origin API access is not allowed' });
    }
    if (req.headers['sec-fetch-site'] === 'cross-site') return res.status(403).json({ error: 'Cross-site request denied' });
    if (req.path === '/health' || req.path === '/session') return next();
    if (!authenticated(req)) return res.status(401).json({ error: 'Sign in with the workspace access token' });
    next();
  });
  function authenticated(req: Request) {
    const bearer = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (bearer && equal(bearer, token)) return true;
    const session = req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith('vac_session='))?.slice(12);
    return Boolean(session && (sessions.get(session) || 0) > Date.now());
  }
  app.get('/api/session', (req, res) => res.json({ authenticated: authenticated(req) }));
  app.post('/api/session', (req, res) => {
    if (Date.now() > resetAt) { attempts = 0; resetAt = Date.now() + 60000; }
    if (++attempts > 10) return res.status(429).json({ error: 'Too many attempts. Wait one minute.' });
    const parsed = z.object({ token: z.string().max(1024) }).safeParse(req.body);
    if (!parsed.success || !equal(parsed.data.token, token)) return res.status(401).json({ error: 'Invalid access token' });
    for (const [key, expires] of sessions) if (expires < Date.now()) sessions.delete(key);
    const id = crypto.randomBytes(32).toString('hex');
    sessions.set(id, Date.now() + 12 * 60 * 60 * 1000);
    res.setHeader('Set-Cookie', `vac_session=${id}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=43200`);
    res.json({ authenticated: true });
  });
  console.log(`Workspace access token: ${process.env.VAC_ACCESS_TOKEN ? 'provided by environment' : tokenPath}`);
}

/** No caller-supplied destinations: operator configuration establishes exact allowed bases. */
export function validateEndpoint(raw: string, allowed: string[]) {
  const url = new URL(raw);
  if (url.username || url.password || url.search || url.hash || !['http:', 'https:'].includes(url.protocol)) {
    throw new HttpError(400, 'Invalid provider endpoint');
  }
  const normalized = url.href.replace(/\/$/, '');
  if (!allowed.some(base => new URL(base).href.replace(/\/$/, '') === normalized)) {
    throw new HttpError(403, 'Endpoint is not in the operator-configured provider allowlist');
  }
  return normalized;
}
