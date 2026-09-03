import express from 'express';
import { db } from '../lib/db.js';
import { logAuditEvent } from '../lib/audit.js';

const router = express.Router();

// GET ACADEMIC SETUP DATA
router.get('/setup', async (req, res) => {
  try {
    const school = await db.school.findFirst();
    if (!school) return res.status(400).json({ error: 'School not found' });

    let classes = await db.class.findMany({
      where: { schoolId: school.id },
      include: {
        sections: true,
        staffAssignments: {
          include: { staff: { include: { profile: true } }, section: true, subject: true },
        },
        attendancePermissions: {
          include: { staff: { include: { profile: true } }, section: true },
        },
      },
      orderBy: { numericOrder: 'asc' },
    });

    // Seed default classes if none exist
    if (classes.length === 0) {
      const classNames = ['Class 10', 'Class 9', 'Class 8', 'Class 7', 'Class 6'];
      for (let i = 0; i < classNames.length; i++) {
        const cls = await db.class.create({
          data: {
            schoolId: school.id,
            name: classNames[i],
            code: `CLS_${10 - i}`,
            numericOrder: 10 - i,
            sections: {
              create: [
                { name: 'A', capacity: 40 },
                { name: 'B', capacity: 40 },
              ],
            },
          },
        });
      }

      classes = await db.class.findMany({
        where: { schoolId: school.id },
        include: {
          sections: true,
          staffAssignments: {
            include: { staff: { include: { profile: true } }, section: true, subject: true },
          },
          attendancePermissions: {
            include: { staff: { include: { profile: true } }, section: true },
          },
        },
        orderBy: { numericOrder: 'asc' },
      });
    }

    const staffMembers = await db.staff.findMany({
      include: { profile: true },
    });

    return res.json({ classes, staffMembers });
  } catch (error) {
    console.error('Academic setup GET error:', error);
    return res.status(500).json({ error: 'Failed to fetch academic setup' });
  }
});

// ALLOCATE CLASS / SUBJECT TEACHER
router.post('/assign-teacher', async (req, res) => {
  try {
    const { staffId, classId, sectionId, roleType = 'CLASS_TEACHER', userRole, profileId } = req.body;

    if (!staffId || !classId || !sectionId) {
      return res.status(400).json({ error: 'Staff, class, and section IDs are required' });
    }

    // Delete existing assignment for this section & role type
    await db.staffAssignment.deleteMany({
      where: { classId, sectionId, roleType },
    });

    const assignment = await db.staffAssignment.create({
      data: {
        staffId,
        classId,
        sectionId,
        roleType,
      },
      include: {
        staff: { include: { profile: true } },
        class: true,
        section: true,
      },
    });

    // Also automatically grant attendance permission for class teacher
    const activeUntil = new Date();
    activeUntil.setDate(activeUntil.getDate() + 30); // valid 30 days

    await db.attendancePermission.deleteMany({
      where: { staffId, classId, sectionId },
    });

    await db.attendancePermission.create({
      data: {
        staffId,
        classId,
        sectionId,
        activeUntil,
        grantedBy: profileId || 'ADMIN',
      },
    });

    await logAuditEvent({
      profileId,
      userRole: userRole || 'ADMIN',
      action: 'TEACHER_ASSIGNMENT',
      entity: 'StaffAssignment',
      newValue: { staffId, classId, sectionId, roleType },
    });

    return res.json({ success: true, assignment });
  } catch (error) {
    console.error('Assign teacher POST error:', error);
    return res.status(500).json({ error: 'Failed to allocate teacher' });
  }
});

// GRANT ATTENDANCE ACCESS PERMISSION
router.post('/grant-permission', async (req, res) => {
  try {
    const { staffId, classId, sectionId, hoursValid = 24, userRole, profileId } = req.body;

    if (!staffId || !classId || !sectionId) {
      return res.status(400).json({ error: 'Staff, class, and section are required' });
    }

    const activeUntil = new Date(Date.now() + hoursValid * 3600 * 1000);

    const permission = await db.attendancePermission.create({
      data: {
        staffId,
        classId,
        sectionId,
        activeUntil,
        grantedBy: profileId || 'ADMIN',
      },
      include: {
        staff: { include: { profile: true } },
        class: true,
        section: true,
      },
    });

    await logAuditEvent({
      profileId,
      userRole: userRole || 'ADMIN',
      action: 'ATTENDANCE_ACCESS_GRANT',
      entity: 'AttendancePermission',
      newValue: { staffId, classId, sectionId, activeUntil },
    });

    return res.json({ success: true, permission });
  } catch (error) {
    console.error('Grant permission POST error:', error);
    return res.status(500).json({ error: 'Failed to grant attendance access' });
  }
});

export default router;
