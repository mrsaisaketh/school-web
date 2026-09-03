import express from 'express';
import { db } from '../lib/db.js';
import { logAuditEvent } from '../lib/audit.js';

const router = express.Router();

// GET INVOICES & PAYMENTS HISTORY
router.get('/', async (req, res) => {
  try {
    const { studentId, status, search = '' } = req.query;

    const where = {};
    if (studentId) where.studentId = String(studentId);
    if (status) where.status = String(status);

    if (search) {
      const q = String(search);
      where.OR = [
        { invoiceNumber: { contains: q } },
        { student: { studentCode: { contains: q } } },
        { student: { admissionNumber: { contains: q } } },
        { student: { profile: { fullName: { contains: q } } } },
        { payments: { some: { transactionNumber: { contains: q } } } },
        { payments: { some: { providerTxId: { contains: q } } } },
      ];
    }

    const invoices = await db.invoice.findMany({
      where,
      include: {
        student: {
          include: {
            profile: true,
            enrollments: { include: { class: true, section: true } },
          },
        },
        items: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const allVerifiedPayments = await db.payment.findMany({
      where: { status: 'VERIFIED' },
      include: {
        invoice: true,
        student: { include: { profile: true, enrollments: { include: { class: true, section: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const monthlySummaryMap = {};
    for (const p of allVerifiedPayments) {
      const monthKey = new Date(p.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' });
      monthlySummaryMap[monthKey] = (monthlySummaryMap[monthKey] || 0) + p.amount;
    }

    const monthlySummary = Object.entries(monthlySummaryMap).map(([month, total]) => ({ month, total }));

    return res.json({ invoices, paymentsHistory: allVerifiedPayments, monthlySummary });
  } catch (error) {
    console.error('Invoices GET error:', error);
    return res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// CREATE / SUBMIT NEW FEE INVOICE & PAYMENT FOR APPROVAL
router.post('/pay', async (req, res) => {
  try {
    const { studentId, feeCategories, amount, transactionId, utrNumber, paymentMethod, userRole, profileId } = req.body;

    if (!studentId || !amount) {
      return res.status(400).json({ error: 'Student and payment amount are required.' });
    }

    const student = await db.student.findUnique({
      where: { id: String(studentId) },
      include: { profile: true },
    });
    if (!student) return res.status(404).json({ error: 'Student profile not found.' });

    let activeYear = await db.academicYear.findFirst({ where: { isActive: true } });
    if (!activeYear) {
      const school = await db.school.findFirst();
      activeYear = await db.academicYear.create({
        data: {
          schoolId: school.id,
          name: '2026-27',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2027-05-31'),
          isActive: true,
        },
      });
    }

    const invNum = `INV-${Date.now().toString().slice(-6)}`;
    const parsedAmount = parseFloat(amount || '0');
    const categoriesStr = Array.isArray(feeCategories) ? feeCategories.join(', ') : feeCategories || 'Tuition Fee';
    const utr = utrNumber || transactionId || `UTR-${Date.now().toString().slice(-8)}`;

    // Create Invoice with PENDING_APPROVAL status
    const invoice = await db.invoice.create({
      data: {
        invoiceNumber: invNum,
        studentId: student.id,
        academicYearId: activeYear.id,
        feeCategory: categoriesStr,
        subtotal: parsedAmount,
        discount: 0,
        lateFee: 0,
        totalAmount: parsedAmount,
        paidAmount: 0,
        balanceAmount: parsedAmount,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'PENDING_APPROVAL',
      },
      include: {
        student: { include: { profile: true, enrollments: { include: { class: true, section: true } } } },
      },
    });

    // Create Payment Record linked to Invoice
    const payment = await db.payment.create({
      data: {
        transactionNumber: utr,
        invoiceId: invoice.id,
        studentId: student.id,
        provider: 'MANUAL_UPI',
        providerTxId: utr,
        paymentMethod: paymentMethod || 'UPI',
        amount: parsedAmount,
        status: 'PENDING_VERIFICATION',
        referenceNote: `Fee payment for ${categoriesStr}`,
      },
    });

    await logAuditEvent({
      profileId,
      userRole,
      action: 'FEE_PAYMENT_SUBMIT',
      entity: 'Invoice',
      entityId: invoice.id,
      newValue: { invoiceNumber: invNum, amount: parsedAmount, utr },
    });

    return res.json({ success: true, invoice, payment });
  } catch (error) {
    console.error('Invoice Pay error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process fee payment' });
  }
});

// APPROVE OR REJECT GENERATED INVOICE
router.put('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, userRole, profileId } = req.body; // status: 'APPROVED' or 'REJECTED'

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { payments: true, student: { include: { profile: true } } },
    });

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    if (status === 'APPROVED') {
      const updatedInvoice = await db.invoice.update({
        where: { id },
        data: {
          status: 'PAID',
          paidAmount: invoice.totalAmount,
          balanceAmount: 0,
        },
        include: {
          student: { include: { profile: true, enrollments: { include: { class: true, section: true } } } },
          payments: true,
        },
      });

      // Update linked payments to VERIFIED
      await db.payment.updateMany({
        where: { invoiceId: id },
        data: { status: 'VERIFIED' },
      });

      // Notify Student Profile
      if (invoice.student?.profileId) {
        await db.notification.create({
          data: {
            profileId: invoice.student.profileId,
            title: 'Fee Payment Approved & Receipt Sent',
            message: `Your payment of Rs. ${invoice.totalAmount.toLocaleString('en-IN')} for ${invoice.feeCategory} (Invoice: ${invoice.invoiceNumber}) has been approved. Balance is now Rs. 0.`,
            type: 'PAYMENT_VERIFIED',
          },
        });
      }

      await logAuditEvent({
        profileId,
        userRole,
        action: 'INVOICE_APPROVE',
        entity: 'Invoice',
        entityId: id,
        newValue: { invoiceNumber: invoice.invoiceNumber, status: 'PAID' },
      });

      return res.json({ success: true, invoice: updatedInvoice });
    } else {
      const updatedInvoice = await db.invoice.update({
        where: { id },
        data: {
          status: 'CANCELLED',
        },
      });

      await db.payment.updateMany({
        where: { invoiceId: id },
        data: { status: 'REJECTED' },
      });

      await logAuditEvent({
        profileId,
        userRole,
        action: 'INVOICE_REJECT',
        entity: 'Invoice',
        entityId: id,
        newValue: { invoiceNumber: invoice.invoiceNumber, status: 'CANCELLED' },
      });

      return res.json({ success: true, invoice: updatedInvoice });
    }
  } catch (error) {
    console.error('Invoice approve error:', error);
    return res.status(500).json({ error: 'Failed to process invoice approval' });
  }
});

// CREATE CUSTOM MANUAL INVOICE
router.post('/', async (req, res) => {
  try {
    const { studentId, feeCategory, subtotal, discount, lateFee, dueDate, userRole, profileId } = req.body;

    let activeYear = await db.academicYear.findFirst({ where: { isActive: true } });
    if (!activeYear) {
      const school = await db.school.findFirst();
      activeYear = await db.academicYear.create({
        data: {
          schoolId: school.id,
          name: '2026-27',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2027-05-31'),
          isActive: true,
        },
      });
    }

    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const sub = parseFloat(subtotal || '0');
    const disc = parseFloat(discount || '0');
    const late = parseFloat(lateFee || '0');
    const totalAmount = sub - disc + late;

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        studentId,
        academicYearId: activeYear.id,
        feeCategory: feeCategory || 'TUITION',
        subtotal: sub,
        discount: disc,
        lateFee: late,
        totalAmount,
        paidAmount: 0,
        balanceAmount: totalAmount,
        dueDate: dueDate ? new Date(dueDate) : new Date('2026-09-30'),
        status: 'ISSUED',
      },
    });

    await logAuditEvent({
      profileId,
      userRole,
      action: 'INVOICE_CREATE',
      entity: 'Invoice',
      entityId: invoice.id,
      newValue: { invoiceNumber, totalAmount },
    });

    return res.json({ success: true, invoice });
  } catch (error) {
    console.error('Invoices POST error:', error);
    return res.status(500).json({ error: 'Failed to issue invoice' });
  }
});

export default router;
