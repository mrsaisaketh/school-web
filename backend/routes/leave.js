import express from 'express';
import { db } from '../lib/db.js';
import { emailService } from '../lib/email.js';
import { logAuditEvent } from '../lib/audit.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { staffId, profileId, email } = req.query;
    const where = {};

    let targetStaffId = staffId;
    if (!targetStaffId && profileId) {
      const stf = await db.staff.findUnique({ where: { profileId: String(profileId) } });
      if (stf) targetStaffId = stf.id;
    }
    if (!targetStaffId && email) {
      const stf = await db.staff.findFirst({ where: { profile: { email: String(email).toLowerCase() } } });
      if (stf) targetStaffId = stf.id;
    }

    if (targetStaffId) where.staffId = String(targetStaffId);

    const leaveRequests = await db.leaveRequest.findMany({
      where,
      include: {
        staff: { include: { profile: true, department: true } },
        leaveType: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ leaveRequests });
  } catch (error) {
    console.error('Leave GET error:', error);
    return res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { staffId, profileId, email, startDate, endDate, reason, leaveTypeId } = req.body;

    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ error: 'Please enter start date, end date, and reason for leave.' });
    }

    // Resolve staffId if not directly passed
    let targetStaffId = staffId;

    if (!targetStaffId && profileId) {
      const stf = await db.staff.findUnique({ where: { profileId: String(profileId) } });
      if (stf) targetStaffId = stf.id;
    }

    if (!targetStaffId && email) {
      const stf = await db.staff.findFirst({ where: { profile: { email: String(email).toLowerCase() } } });
      if (stf) targetStaffId = stf.id;
    }

    if (!targetStaffId) {
      const fallbackStaff = await db.staff.findFirst();
      if (fallbackStaff) targetStaffId = fallbackStaff.id;
    }

    if (!targetStaffId) {
      return res.status(400).json({ error: 'Staff member profile not found for leave request.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysCount = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);

    const school = await db.school.findFirst();
    let leaveType = leaveTypeId ? await db.leaveType.findUnique({ where: { id: leaveTypeId } }) : null;
    if (!leaveType && school) {
      leaveType = await db.leaveType.findFirst({ where: { schoolId: school.id } });
      if (!leaveType) {
        leaveType = await db.leaveType.create({
          data: { schoolId: school.id, name: 'Casual Leave', allowedDaysPerYear: 12 },
        });
      }
    }

    const leaveRequest = await db.leaveRequest.create({
      data: {
        staffId: targetStaffId,
        leaveTypeId: leaveType.id,
        startDate: start,
        endDate: end,
        daysCount,
        reason,
        status: 'PENDING',
      },
      include: { staff: { include: { profile: true } } },
    });

    return res.json({ success: true, leaveRequest });
  } catch (error) {
    console.error('Leave POST error:', error);
    return res.status(500).json({ error: 'Failed to create leave request' });
  }
});

router.put('/', async (req, res) => {
  try {
    const { leaveRequestId, status, reviewNotes, userRole, profileId } = req.body;

    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return res.status(403).json({ error: 'Unauthorized to review leave requests' });
    }

    const updated = await db.leaveRequest.update({
      where: { id: leaveRequestId },
      data: {
        status,
        reviewNotes: reviewNotes || null,
        reviewedBy: profileId || 'ADMIN',
      },
      include: { staff: { include: { profile: true } } },
    });

    if (updated.staff?.profile?.email) {
      await emailService.sendEmail({
        to: updated.staff.profile.email,
        subject: `Leave Request Update: ${status}`,
        template: 'LEAVE_DECISION',
        data: {
          staffName: updated.staff.profile.fullName,
          status,
          reviewNotes,
        },
      });
    }

    await logAuditEvent({
      profileId,
      userRole,
      action: `LEAVE_${status}`,
      entity: 'LeaveRequest',
      entityId: leaveRequestId,
      newValue: { status, reviewNotes },
    });

    return res.json({ success: true, leaveRequest: updated });
  } catch (error) {
    console.error('Leave PUT error:', error);
    return res.status(500).json({ error: 'Failed to update leave request' });
  }
});

export default router;
