import express from 'express';
import { db } from '../lib/db.js';

const router = express.Router();

/**
 * Everything the public homepage needs, in one call, without a session.
 * Deliberately narrow: staff are exposed by name, designation and department
 * only — never contact details, codes or pay.
 */
router.get('/site', async (req, res) => {
  try {
    const [school, classes, subjects, staff, openPositions, studentCount] = await Promise.all([
      db.school.findFirst({ select: { name: true, address: true, phone: true, email: true } }),
      db.class.findMany({
        select: { name: true, numericOrder: true, sections: { select: { name: true } } },
        orderBy: { numericOrder: 'asc' },
      }),
      db.subject.findMany({ select: { name: true, code: true }, orderBy: { name: 'asc' } }),
      db.staff.findMany({
        where: { employmentStatus: 'ACTIVE' },
        select: {
          designation: true,
          qualification: true,
          profile: { select: { fullName: true } },
          department: { select: { name: true } },
        },
        orderBy: { joiningDate: 'asc' },
      }),
      db.jobOpening.count({ where: { isPublished: true, status: 'OPEN' } }),
      db.student.count({ where: { status: 'ACTIVE' } }),
    ]);

    if (!school) return res.status(404).json({ error: 'School not configured' });

    // Cache at the edge for a minute: this is the same page for everyone.
    res.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');

    return res.json({
      school,
      classes: classes.map((c) => ({
        name: c.name,
        order: c.numericOrder,
        sections: c.sections.map((s) => s.name).sort(),
      })),
      subjects,
      faculty: staff.map((s) => ({
        name: s.profile.fullName,
        designation: s.designation,
        qualification: s.qualification,
        department: s.department?.name || null,
      })),
      figures: { classes: classes.length, subjects: subjects.length, faculty: staff.length, students: studentCount, openPositions },
    });
  } catch (error) {
    console.error('Public site error:', error);
    return res.status(500).json({ error: 'Failed to load site information' });
  }
});

export default router;
