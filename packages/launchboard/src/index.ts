import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import workspacesRoute from './routes/workspaces';
import tasksRoute from './routes/tasks';
import columnsRoute from './routes/columns';
import labelsRoute from './routes/labels';
import statsRoute from './routes/stats';
import rulesRoute from './routes/rules';

const app = new Hono();

app.use('*', cors());
app.use('*', logger());

// Mount routes
app.route('/api/workspaces', workspacesRoute);
app.route('/api/tasks', tasksRoute);
app.route('/api/columns', columnsRoute);
app.route('/api/labels', labelsRoute);
app.route('/api/stats', statsRoute);
app.route('/api/rules', rulesRoute);

// Health
app.get('/api/health', (c) =>
  c.json({ status: 'ok', name: 'Launchboard API', version: '1.0.0', timestamp: new Date().toISOString() })
);

export default {
  port: 3030,
  fetch: app.fetch,
};
