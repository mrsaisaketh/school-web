import express from 'express';
import { db } from '../lib/db.js';
import { requireAuth, FINANCE } from '../lib/auth.js';

const router = express.Router();

router.get('/', requireAuth(...FINANCE), async (req, res) => {
  try {
    const totalStudents = await db.student.count();
    const activeStudents = await db.student.count({ where: { status: 'ACTIVE' } });
    const leftStudents = await db.student.count({ where: { status: 'LEFT' } });
    const totalStaff = await db.staff.count();

    const verifiedPayments = await db.payment.aggregate({
      where: { status: 'VERIFIED' },
      _sum: { amount: true },
    });

    const pendingInvoices = await db.invoice.aggregate({
      where: { status: { in: ['ISSUED', 'PARTIALLY_PAID'] } },
      _sum: { balanceAmount: true },
    });

    return res.json({
      metrics: {
        totalStudents,
        activeStudents,
        leftStudents,
        totalStaff,
        feeCollection: verifiedPayments._sum.amount || 0,
        pendingFees: pendingInvoices._sum.balanceAmount || 0,
      },
    });
  } catch (error) {
    console.error('Reports GET error:', error);
    return res.status(500).json({ error: 'Failed to fetch executive metrics' });
  }
});

export default router;
