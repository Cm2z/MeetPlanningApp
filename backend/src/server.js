
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { pingDatabase } from './config/db.js';
import { registerRoutes } from './routes/index.js';
import { startBookingLifecycleWorker } from './utils/bookingLifecycle.js';
import { migrateLegacyPlaintextPasswords } from './utils/passwordMigration.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.includes('change-this'))) {
  throw new Error('JWT_SECRET must be a random value of at least 32 characters in production');
}

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://amiable-gentleness-production-9407.up.railway.app'
].filter(Boolean).map((origin) => origin.replace(/\/$/, ''));

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.replace(/\/$/, '');
    const isAllowed = allowedOrigins.includes(cleanOrigin);

    if (isAllowed) return callback(null, true);
    const error = new Error('Origin is not allowed by CORS');
    error.status = 403;
    return callback(error);
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb', strict: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'MeetPlanning API' }));
registerRoutes(app);

app.use((req, res) => res.status(404).json({ message: 'API route not found' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  const status = Number(error.status || 500);
  const message = status >= 500 && process.env.NODE_ENV === 'production'
    ? 'เกิดข้อผิดพลาดภายในระบบ'
    : (error.message || 'Server error');
  res.status(status).json({ message });
});

pingDatabase().then(async () => {
  await migrateLegacyPlaintextPasswords();
  startBookingLifecycleWorker();
  app.listen(port, () => console.log('MeetPlanning API running on http://localhost:' + port));
}).catch((error) => {
  console.error('Cannot connect to MySQL:', error.message);
  process.exit(1);
});
