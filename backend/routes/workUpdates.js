import express from 'express';
import { db } from '../lib/db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { staffId, date: dateStr } = req.query;

    const where = {};
    if (staffId) where.staffId = String(staffId);

    if (dateStr) {
      const startOfDay = new Date(String(dateStr));
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(String(dateStr));
      endOfDay.setHours(23, 59, 59, 999);

      where.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const workUpdates = await db.dailyWorkUpdate.findMany({
      where,
      include: {
        staff: { include: { profile: true, department: true } },
      },
      orderBy: { date: 'desc' },
    });

    return res.json({ workUpdates });
  } catch (error) {
    console.error('Work Updates GET error:', error);
    return res.status(500).json({ error: 'Failed to fetch daily work updates' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { staffId, workSummary, department, hoursWorked, date: dateStr } = req.body;

    if (!staffId || !workSummary) {
      return res.status(400).json({ error: 'Work summary and staff ID are required' });
    }

    const workUpdate = await db.dailyWorkUpdate.create({
      data: {
        staffId,
        date: dateStr ? new Date(dateStr) : new Date(),
        workSummary,
        department: department || 'General',
        hoursWorked: parseFloat(hoursWorked || '6.0'),
        status: 'PENDING',
      },
    });

    return res.json({ success: true, workUpdate });
  } catch (error) {
    console.error('Work Updates POST error:', error);
    return res.status(500).json({ error: 'Failed to record work update' });
  }
});

export default router;
