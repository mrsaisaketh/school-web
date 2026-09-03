import express from 'express';
import { db } from '../lib/db.js';
import { emailService } from '../lib/email.js';
import { logAuditEvent } from '../lib/audit.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { all, jobOpeningId } = req.query;

    if (jobOpeningId) {
      const applications = await db.careerApplication.findMany({
        where: { jobOpeningId: String(jobOpeningId) },
        include: { jobOpening: true },
        orderBy: { createdAt: 'asc' }, // FIFO Order
      });
      return res.json({ applications });
    }

    const where = {};
    if (all !== 'true') {
      where.isPublished = true;
      where.status = 'OPEN';
    }

    const jobOpenings = await db.jobOpening.findMany({
      where,
      include: {
        _count: { select: { applications: true } },
      },
      orderBy: { deadline: 'asc' },
    });

    return res.json({ jobOpenings });
  } catch (error) {
    console.error('Careers GET error:', error);
    return res.status(500).json({ error: 'Failed to fetch careers records' });
  }
});

router.post('/', async (req, res) => {
  try {
    const body = req.body;

    if (body.action === 'CREATE_JOB') {
      const { title, department, description, requirements, experience, salaryRange, deadline, userRole, profileId } = body;
      if (!title || !department || !description) {
        return res.status(400).json({ error: 'Job title, department, and description are required' });
      }

      const school = await db.school.findFirst();
      if (!school) return res.status(400).json({ error: 'School not found' });

      const job = await db.jobOpening.create({
        data: {
          schoolId: school.id,
          title,
          department,
          description,
          requirements: requirements || 'N/A',
          experience: experience || 'Fresher / Experienced',
          salaryRange: salaryRange || 'As per norms',
          deadline: deadline ? new Date(deadline) : new Date(Date.now() + 30 * 24 * 3600 * 1000),
          isPublished: true,
          status: 'OPEN',
          customFieldsJson: '[]',
        },
      });

      await logAuditEvent({
        profileId,
        userRole: userRole || 'SUPER_ADMIN',
        action: 'JOB_OPENING_CREATE',
        entity: 'JobOpening',
        entityId: job.id,
      });

      return res.json({ success: true, job });
    }

    const { jobOpeningId, applicantName, email, phone, dob, qualification, experience, resumeUrl, coverLetter, applicationData } = body;

    if (!jobOpeningId || !applicantName || !email || !phone) {
      return res.status(400).json({ error: 'Required applicant fields missing' });
    }

    const application = await db.careerApplication.create({
      data: {
        jobOpeningId,
        applicantName,
        email: email.toLowerCase().trim(),
        phone,
        dob: dob ? new Date(dob) : new Date(),
        qualification: qualification || 'N/A',
        experience: experience || '0 Years',
        resumeUrl: resumeUrl || '/uploads/resumes/sample_resume.pdf',
        coverLetter: coverLetter || '',
        applicationDataJson: JSON.stringify(applicationData || {}),
        status: 'APPLIED',
      },
      include: { jobOpening: true },
    });

    await emailService.sendEmail({
      to: email,
      subject: `Application Received - ${application.jobOpening.title}`,
      template: 'CAREER_ACK',
      data: {
        applicantName,
        jobTitle: application.jobOpening.title,
        applicationId: application.id,
      },
    });

    return res.json({ success: true, application });
  } catch (error) {
    console.error('Careers POST error:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
});

router.patch('/', async (req, res) => {
  try {
    const { action, id, isPublished, customFields, userRole, profileId } = req.body;

    if (userRole !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized: Only SUPER_ADMIN can modify jobs' });
    }

    if (action === 'TOGGLE_PUBLISH') {
      const updated = await db.jobOpening.update({
        where: { id },
        data: { isPublished: Boolean(isPublished) },
      });

      await logAuditEvent({
        profileId,
        userRole,
        action: isPublished ? 'JOB_REPOST' : 'JOB_UNPUBLISH_DELETE',
        entity: 'JobOpening',
        entityId: id,
      });

      return res.json({ success: true, job: updated });
    }

    if (action === 'UPDATE_FORM_FIELDS') {
      const updated = await db.jobOpening.update({
        where: { id },
        data: { customFieldsJson: JSON.stringify(customFields || []) },
      });

      await logAuditEvent({
        profileId,
        userRole,
        action: 'JOB_FORM_UPDATE',
        entity: 'JobOpening',
        entityId: id,
      });

      return res.json({ success: true, job: updated });
    }

    return res.status(400).json({ error: 'Invalid PATCH action' });
  } catch (error) {
    console.error('Careers PATCH error:', error);
    return res.status(500).json({ error: 'Failed to update job opening' });
  }
});

export default router;
