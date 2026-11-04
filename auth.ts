import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { jwtVerify } from 'jose';
import type { RowDataPacket } from 'mysql2';
import { requirePool } from './db/client';
import type { User } from '../shared/types';

const SESSION_COOKIE = 'webdev_app_session';
const OAUTH_COOKIE = 'setlifest_oauth_state';
const SESSION_SECONDS = 60 * 60 * 24 * 30;
type DbUser = RowDataPacket & { id: string; open_id: string; name: string; email: string | null };
type DbSession = RowDataPacket & { user_id: string; csrf_token: string; name: string; email: string | null };

export interface AuthContext { user: User; csrfToken: string; sessionHash: string; }

function sha256(value: string) { return createHash('sha256').update(value).digest('hex'); }
function getCookie(req: Request, key: string): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const index = part.indexOf('=');
    if (index < 0 || part.slice(0, index).trim() !== key) continue;
    try { return decodeURIComponent(part.slice(index + 1).trim()); } catch { return null; }
  }
  return null;
}
function cookieContextFlags(publicOrigin: string | null): string {
  return publicOrigin?.startsWith('https:') ? 'Secure; SameSite=None' : 'SameSite=Lax';
}
function setSessionCookie(res: Response, value: string, publicOrigin: string | null) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; ${cookieContextFlags(publicOrigin)}; Max-Age=${SESSION_SECONDS}`);
}
function setOAuthCookie(res: Response, value: string, publicOrigin: string) {
  res.setHeader('Set-Cookie', `${OAUTH_COOKIE}=${encodeURIComponent(value)}; Path=/api/auth/callback; HttpOnly; ${cookieContextFlags(publicOrigin)}; Max-Age=600`);
}
function clearOAuthCookie(res: Response, publicOrigin: string | null) {
  res.append('Set-Cookie', `${OAUTH_COOKIE}=; Path=/api/auth/callback; HttpOnly; ${cookieContextFlags(publicOrigin)}; Max-Age=0`);
}
function clearSessionCookie(res: Response, publicOrigin: string | null) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; ${cookieContextFlags(publicOrigin)}; Max-Age=0`);
}
function refererOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try { return safeOrigin(`${new URL(value).origin}/`); } catch { return null; }
}
function originFromOAuthCookie(cookie: string): string | null {
  const encodedOrigin = cookie.split('.', 2)[1];
  if (!encodedOrigin) return null;
  try { return safeOrigin(Buffer.from(encodedOrigin, 'base64url').toString('utf8')); } catch { return null; }
}
function safeOrigin(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    if (url.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(url.hostname)) return null;
    return url.origin;
  } catch { return null; }
}

async function upsertUser(openId: string, name: string, email: string | null): Promise<User> {
  const pool = requirePool();
  const [existing] = await pool.execute<DbUser[]>('SELECT id, open_id, name, email FROM workspace_users WHERE open_id = ? LIMIT 1', [openId]);
  if (existing[0]) {
    const displayName = name.trim().slice(0, 255) || existing[0].name || 'Setlifest member';
    await pool.execute('UPDATE workspace_users SET name = ?, email = ? WHERE id = ?', [displayName, email?.slice(0, 320) ?? null, existing[0].id]);
    return { id: existing[0].id, name: displayName, email: email ?? existing[0].email };
  }
  const id = randomUUID();
  await pool.execute('INSERT INTO workspace_users (id, open_id, name, email) VALUES (?, ?, ?, ?)', [id, openId, name.trim().slice(0, 255) || 'Setlifest member', email?.slice(0, 320) ?? null]);
  return { id, name: name.trim().slice(0, 255) || 'Setlifest member', email };
}

async function createSession(userId: string, res: Response, publicOrigin: string | null): Promise<AuthContext> {
  const rawToken = randomBytes(32).toString('base64url');
  const sessionHash = sha256(rawToken);
  const csrfToken = randomBytes(32).toString('hex');
  await requirePool().execute(
    'INSERT INTO workspace_sessions (token_hash, user_id, csrf_token, expires_at) VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY))',
    [sessionHash, userId, csrfToken],
  );
  setSessionCookie(res, rawToken, publicOrigin);
  const [rows] = await requirePool().execute<DbUser[]>('SELECT id, open_id, name, email FROM workspace_users WHERE id = ? LIMIT 1', [userId]);
  if (!rows[0]) throw new Error('New session owner could not be loaded.');
  return { user: { id: rows[0].id, name: rows[0].name, email: rows[0].email }, csrfToken, sessionHash };
}

export async function resolveAuth(req: Request, res: Response): Promise<AuthContext | null> {
  const rawToken = getCookie(req, SESSION_COOKIE);
  if (!rawToken) return null;
  const pool = requirePool();
  const hash = sha256(rawToken);
  const [sessions] = await pool.execute<DbSession[]>(
    `SELECT s.user_id, s.csrf_token, u.name, u.email
       FROM workspace_sessions s JOIN workspace_users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP() LIMIT 1`,
    [hash],
  );
  if (sessions[0]) {
    return {
      user: { id: sessions[0].user_id, name: sessions[0].name, email: sessions[0].email },
      csrfToken: sessions[0].csrf_token,
      sessionHash: hash,
    };
  }

  const secret = process.env.MANUS_JWT_SECRET;
  const projectId = process.env.MANUS_PROJECT_ID;
  if (!secret || !projectId) return null;
  try {
    const verified = await jwtVerify(rawToken, new TextEncoder().encode(secret), { algorithms: ['HS256'] });
    const claims = verified.payload;
    const appId = claims.appId ?? claims.app_id;
    const openId = claims.openId ?? claims.open_id;
    if (appId !== projectId || typeof openId !== 'string' || !openId.trim()) return null;
    const user = await upsertUser(openId, typeof claims.name === 'string' ? claims.name : '', typeof claims.email === 'string' ? claims.email : null);
    return await createSession(user.id, res, safeOrigin(req.get('origin')) ?? refererOrigin(req.get('referer')));
  } catch {
    return null;
  }
}

