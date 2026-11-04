import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { sql } from 'drizzle-orm';
import { db, pool } from './db/client';
import { completeOAuth, logout, resolveAuth, startOAuth, requireCsrf } from './auth';
import { workspaceRouter } from './workspace';

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT ?? (isProduction ? 3000 : 3001));
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.disable('x-powered-by');
app.use(express.json({ limit: '128kb' }));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.get('/api/health', async (_req, res) => {
  try {
    if (!db) throw new Error('database unavailable');
    await db.execute(sql`SELECT 1`);
    res.status(200).json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});
app.post('/api/auth/start', startOAuth);
app.get('/api/auth/callback', completeOAuth);

app.use('/api', async (req, res, next) => {
  if (req.path === '/health' || req.path === '/auth/start' || req.path === '/auth/callback') return next();
  try {
    const auth = await resolveAuth(req, res);
    if (!auth) return res.status(401).json({ error: 'Sign in to open your private workspace.' });
    if (!requireCsrf(req, res, auth)) return;
    res.locals.auth = auth;
    return next();
  } catch (error) {
    console.error('auth_resolution_failed', error instanceof Error ? error.message : 'unknown');
    return res.status(503).json({ error: 'Your secure session could not be verified.' });
  }
});
app.get('/api/auth/me', (_req, res) => {
  const auth = res.locals.auth;
  if (!auth) return res.status(401).json({ user: null });
  return res.json({ user: auth.user, csrfToken: auth.csrfToken });
});
app.post('/api/auth/logout', logout);
app.use('/api', workspaceRouter());

if (isProduction) {
  const clientDist = path.resolve(__dirname, '../dist');
  app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
  app.get(/.*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('unhandled_request_error', error instanceof Error ? error.message : 'unknown');
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

const server = app.listen(port, '0.0.0.0', () => console.log(`Setlifest API listening on ${port}`));
const shutdown = () => server.close(() => { void pool?.end(); });
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
