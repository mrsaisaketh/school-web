import express from 'express';
import { db } from '../lib/db.js';
import { logAuditEvent } from '../lib/audit.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'User ID / Email and password are required' });
    }

    const inputIdentifier = String(email).trim();

    // Find profile by email OR by Student Code / ID
    const profile = await db.profile.findFirst({
      where: {
        OR: [
          { email: inputIdentifier.toLowerCase() },
          { email: `${inputIdentifier.toLowerCase()}@school.com` },
          { student: { studentCode: inputIdentifier } },
          { student: { studentCode: inputIdentifier.toUpperCase() } },
        ],
      },
      include: {
        school: true,
        student: true,
        staff: true,
      },
    });

    if (!profile) {
      return res.status(401).json({ error: 'Invalid Student ID / Email or user not found' });
    }

    if (profile.password !== password) {
      return res.status(401).json({ error: 'Invalid password. Note for students: Password is your DOB in DD/MM/YYYY format.' });
    }

    if (profile.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Account is deactivated. Contact administration.' });
    }

    await logAuditEvent({
      profileId: profile.id,
      userRole: profile.role,
      action: 'USER_LOGIN',
      entity: 'Profile',
      entityId: profile.id,
    });

    return res.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.fullName,
        role: profile.role,
        schoolId: profile.schoolId,
        studentId: profile.student?.id || null,
        staffId: profile.staff?.id || null,
      },
    });
  } catch (error) {
    console.error('Auth login error:', error);
    return res.status(500).json({ error: 'Internal server login error' });
  }
});

// CHANGE PASSWORD ENDPOINT
router.post('/change-password', async (req, res) => {
  try {
    const { profileId, oldPassword, newPassword } = req.body;

    if (!profileId || !oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    const profile = await db.profile.findUnique({ where: { id: profileId } });
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });

    if (profile.password !== oldPassword) {
      return res.status(400).json({ error: 'Current password does not match.' });
    }

    await db.profile.update({
      where: { id: profileId },
      data: { password: newPassword },
    });

    await logAuditEvent({
      profileId: profile.id,
      userRole: profile.role,
      action: 'PASSWORD_CHANGE',
      entity: 'Profile',
      entityId: profile.id,
    });

    return res.json({ success: true, message: 'Password updated successfully!' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: 'Failed to update password' });
  }
});

export default router;
