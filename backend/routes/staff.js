import express from 'express';
import { db } from '../lib/db.js';
import { logAuditEvent } from '../lib/audit.js';

const router = express.Router();

// GET STAFF
router.get('/', async (req, res) => {
  try {
    const staffMembers = await db.staff.findMany({
      include: {
        profile: true,
        department: true,
        assignments: { include: { class: true, section: true, subject: true } },
      },
      orderBy: { joiningDate: 'desc' },
    });

    return res.json({ staffMembers });
  } catch (error) {
    console.error('Staff GET error:', error);
    return res.status(500).json({ error: 'Failed to fetch staff members' });
  }
});

// CREATE STAFF
router.post('/', async (req, res) => {
  try {
    const { fullName, email, password, employeeCode, designation, subject, departmentId, qualification, baseSalary, userRole, profileId } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({ error: 'Staff name and login email ID are required' });
    }

    const school = await db.school.findFirst();
    let deptId = departmentId;
    if (!deptId && school) {
      let dept = await db.department.findFirst({ where: { schoolId: school.id } });
      if (!dept) {
        dept = await db.department.create({
          data: { schoolId: school.id, name: subject || 'Academics', code: 'ACAD' },
        });
      }
      deptId = dept.id;
    }

    const empCode = employeeCode || `EMP_${Date.now().toString().slice(-6)}`;

    // Check if email already exists
    const existing = await db.profile.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return res.status(400).json({ error: `An account with email ${email} already exists.` });
    }

    // Create User Profile with Login Credentials (Email & Password)
    const newProfile = await db.profile.create({
      data: {
        schoolId: school.id,
        email: email.toLowerCase().trim(),
        password: password || 'password123',
        fullName,
        role: 'STAFF',
        status: 'ACTIVE',
      },
    });

    const staff = await db.staff.create({
      data: {
        schoolId: school.id,
        profileId: newProfile.id,
        employeeCode: empCode,
        designation: designation || (subject ? `${subject} Teacher` : 'Faculty Teacher'),
        qualification: qualification || 'Post Graduate',
        departmentId: deptId,
        joiningDate: new Date(),
        baseSalary: parseFloat(baseSalary || '45000'),
        employmentStatus: 'ACTIVE',
      },
      include: {
        profile: true,
        department: true,
      },
    });

    await logAuditEvent({
      profileId,
      userRole,
      action: 'STAFF_ONBOARD',
      entity: 'Staff',
      entityId: staff.id,
    });

    return res.json({ success: true, staff });
  } catch (error) {
    console.error('Staff POST error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create staff member' });
  }
});

// EDIT STAFF
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, password, employeeCode, designation, subject, baseSalary, userRole, profileId } = req.body;

    const staff = await db.staff.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!staff) return res.status(404).json({ error: 'Staff profile not found' });

    // Update Profile (Name, Email & Password)
    if (fullName || email || password) {
      await db.profile.update({
        where: { id: staff.profileId },
        data: {
          ...(fullName && { fullName }),
          ...(email && { email: email.toLowerCase().trim() }),
          ...(password && { password }),
        },
      });
    }

    // Update Staff Record
    const updatedStaff = await db.staff.update({
      where: { id },
      data: {
        ...(employeeCode && { employeeCode }),
        ...(designation && { designation }),
        ...(subject && { designation: `${subject} Teacher` }),
        ...(baseSalary && { baseSalary: parseFloat(baseSalary) }),
      },
      include: {
        profile: true,
        department: true,
      },
    });

    await logAuditEvent({
      profileId,
      userRole,
      action: 'STAFF_UPDATE',
      entity: 'Staff',
      entityId: id,
    });

    return res.json({ success: true, staff: updatedStaff });
  } catch (error) {
    console.error('Staff PUT error:', error);
    return res.status(500).json({ error: 'Failed to update staff member' });
  }
});

// DELETE STAFF
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userRole, profileId } = req.body || {};

    const staff = await db.staff.findUnique({ where: { id } });
    if (!staff) return res.status(404).json({ error: 'Staff member not found' });

    await db.staff.delete({ where: { id } });
    await db.profile.delete({ where: { id: staff.profileId } }).catch(() => {});

    await logAuditEvent({
      profileId,
      userRole,
      action: 'STAFF_DELETE',
      entity: 'Staff',
      entityId: id,
    });

    return res.json({ success: true, message: 'Staff member deleted successfully' });
  } catch (error) {
    console.error('Staff DELETE error:', error);
    return res.status(500).json({ error: 'Failed to delete staff member' });
  }
});

export default router;
