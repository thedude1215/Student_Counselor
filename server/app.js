import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import catalogRoutes from './routes/catalogRoutes.js';
import novaRoutes from './routes/novaRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import activityRoutes from './routes/activityRoutes.js';

const app = express();
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,https://scholarpaths.org')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
);

app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
}));
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a bit and try again.' },
}));
app.use(express.json({ limit: '100kb' }));
app.use('/api', catalogRoutes);
app.use('/api/nova', novaRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activities', activityRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl,
  });
});

app.use((err, _req, res, _next) => {
  void _next;
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin is not allowed' });
  }
  console.error(err);
  res.status(500).json({
    error: 'Internal server error',
  });
});

export default app;
