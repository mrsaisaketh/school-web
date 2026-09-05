import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRouter from './routes/auth.js';
import studentsRouter from './routes/students.js';
import staffRouter from './routes/staff.js';
import attendanceRouter from './routes/attendance.js';
import invoicesRouter from './routes/invoices.js';
import leaveRouter from './routes/leave.js';
import workUpdatesRouter from './routes/workUpdates.js';
import careersRouter from './routes/careers.js';
import reportsRouter from './routes/reports.js';
import academicRouter from './routes/academic.js';
import publicRouter from './routes/public.js';

import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Resolve .env from the repo root regardless of the process cwd.
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Refusing to start with an unsigned auth layer.');
}

const app = express();

// Behind Vercel's proxy, so req.ip reflects the caller rather than the edge.
app.set('trust proxy', 1);

// The SPA is same-origin in production and reaches the API through the vite
// proxy in development, so CORS is off unless a separate origin is configured.
// Reflecting any Origin, the previous default, was flagged by the ZAP baseline.
if (process.env.CORS_ORIGIN) app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', authRouter);
app.use('/api/students', studentsRouter);
app.use('/api/staff', staffRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/leave', leaveRouter);
app.use('/api/work-updates', workUpdatesRouter);
app.use('/api/careers', careersRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/academic', academicRouter);
app.use('/api/public', publicRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Unknown /api paths should be JSON, not the SPA's HTML.
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Never leak a stack trace to the client.
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
