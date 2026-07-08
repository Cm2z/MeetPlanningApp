
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { pingDatabase } from './config/db.js';
import { registerRoutes } from './routes/index.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'MeetPlanning API' }));
registerRoutes(app);

app.use((req, res) => res.status(404).json({ message: 'API route not found' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ message: error.message || 'Server error' });
});

pingDatabase().then(() => {
  app.listen(port, () => console.log('MeetPlanning API running on http://localhost:' + port));
}).catch((error) => {
  console.error('Cannot connect to MySQL:', error.message);
  process.exit(1);
});
