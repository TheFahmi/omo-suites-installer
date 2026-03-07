import { Hono } from 'hono';
import { checkForUpdate, getUpdateStatus } from '../utils/updater';

const app = new Hono();

// GET /api/update/status — current update status
app.get('/status', (c) => {
  const status = getUpdateStatus();
  return c.json(status);
});

// POST /api/update/check — manually trigger update check
app.post('/check', async (c) => {
  const { force } = await c.req.json().catch(() => ({ force: false }));
  const result = await checkForUpdate(!!force);
  return c.json(result);
});

// GET /api/update/check — also support GET for convenience
app.get('/check', async (c) => {
  const force = c.req.query('force') === '1' || c.req.query('force') === 'true';
  const result = await checkForUpdate(force);
  return c.json(result);
});

export default app;