export function requireCsrf(req: Request, res: Response, context: AuthContext): boolean {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return true;
  const supplied = req.get('x-csrf-token');
  if (supplied && supplied === context.csrfToken) return true;
  res.status(403).json({ error: 'The session protection token is missing or expired. Refresh and retry.' });
  return false;
}

export async function startOAuth(req: Request, res: Response) {
  const origin = safeOrigin(req.body?.origin);
  const requestOrigin = safeOrigin(req.get('origin'));
  if (!origin || !requestOrigin || origin !== requestOrigin) {
    res.status(400).json({ error: 'Sign-in must start from this Setlifest page.' });
    return;
  }
  const portal = process.env.MANUS_OAUTH_PORTAL_URL;
  const appId = process.env.MANUS_PROJECT_ID;
  if (!portal || !appId) {
    res.status(503).json({ error: 'Manus sign-in is not configured for this environment.' });
    return;
  }
  const nonce = randomBytes(24).toString('base64url');
  const redirectUri = `${origin}/api/auth/callback`;
  const state = Buffer.from(JSON.stringify({ redirectUri, nonce })).toString('base64url');
  setOAuthCookie(res, `${nonce}.${Buffer.from(origin).toString('base64url')}`, origin);
  const authUrl = new URL('/app-auth', portal);
  authUrl.searchParams.set('appId', appId);
  authUrl.searchParams.set('redirectUri', redirectUri);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('responseType', 'code');
  res.json({ url: authUrl.toString() });
}

export async function completeOAuth(req: Request, res: Response) {
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const stateValue = typeof req.query.state === 'string' ? req.query.state : '';
  const cookie = getCookie(req, OAUTH_COOKIE) ?? '';
  try {
    const state = JSON.parse(Buffer.from(stateValue, 'base64url').toString('utf8')) as { redirectUri?: string; nonce?: string };
    const [cookieNonce, encodedOrigin] = cookie.split('.', 2);
    const origin = Buffer.from(encodedOrigin ?? '', 'base64url').toString('utf8');
    const safe = safeOrigin(origin);
    const redirectUri = `${safe}/api/auth/callback`;
    if (!code || !safe || !state.nonce || !state.redirectUri || state.nonce !== cookieNonce || state.redirectUri !== redirectUri) {
      throw new Error('The sign-in state could not be verified. Start sign-in again.');
    }
    const projectId = process.env.MANUS_PROJECT_ID;
    const apiBase = process.env.MANUS_OAUTH_API_URL;
    if (!projectId || !apiBase) throw new Error('Manus sign-in is not configured for this environment.');
    const exchange = await fetch(`${apiBase.replace(/\/$/, '')}/webdev.v1.WebDevAuthPublicService/ExchangeToken`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clientId: projectId, grantType: 'authorization_code', code, redirectUri }),
    });
    const tokenBody = await exchange.json() as { accessToken?: string; error?: unknown };
    if (!exchange.ok || !tokenBody.accessToken) throw new Error('The sign-in code could not be exchanged.');
    const identityResponse = await fetch(`${apiBase.replace(/\/$/, '')}/webdev.v1.WebDevAuthPublicService/GetUserInfo`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ accessToken: tokenBody.accessToken }),
    });
    const identity = await identityResponse.json() as { openId?: string; name?: string; email?: string; error?: unknown };
    if (!identityResponse.ok || typeof identity.openId !== 'string' || !identity.openId) throw new Error('The sign-in provider did not return a valid account.');
    const user = await upsertUser(identity.openId, identity.name ?? '', identity.email ?? null);
    await createSession(user.id, res, safe);
    clearOAuthCookie(res, safe);
    res.redirect(303, `${safe}/`);
  } catch (error) {
    const publicOrigin = originFromOAuthCookie(cookie);
    clearOAuthCookie(res, publicOrigin);
    const message = error instanceof Error ? error.message : 'Sign-in failed. Please try again.';
    const origin = publicOrigin;
    if (origin) res.redirect(303, `${origin}/?authError=${encodeURIComponent(message.slice(0, 180))}`);
    else res.status(400).send('Sign-in could not be completed. Return to Setlifest and try again.');
  }
}

export async function logout(req: Request, res: Response) {
  const rawToken = getCookie(req, SESSION_COOKIE);
  if (rawToken) await requirePool().execute('DELETE FROM workspace_sessions WHERE token_hash = ?', [sha256(rawToken)]);
  clearSessionCookie(res, safeOrigin(req.get('origin')) ?? refererOrigin(req.get('referer')));
  res.status(204).end();
}
