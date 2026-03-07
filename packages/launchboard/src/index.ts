import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import sessionsRoute from './routes/sessions';
import boardRoute from './routes/board';
import updateRoute from './routes/update';
import { startupUpdateCheck, getUpdateStatus } from './utils/updater';

const OPENCODE_API = process.env.OPENCODE_API_URL || 'http://localhost:1337';

const app = new Hono();

app.use('*', cors());
app.use('*', logger());

// Mount routes
app.route('/api/sessions', sessionsRoute);
app.route('/api/board', boardRoute);
app.route('/api/update', updateRoute);

// Health endpoint with OpenCode connectivity check
app.get('/api/health', async (c) => {
  let openCodeStatus = 'unknown';
  try {
    const res = await fetch(`${OPENCODE_API}/session`, { signal: AbortSignal.timeout(3000) });
    openCodeStatus = res.ok ? 'connected' : `error: ${res.status}`;
  } catch {
    openCodeStatus = 'unreachable';
  }

  const updateStatus = getUpdateStatus();

  return c.json({
    status: 'ok',
    name: 'Launchboard API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    openCode: {
      url: OPENCODE_API,
      status: openCodeStatus,
    },
    updater: {
      mode: updateStatus.mode,
      lastCheck: updateStatus.lastCheck
        ? new Date(updateStatus.lastCheck).toISOString()
        : null,
    },
  });
});

// Run startup update check (non-blocking)
startupUpdateCheck();

export default {
  port: 3030,
  fetch: app.fetch,
};
