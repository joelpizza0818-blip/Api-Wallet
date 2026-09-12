const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieSession = require('cookie-session');
const passport = require('passport');
const routes = require('./routes');
const { serveMock } = require('./controllers/mock-public.controller');
const { apiRateLimit } = require('./middleware/rate-limit.middleware');
const { errorHandler } = require('./middleware/error.middleware');
const prisma = require('./config/database');
const logger = require('./utils/logger');
const crypto = require('crypto');

const app = express();
app.set('trust proxy', 1);
app.use((req, res, next) => {
  req.requestId = req.get('x-request-id') || crypto.randomUUID();
  res.setHeader('x-request-id', req.requestId);
  logger.info('request.started', { requestId: req.requestId, method: req.method, path: req.path });
  res.on('finish', () => logger.info('request.completed', { requestId: req.requestId, statusCode: res.statusCode, method: req.method, path: req.path }));
  next();
});
app.use(helmet());
const localFrontendOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
].filter(Boolean);
const stateChangingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
app.use((req, res, next) => {
  const origin = req.get('origin');
  if (origin && stateChangingMethods.has(req.method) && !localFrontendOrigins.includes(origin)) {
    return res.status(403).json({ success: false, message: 'Origin not allowed' });
  }
  return next();
});
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || localFrontendOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'degraded', database: 'unavailable', timestamp: new Date().toISOString() });
  }
});
app.use('/api', apiRateLimit);
const sessionSecret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
app.use(cookieSession({
  name: 'oauth_session',
  keys: [sessionSecret],
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 600000,
}));
app.use(passport.initialize());
app.get('/health', (_req, res) => res.json({ success: true, status: 'ok', service: 'api-wallet' }));
app.use('/mock/:mockId', serveMock);
app.use('/api', routes);
app.use(errorHandler);

module.exports = app;
