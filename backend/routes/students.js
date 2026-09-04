import express from 'express';
import { db } from '../lib/db.js';
import { logAuditEvent } from '../lib/audit.js';
import { requireAuth, hashPassword, ADMINS, INTERNAL } from '../lib/auth.js';

const router = express.Router();

// Helper to format YYYY-MM-DD or Date object into DD/MM/YYYY for student login password
function formatDobToDDMMYYYY(dobInput) {
  if (!dobInput) return '15/08/2010';
  if (typeof dobInput === 'string' && dobInput.includes('/')) return dobInput.trim();
  const d = new Date(dobInput);
  if (isNaN(d.getTime())) return '15/08/2010';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// GET STUDENT PROFILE FOR LOGGED IN USER
router.get('/me', requireAuth(), async (req, res) => {
  try {
    const { studentCode, email } = req.query;
    const where = {};

    if (req.user.role === 'USER') {
      // Ignore any lookup params a student supplies — they get their own record only.
      where.profileId = req.user.profileId;
    } else if (studentCode) {
      where.studentCode = String(studentCode);
    } else if (email) {
      where.profile = { email: String(email).toLowerCase() };
    } else {
      return res.status(400).json({ error: 'Provide studentCode or email to look up a student' });
    }

    let student = await db.student.findFirst({
      where,
      include: {
        profile: true,
        parents: { include: { parent: true } },
        enrollments: { include: { class: true, section: true } },
      },
    });

    if (!student) return res.status(404).json({ error: 'Student record not found' });

    return res.json({ student });
  } catch (error) {
    console.error('Student /me error:', error);
    return res.status(500).json({ error: 'Failed to fetch student profile' });
  }
});

// GET ALL STUDENTS
router.get('/', requireAuth(...INTERNAL), async (req, res) => {
  try {
    const { search, classId, sectionId, status, limit = 100 } = req.query;

    const where = {};
    if (status) where.status = String(status);
    if (classId || sectionId) {
      where.enrollments = {
        some: {
          ...(classId && { classId: String(classId) }),
          ...(sectionId && { sectionId: String(sectionId) }),
          status: 'ACTIVE',
        },
      };
    }

    if (search) {
      const q = String(search);
      where.OR = [
        { studentCode: { contains: q } },
        { admissionNumber: { contains: q } },
        { profile: { fullName: { contains: q } } },
      ];
    }

    const students = await db.student.findMany({
      where,
      take: Number(limit),
      include: {
        profile: true,
        parents: { include: { parent: true } },
        enrollments: {
          include: { class: true, section: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ students });
  } catch (error) {
    console.error('Students GET error:', error);
    return res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// CREATE STUDENT (USER LOGIN CREDENTIALS = STUDENT CODE & DOB in DD/MM/YYYY)
router.post('/', requireAuth(...ADMINS), async (req, res) => {
  try {
    const { fullName, studentCode, rollNumber, dob, parentName, parentPhone, aadharNumber, classId, sectionId } = req.body;
    const { profileId, role: userRole } = req.user;

    if (!fullName) {
      return res.status(400).json({ error: 'Student full name is required' });
    }

    const school = await db.school.findFirst();
    const activeYear = await db.academicYear.findFirst({ where: { isActive: true } });
    if (!school || !activeYear) return res.status(400).json({ error: 'School infrastructure not initialized' });

    const finalStudentCode = studentCode ? studentCode.trim() : `STU_${Date.now().toString().slice(-6)}`;
    const formattedPasswordDOB = formatDobToDDMMYYYY(dob);
    const admissionNumber = `ADM_${Date.now().toString().slice(-6)}`;
    const studentProfileEmail = `${finalStudentCode.toLowerCase()}@school.com`;

    // Create Profile: Login identifier = Student Code / Email, Password = DOB (DD/MM/YYYY)
    const newProfile = await db.profile.create({
      data: {
        schoolId: school.id,
        email: studentProfileEmail,
        password: await hashPassword(formattedPasswordDOB),
        fullName,
        phone: parentPhone || aadharNumber || null,
        role: 'USER',
        status: 'ACTIVE',
      },
    });

    // Create Parent if provided
    let parentRelation = null;
    if (parentName) {
      const parentObj = await db.parent.create({
        data: {
          fullName: parentName,
          phone: parentPhone || '+91 99999 00000',
          relation: 'Parent/Guardian',
        },
      });
      parentRelation = parentObj.id;
    }

    // Create Student Record
    const studentData = {
      schoolId: school.id,
      profileId: newProfile.id,
      studentCode: finalStudentCode,
      rollNumber: rollNumber || '1',
      admissionNumber,
      dob: dob ? new Date(dob) : new Date('2010-08-15'),
      gender: 'Male',
      status: 'ACTIVE',
    };

    if (classId && sectionId) {
      studentData.enrollments = {
        create: {
          classId,
          sectionId,
          academicYearId: activeYear.id,
          status: 'ACTIVE',
        },
      };
    }

    if (parentRelation) {
      studentData.parents = {
        create: {
          parentId: parentRelation,
          isPrimary: true,
        },
      };
    }

    const student = await db.student.create({
      data: studentData,
      include: {
        profile: true,
        parents: { include: { parent: true } },
        enrollments: { include: { class: true, section: true } },
      },
    });

    await logAuditEvent({
      profileId,
      userRole,
      action: 'STUDENT_ADMISSION',
      entity: 'Student',
      entityId: student.id,
    });

    return res.json({
      success: true,
      student,
      loginCredentials: {
        studentId: finalStudentCode,
        passwordDOB: formattedPasswordDOB,
      },
    });
  } catch (error) {
    console.error('Students POST error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create student' });
  }
});

// EDIT STUDENT
router.put('/:id', requireAuth(...ADMINS), async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, studentCode, rollNumber, dob, parentName, parentPhone, classId, sectionId } = req.body;
    const { profileId, role: userRole } = req.user;

    const student = await db.student.findUnique({
      where: { id },
      include: { profile: true, enrollments: true, parents: { include: { parent: true } } },
    });

    if (!student) return res.status(404).json({ error: 'Student record not found' });

    const formattedPasswordDOB = dob ? formatDobToDDMMYYYY(dob) : null;

    // Update Profile (Name, Email/Code, and Password = DOB if updated)
    if (fullName || parentPhone || studentCode || formattedPasswordDOB) {
      await db.profile.update({
        where: { id: student.profileId },
        data: {
          ...(fullName && { fullName }),
          ...(parentPhone && { phone: parentPhone }),
          ...(studentCode && { email: `${studentCode.toLowerCase()}@school.com` }),
          ...(formattedPasswordDOB && { password: await hashPassword(formattedPasswordDOB) }),
        },
      });
    }

    // Update Student attributes
    const updatedStudent = await db.student.update({
      where: { id },
      data: {
        ...(studentCode && { studentCode }),
        ...(rollNumber && { rollNumber }),
        ...(dob && { dob: new Date(dob) }),
      },
      include: {
        profile: true,
        parents: { include: { parent: true } },
        enrollments: { include: { class: true, section: true } },
      },
    });

    // Update Parent if exists
    if (parentName && student.parents?.[0]?.parent) {
      await db.parent.update({
        where: { id: student.parents[0].parent.id },
        data: {
          fullName: parentName,
          ...(parentPhone && { phone: parentPhone }),
        },
      });
    }

    // Update Class & Section Enrollment
    if (classId && sectionId && student.enrollments?.[0]) {
      await db.studentEnrollment.update({
        where: { id: student.enrollments[0].id },
        data: { classId, sectionId },
      });
    }

    await logAuditEvent({
      profileId,
      userRole,
      action: 'STUDENT_UPDATE',
      entity: 'Student',
      entityId: id,
    });

    return res.json({ success: true, student: updatedStudent });
  } catch (error) {
    console.error('Students PUT error:', error);
    return res.status(500).json({ error: 'Failed to update student' });
  }
});

// DELETE STUDENT
router.delete('/:id', requireAuth(...ADMINS), async (req, res) => {
  try {
    const { id } = req.params;
    const { profileId, role: userRole } = req.user;

    const student = await db.student.findUnique({ where: { id } });
    if (!student) return res.status(404).json({ error: 'Student record not found' });

    // Delete Student record and underlying profile
    await db.student.delete({ where: { id } });
    await db.profile.delete({ where: { id: student.profileId } }).catch(() => {});

    await logAuditEvent({
      profileId,
      userRole,
      action: 'STUDENT_DELETE',
      entity: 'Student',
      entityId: id,
    });

    return res.json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Students DELETE error:', error);
    return res.status(500).json({ error: 'Failed to delete student' });
  }
});

export default router;
