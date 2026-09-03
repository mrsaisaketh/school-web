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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend REST API server running at http://localhost:${PORT} and http://127.0.0.1:${PORT}`);
});
