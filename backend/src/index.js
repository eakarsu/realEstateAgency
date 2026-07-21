const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const { loadConfig } = require('./config');

dotenv.config();

function createApp({ prisma, providerTransport, passwordResetNotifier, allowTestProvider = false } = {}) {
  const config = loadConfig();
  if (!prisma) throw new Error('createApp requires a Prisma client');
  const app = express();
  app.disable('x-powered-by');
  app.set('prisma', prisma);
  app.set('providerTransport', providerTransport);
  app.set('passwordResetNotifier', passwordResetNotifier);
  app.set('allowTestProvider', allowTestProvider && process.env.NODE_ENV === 'test');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
      return callback(Object.assign(new Error('Origin is not allowed'), { status: 403 }));
    },
    credentials: false,
  }));
  app.use(express.json({
    limit: '256kb',
    verify(req, res, buffer) { req.rawBody = Buffer.from(buffer); },
  }));
  app.use(express.urlencoded({ extended: false, limit: '32kb' }));
  app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false }));
  app.use('/api/auth/register', rateLimit({ windowMs: 60 * 60_000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false }));
  app.use('/api/auth/forgot-password', rateLimit({ windowMs: 15 * 60_000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false }));
  app.use('/api/workflow/webhooks', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false }));

  app.get('/api/health/live', (req, res) => res.json({ status: 'live' }));
  app.get('/api/health/ready', async (req, res) => {
    try { await prisma.$queryRaw`SELECT 1`; res.json({ status: 'ready' }); }
    catch { res.status(503).json({ status: 'not_ready' }); }
  });
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/workflow', require('./routes/workflow'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/leads', require('./routes/leads'));
  app.use('/api/properties', require('./routes/properties'));
  app.use('/api/transactions', require('./routes/transactions'));
  app.use('/api/agents', require('./routes/agents'));
  app.use('/api/teams', require('./routes/teams'));
  app.use('/api/showings', require('./routes/showings'));
  app.use('/api/tasks', require('./routes/tasks'));
  app.use('/api/campaigns', require('./routes/campaigns'));
  app.use('/api/open-houses', require('./routes/openHouses'));
  app.use('/api/documents', require('./routes/documents'));
  app.use('/api/commissions', require('./routes/commissions'));
  app.use('/api/saved-searches', require('./routes/savedSearches'));
  app.use('/api/favorites', require('./routes/favorites'));
  app.use('/api/dashboard', require('./routes/dashboard'));
  app.use('/api/tags', require('./routes/tags'));
  app.use('/api/lead-sources', require('./routes/leadSources'));
  app.use('/api/social-posts', require('./routes/socialPosts'));
  app.use('/api/flyers', require('./routes/flyers'));
  app.use('/api/market-reports', require('./routes/marketReports'));
  app.use('/api/notifications', require('./routes/notifications'));
  app.use('/api/messages', require('./routes/messages'));
  app.use('/api/exports', require('./routes/exports'));

  app.use('/uploads', express.static(path.resolve(__dirname, '../uploads'), { dotfiles: 'deny', index: false }));
  const staticDir = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(staticDir, { index: false, dotfiles: 'deny' }));
  app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found' }));
  app.get('*', (req, res) => res.sendFile(path.join(staticDir, 'index.html'), (error) => {
    if (error && !res.headersSent) res.status(503).json({ error: 'Frontend build is unavailable' });
  }));

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.status || 500;
    if (process.env.NODE_ENV !== 'test' && status >= 500) console.error(error);
    res.status(status).json({ error: error.status ? error.message : 'Internal server error' });
  });
  return app;
}

async function start() {
  const config = loadConfig();
  const prisma = new PrismaClient();
  await prisma.$connect();
  const server = createApp({ prisma }).listen(config.port, () => console.log(`RealEstate Agency listening on ${config.port}`));
  const shutdown = async () => {
    server.close(async () => { await prisma.$disconnect(); process.exit(0); });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

if (require.main === module) start().catch((error) => { console.error(error.message); process.exit(1); });

module.exports = { createApp, start };
