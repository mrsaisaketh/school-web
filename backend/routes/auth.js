import express from 'express';
import { db } from '../lib/db.js';
import { logAuditEvent } from '../lib/audit.js';
import { hashPassword, verifyPassword, signToken, requireAuth } from '../lib/auth.js';
import { loginLimiter, recordFailure } from '../lib/rateLimit.js';

const router = express.Router();

router.post('/login', loginLimiter, async (req, res) => {
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
      include: { school: true, student: true, staff: true },
    });

    // Same message for "no such user" and "wrong password" so the endpoint
    // cannot be used to enumerate which accounts exist.
    const INVALID = 'Invalid credentials. Students: your password is your DOB in DD/MM/YYYY format.';

    if (!profile || !(await verifyPassword(password, profile.password))) {
      await recordFailure(req);
      return res.status(401).json({ error: INVALID });
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
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      token: signToken(profile),
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

// Confirms the stored token is still valid — used by the frontend route guards.
router.get('/me', requireAuth(), async (req, res) => {
  const profile = await db.profile.findUnique({
    where: { id: req.user.profileId },
    include: { student: true, staff: true },
  });
  if (!profile || profile.status !== 'ACTIVE') {
    return res.status(401).json({ error: 'Account is no longer active' });
  }
  return res.json({
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
});

// CHANGE PASSWORD — always acts on the caller's own profile, taken from the token.
router.post('/change-password', requireAuth(), async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }

    const profile = await db.profile.findUnique({ where: { id: req.user.profileId } });
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });

    if (!(await verifyPassword(oldPassword, profile.password))) {
      return res.status(400).json({ error: 'Current password does not match.' });
    }

    await db.profile.update({
      where: { id: profile.id },
      data: { password: await hashPassword(newPassword) },
    });

    await logAuditEvent({
      profileId: profile.id,
      userRole: profile.role,
      action: 'PASSWORD_CHANGE',
      entity: 'Profile',
      entityId: profile.id,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: 'Password updated successfully!' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: 'Failed to update password' });
  }
});

export default router;
