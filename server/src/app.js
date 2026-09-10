const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const passport = require('passport');
const routes = require('./routes');
const { serveMock } = require('./controllers/mock-public.controller');
const { apiRateLimit } = require('./middleware/rate-limit.middleware');
const { errorHandler } = require('./middleware/error.middleware');
const prisma = require('./config/database');

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
const localFrontendOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
].filter(Boolean);
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
app.use(session({ secret: process.env.SESSION_SECRET || process.env.JWT_SECRET, resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 600000 } }));
app.use(passport.initialize());
app.get('/health', (_req, res) => res.json({ success: true, status: 'ok', service: 'api-wallet' }));
app.use('/mock/:mockId', serveMock);
app.use('/api', routes);
app.use(errorHandler);

module.exports = app;
