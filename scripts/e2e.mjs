/**
 * End-to-end smoke test. Signs in as every role and runs each workflow against a
 * running API: admission, first sign-in, attendance, work logs, leave, fees and
 * approval, careers. Records are tagged E2E-<timestamp> and removed at the end;
 * the job opening has no delete endpoint and is reported for cleanup.
 *
 *   B=http://127.0.0.1:5055 SEED_PW=<seed password> node scripts/e2e.mjs
 *
 * Exits non-zero if any step fails. A single network-level retry is allowed per
 * call and is reported, so a flaky socket does not read as a broken workflow.
 */
const B = process.env.B, PW = process.env.SEED_PW, TAG = `E2E-${Date.now()}`;
let pass = 0, fail = 0; const created = {};
async function step(name, fn) {
  try { const out = await fn(); console.log(`  PASS  ${name}${out ? '  · ' + out : ''}`); pass++; }
  catch (e) { console.log(`  FAIL  ${name}\n        ${String(e.message).slice(0, 220)}`); fail++; }
}
async function call(method, path, body, token, attempt = 1) {
  let r;
  try {
    r = await fetch(B + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  } catch (e) {
    if (attempt === 1) { console.log(`        (network error on ${method} ${path}: ${e.cause?.code || e.message} — retrying once)`); return call(method, path, body, token, 2); }
    throw e;
  }
  let j = {}; try { j = await r.json(); } catch {}
  return { status: r.status, ...j, _j: j };
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
const login = async (email, password) => { const r = await call('POST', '/api/auth/login', { email, password }); expect(r.status === 200 && r.token, `login ${email} -> ${r.status} ${r.error||''}`); return r; };

console.log(`tag ${TAG}`);
const admin = await login('admin@school.com', PW);
const superadmin = await login('superadmin@school.com', PW);
const accounts = await login('accounts@school.com', PW);

// ── Admissions ────────────────────────────────────────────────────────────────
const setup = await call('GET', '/api/academic/setup', null, admin.token);
const cls = setup.classes?.[0]; const sec = cls?.sections?.[0];
let stu, stuCreds;
await step('admin admits a student into a class/section', async () => {
  const r = await call('POST', '/api/students', { fullName: `${TAG} Student`, rollNumber: '99', dob: '2012-03-15', parentName: `${TAG} Parent`, parentPhone: '+91 90000 00000', classId: cls.id, sectionId: sec.id }, admin.token);
  expect(r.status === 200 && r.student, `${r.status} ${r.error||''}`);
  stu = r.student; stuCreds = r.loginCredentials; created.student = stu.id;
  expect(stu.enrollments?.length === 1, 'not enrolled'); expect(stuCreds?.passwordDOB === '15/03/2012', `dob pw ${stuCreds?.passwordDOB}`);
  return `${stu.studentCode}`;
});
let student;
await step('new student signs in with student code + DOB', async () => { student = await login(stuCreds.studentId, stuCreds.passwordDOB); expect(student.user.role === 'USER'); return student.user.role; });
await step('student sees only their own record', async () => { const r = await call('GET', '/api/students/me', null, student.token); expect(r.status === 200 && r.student?.id === stu.id, `${r.status} got ${r.student?.studentCode}`); });
await step('admin edits the student', async () => { const r = await call('PUT', `/api/students/${stu.id}`, { fullName: `${TAG} Student Renamed` }, admin.token); expect(r.status === 200 && r.student.profile.fullName.endsWith('Renamed'), `${r.status}`); });
await step('student changes password and signs in with the new one', async () => {
  const r = await call('POST', '/api/auth/change-password', { oldPassword: stuCreds.passwordDOB, newPassword: 'NewPass-2026!' }, student.token);
  expect(r.status === 200, `${r.status} ${r.error||''}`);
  const bad = await call('POST', '/api/auth/login', { email: stuCreds.studentId, password: stuCreds.passwordDOB }); expect(bad.status === 401, 'old password still works');
  student = await login(stuCreds.studentId, 'NewPass-2026!');
});

// ── Staff, class teacher, attendance ──────────────────────────────────────────
let stf, staff;
await step('admin creates a staff member (password required)', async () => {
  const no = await call('POST', '/api/staff', { fullName: `${TAG} Teacher`, email: `${TAG.toLowerCase()}@school.com` }, admin.token); expect(no.status === 400, `no-password create returned ${no.status}`);
  const r = await call('POST', '/api/staff', { fullName: `${TAG} Teacher`, email: `${TAG.toLowerCase()}@school.com`, password: 'Teacher-Pass-1', designation: 'PGT', subject: 'Physics', baseSalary: 40000 }, admin.token);
  expect(r.status === 200 && r.staff, `${r.status} ${r.error||''}`); stf = r.staff; created.staff = stf.id;
});
await step('staff signs in', async () => { staff = await login(`${TAG.toLowerCase()}@school.com`, 'Teacher-Pass-1'); expect(staff.user.staffId === stf.id, 'staffId mismatch'); });
await step('admin assigns them as class teacher', async () => { const r = await call('POST', '/api/academic/assign-teacher', { staffId: stf.id, classId: cls.id, sectionId: sec.id }, admin.token); expect(r.status === 200 && r.assignment, `${r.status} ${r.error||''}`); });
await step('staff marks attendance for the class', async () => {
  const r = await call('POST', '/api/attendance', { classId: cls.id, sectionId: sec.id, records: [{ studentId: stu.id, status: 'PRESENT', remarks: TAG }] }, staff.token);
  expect(r.status === 200 && r.count === 1, `${r.status} ${r.error||''}`);
});
await step('student sees that attendance', async () => { const r = await call('GET', '/api/attendance', null, student.token); expect(r.status === 200 && r.attendances.some(a => a.remarks === TAG), `${r.status} n=${r.attendances?.length}`); return `${r.stats.percentage}%`; });
await step('staff can read the roster (INTERNAL role group, by design)', async () => { const r = await call('GET', '/api/students', null, staff.token); expect(r.status === 200, `${r.status}`); });

// ── Work log + leave ──────────────────────────────────────────────────────────
await step('staff logs today\'s work', async () => { const r = await call('POST', '/api/work-updates', { workSummary: `${TAG} taught optics`, department: 'Science', hoursWorked: 6 }, staff.token); expect(r.status === 200 && r.workUpdate.staffId === stf.id, `${r.status} ${r.error||''}`); });
await step('admin can read that work log', async () => { const r = await call('GET', '/api/work-updates', null, admin.token); expect(r.workUpdates.some(w => w.workSummary.startsWith(TAG)), 'not listed'); });
let leave;
await step('staff requests leave', async () => { const r = await call('POST', '/api/leave', { startDate: '2026-10-01', endDate: '2026-10-02', reason: `${TAG} family` }, staff.token); expect(r.status === 200 && r.leaveRequest.staffId === stf.id, `${r.status} ${r.error||''}`); leave = r.leaveRequest; expect(leave.daysCount === 2, `days ${leave.daysCount}`); });
await step('staff cannot approve their own leave', async () => { const r = await call('PUT', '/api/leave', { leaveRequestId: leave.id, status: 'APPROVED' }, staff.token); expect(r.status === 403, `${r.status}`); });
await step('admin approves it', async () => { const r = await call('PUT', '/api/leave', { leaveRequestId: leave.id, status: 'APPROVED', reviewNotes: TAG }, admin.token); expect(r.status === 200 && r.leaveRequest.status === 'APPROVED', `${r.status} ${r.error||''}`); });
await step('staff sees it approved, and only their own', async () => { const r = await call('GET', '/api/leave', null, staff.token); expect(r.leaveRequests.length >= 1 && r.leaveRequests.every(l => l.staffId === stf.id), 'saw others'); expect(r.leaveRequests.find(l => l.id === leave.id)?.status === 'APPROVED', 'not approved'); });

// ── Fees: student pays, accounts approves ─────────────────────────────────────
const before = await call('GET', '/api/reports', null, accounts.token);
let inv;
await step('student submits a fee payment', async () => { const r = await call('POST', '/api/invoices/pay', { feeCategories: ['Tuition Fee'], amount: 1234, utrNumber: `${TAG}-UTR`, paymentMethod: 'UPI' }, student.token); expect(r.status === 200 && r.invoice.status === 'PENDING_APPROVAL' && r.invoice.studentId === stu.id, `${r.status} ${r.error||''}`); inv = r.invoice; });
await step('student cannot approve their own invoice', async () => { const r = await call('PUT', `/api/invoices/${inv.id}/approve`, { status: 'APPROVED' }, student.token); expect(r.status === 403, `${r.status}`); });
await step('accounts sees it in the queue', async () => { const r = await call('GET', '/api/invoices', null, accounts.token); expect(r.invoices.some(i => i.id === inv.id), 'missing'); });
await step('accounts approves it', async () => { const r = await call('PUT', `/api/invoices/${inv.id}/approve`, { status: 'APPROVED' }, accounts.token); expect(r.status === 200 && r.invoice.status === 'PAID' && r.invoice.balanceAmount === 0, `${r.status} ${r.invoice?.status}`); });
await step('student sees it PAID, and only their own invoices', async () => { const r = await call('GET', '/api/invoices', null, student.token); expect(r.invoices.every(i => i.studentId === stu.id), 'saw others'); expect(r.invoices.find(i => i.id === inv.id)?.status === 'PAID', 'not paid'); });
await step('fee collection metric rose by the amount', async () => { const after = await call('GET', '/api/reports', null, accounts.token); const d = after.metrics.feeCollection - before.metrics.feeCollection; expect(d === 1234, `delta ${d}`); return `+${d}`; });

// ── Careers: post, apply, review, unpublish ───────────────────────────────────
let job;
await step('admin posts a job opening', async () => { const r = await call('POST', '/api/careers', { action: 'CREATE_JOB', title: `${TAG} Librarian`, department: 'Library', description: 'test' }, admin.token); expect(r.status === 200 && r.job, `${r.status} ${r.error||''}`); job = r.job; created.job = job.id; });
await step('public board lists it', async () => { const r = await call('GET', '/api/careers'); expect(r.jobOpenings.some(j => j.id === job.id), 'not public'); });
await step('a visitor applies', async () => { const r = await call('POST', '/api/careers', { jobOpeningId: job.id, applicantName: `${TAG} Applicant`, email: `${TAG.toLowerCase()}-a@example.com`, phone: '+91 90000 11111' }); expect(r.status === 200 && r.application, `${r.status} ${r.error||''}`); });
await step('visitor cannot read the applicant list', async () => { const r = await call('GET', `/api/careers?jobOpeningId=${job.id}`); expect(r.status === 403, `${r.status}`); });
await step('admin reads the applicant list', async () => { const r = await call('GET', `/api/careers?jobOpeningId=${job.id}`, null, admin.token); expect(r.applications.length === 1 && r.applications[0].applicantName.startsWith(TAG), 'wrong list'); });
await step('only the principal can unpublish', async () => {
  const no = await call('PATCH', '/api/careers', { action: 'TOGGLE_PUBLISH', id: job.id, isPublished: false }, admin.token); expect(no.status === 403, `admin got ${no.status}`);
  const r = await call('PATCH', '/api/careers', { action: 'TOGGLE_PUBLISH', id: job.id, isPublished: false }, superadmin.token); expect(r.status === 200, `${r.status}`);
  const pub = await call('GET', '/api/careers'); expect(!pub.jobOpenings.some(j => j.id === job.id), 'still public');
  const apply = await call('POST', '/api/careers', { jobOpeningId: job.id, applicantName: 'x', email: 'x@x.com', phone: '1' }); expect(apply.status === 400, `unpublished job accepted application ${apply.status}`);
});
// /api/public/site is edge-cached for up to five minutes, so it is not expected to
// show a student admitted seconds ago. Check shape and the stable figures instead.
await step('homepage endpoint is public and well-formed', async () => { const r = await call('GET', '/api/public/site'); expect(r.status === 200 && r.school?.name && r.figures?.classes === 12 && Array.isArray(r.faculty), `${r.status} ${JSON.stringify(r.figures)}`); expect(!r.faculty.some(f => 'phone' in f || 'email' in f || 'baseSalary' in f), 'faculty leaks contact/pay fields'); return `${r.figures.students} on roll`; });

// ── Cleanup (cascades remove enrollment, attendance, invoice, payment, leave, work) ──
console.log('── cleanup ──');
await step('delete E2E student (cascades)', async () => { const r = await call('DELETE', `/api/students/${created.student}`, null, admin.token); expect(r.status === 200, `${r.status}`); const me = await call('GET', '/api/students/me', null, student.token); expect(me.status === 401 || me.status === 404, `student still resolvable ${me.status}`); });
await step('delete E2E staff (cascades)', async () => { const r = await call('DELETE', `/api/staff/${created.staff}`, null, admin.token); expect(r.status === 200, `${r.status}`); });
console.log(`JOB_TO_CLEAN=${created.job}`);
console.log(`\nE2E RESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
