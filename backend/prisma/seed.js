import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding rich static data for ALL ROLES (SUPER_ADMIN, ADMIN, ACCOUNTS, STAFF)...');

  // Clean data safely
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.careerApplication.deleteMany();
  await prisma.jobOpening.deleteMany();
  await prisma.landingSection.deleteMany();
  await prisma.siteSetting.deleteMany();
  await prisma.dailyWorkUpdate.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.payroll.deleteMany();
  await prisma.staffSalaryStructure.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.paymentVerification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.studentFeeAssignment.deleteMany();
  await prisma.feeItem.deleteMany();
  await prisma.feeStructure.deleteMany();
  await prisma.staffAttendance.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.attendancePermission.deleteMany();
  await prisma.staffAssignment.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.studentDocument.deleteMany();
  await prisma.studentParent.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.studentEnrollment.deleteMany();
  await prisma.student.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.section.deleteMany();
  await prisma.class.deleteMany();
  await prisma.department.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.school.deleteMany();

  // 1. School & Academic Year
  const school = await prisma.school.create({
    data: {
      id: 'sch_1',
      name: 'St. Xavier International School',
      code: 'SCH_001',
      address: '123 Education Boulevard, Tech City, IN 560001',
      email: 'admin@stxavierschool.edu',
      phone: '+91 98765 43210',
    },
  });

  const activeYear = await prisma.academicYear.create({
    data: {
      id: 'ay_2026_27',
      schoolId: school.id,
      name: '2026-27',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2027-03-31'),
      isActive: true,
    },
  });

  // 2. Roles
  const roles = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTS', 'STAFF', 'USER'];
  for (const r of roles) {
    await prisma.role.create({
      data: { name: r, description: `${r} system governance role` },
    });
  }

  // 3. Departments & Subjects
  const deptAcademics = await prisma.department.create({
    data: { id: 'dept_1', schoolId: school.id, name: 'Academics & Science', code: 'ACAD' },
  });
  const deptAdmin = await prisma.department.create({
    data: { id: 'dept_2', schoolId: school.id, name: 'Administration & Governance', code: 'ADMIN' },
  });
  const deptAccounts = await prisma.department.create({
    data: { id: 'dept_3', schoolId: school.id, name: 'Finance & Bursar', code: 'FIN' },
  });

  const subjectsData = [
    { id: 'subj_1', name: 'Physics', code: 'PHY' },
    { id: 'subj_2', name: 'Mathematics', code: 'MATH' },
    { id: 'subj_3', name: 'Chemistry', code: 'CHEM' },
    { id: 'subj_4', name: 'Biology', code: 'BIO' },
    { id: 'subj_5', name: 'English', code: 'ENG' },
    { id: 'subj_6', name: 'Social Studies', code: 'SST' },
    { id: 'subj_7', name: 'Computer Science', code: 'CS' },
  ];
  for (const s of subjectsData) {
    await prisma.subject.create({
      data: { ...s, schoolId: school.id },
    });
  }

  // 4. Classes & Sections (Class 1 to Class 12)
  const createdClasses = [];
  for (let i = 1; i <= 12; i++) {
    const cls = await prisma.class.create({
      data: {
        id: `cls_${i}`,
        schoolId: school.id,
        name: `Class ${i}`,
        code: `C${i}`,
        numericOrder: i,
        sections: {
          create: [
            { id: `sec_${i}_a`, name: 'A', capacity: 40 },
            { id: `sec_${i}_b`, name: 'B', capacity: 40 },
          ],
        },
      },
      include: { sections: true },
    });
    createdClasses.push(cls);
  }

  // 5. Seed Core Login Profiles
  const pSuper = await prisma.profile.create({
    data: {
      id: 'prof_superadmin',
      schoolId: school.id,
      email: 'superadmin@school.com',
      password: 'password123',
      fullName: 'Super Admin',
      role: 'SUPER_ADMIN',
      phone: '+91 99999 11111',
      status: 'ACTIVE',
    },
  });

  const pAdmin = await prisma.profile.create({
    data: {
      id: 'prof_admin',
      schoolId: school.id,
      email: 'admin@school.com',
      password: 'password123',
      fullName: 'School Administrator',
      role: 'ADMIN',
      phone: '+91 99999 22222',
      status: 'ACTIVE',
    },
  });

  const pAccounts = await prisma.profile.create({
    data: {
      id: 'prof_accounts',
      schoolId: school.id,
      email: 'accounts@school.com',
      password: 'password123',
      fullName: 'Accounts Bursar',
      role: 'ACCOUNTS',
      phone: '+91 99999 33333',
      status: 'ACTIVE',
    },
  });

  // 6. Staff Profiles & Staff Records
  const staffProfiles = [
    {
      id: 'prof_staff_main',
      email: 'staff@school.com',
      password: 'password123',
      fullName: 'Faculty Teacher',
      empCode: 'EMP_1001',
      designation: 'Senior Physics PGT Teacher',
      qualification: 'M.Sc Physics, B.Ed',
      salary: 55000,
    },
    {
      id: 'prof_staff_ramesh',
      email: 'ramesh@school.com',
      password: 'password123',
      fullName: 'Dr. Ramesh Kumar',
      empCode: 'EMP_1002',
      designation: 'Physics PGT Teacher',
      qualification: 'Ph.D Physics',
      salary: 50000,
    },
    {
      id: 'prof_staff_sunita',
      email: 'sunita@school.com',
      password: 'password123',
      fullName: 'Sunita Rao',
      empCode: 'EMP_1003',
      designation: 'Mathematics PGT Teacher',
      qualification: 'M.Sc Mathematics',
      salary: 48000,
    },
    {
      id: 'prof_staff_anand',
      email: 'anand@school.com',
      password: 'password123',
      fullName: 'Anand Verma',
      empCode: 'EMP_1004',
      designation: 'Chemistry PGT Teacher',
      qualification: 'M.Sc Chemistry',
      salary: 47000,
    },
    {
      id: 'prof_staff_priya',
      email: 'priya@school.com',
      password: 'password123',
      fullName: 'Priya Sharma',
      empCode: 'EMP_1005',
      designation: 'Biology PGT Teacher',
      qualification: 'M.Sc Botany',
      salary: 46000,
    },
  ];

  const createdStaffRecords = [];
  for (const sp of staffProfiles) {
    const prof = await prisma.profile.create({
      data: {
        id: sp.id,
        schoolId: school.id,
        email: sp.email,
        password: sp.password,
        fullName: sp.fullName,
        role: 'STAFF',
        phone: '+91 98765 00000',
        status: 'ACTIVE',
      },
    });

    const stf = await prisma.staff.create({
      data: {
        schoolId: school.id,
        profileId: prof.id,
        employeeCode: sp.empCode,
        qualification: sp.qualification,
        designation: sp.designation,
        departmentId: deptAcademics.id,
        joiningDate: new Date('2021-06-01'),
        baseSalary: sp.salary,
        employmentStatus: 'ACTIVE',
      },
      include: { profile: true },
    });
    createdStaffRecords.push(stf);
  }

  const mainTeacher = createdStaffRecords[0];

  // 7. Staff Assignments (Class Teacher Allocations)
  // Assign mainTeacher as Class 10 Section A Class Teacher
  await prisma.staffAssignment.create({
    data: {
      staffId: mainTeacher.id,
      classId: 'cls_10',
      sectionId: 'sec_10_a',
      subjectId: 'subj_1', // Physics
      roleType: 'CLASS_TEACHER',
    },
  });

  // Assign Sunita Rao as Class 10 Section B Class Teacher
  await prisma.staffAssignment.create({
    data: {
      staffId: createdStaffRecords[2].id,
      classId: 'cls_10',
      sectionId: 'sec_10_b',
      subjectId: 'subj_2', // Math
      roleType: 'CLASS_TEACHER',
    },
  });

  // 8. Seed Student Profiles & Admissions (Class 10 Section A & B)
  const studentSeedData = [
    { code: 'STU_1001', name: 'Rahul Sharma', roll: '101', dob: '2010-08-15', parent: 'Suresh Sharma', phone: '+91 98765 43210' },
    { code: 'STU_1002', name: 'Ananya Verma', roll: '102', dob: '2010-11-20', parent: 'Rakesh Verma', phone: '+91 98765 43211' },
    { code: 'STU_1003', name: 'Vikram Singh', roll: '103', dob: '2010-03-12', parent: 'Mahesh Singh', phone: '+91 98765 43212' },
    { code: 'STU_1004', name: 'Priya Reddy', roll: '104', dob: '2010-07-04', parent: 'Kiran Reddy', phone: '+91 98765 43213' },
    { code: 'STU_1005', name: 'Karthik Nair', roll: '105', dob: '2010-09-25', parent: 'Venugopal Nair', phone: '+91 98765 43214' },
  ];

  const createdStudents = [];
  for (const stData of studentSeedData) {
    const sProf = await prisma.profile.create({
      data: {
        schoolId: school.id,
        email: `${stData.code.toLowerCase()}@school.com`,
        password: '15/08/2010', // DOB format DD/MM/YYYY
        fullName: stData.name,
        role: 'USER',
        phone: stData.phone,
        status: 'ACTIVE',
      },
    });

    const parentObj = await prisma.parent.create({
      data: {
        fullName: stData.parent,
        phone: stData.phone,
        relation: 'Father',
      },
    });

    const student = await prisma.student.create({
      data: {
        schoolId: school.id,
        profileId: sProf.id,
        studentCode: stData.code,
        rollNumber: stData.roll,
        admissionNumber: `ADM_${stData.code.slice(-4)}`,
        dob: new Date(stData.dob),
        gender: 'Male',
        status: 'ACTIVE',
        enrollments: {
          create: {
            classId: 'cls_10',
            sectionId: 'sec_10_a',
            academicYearId: activeYear.id,
            status: 'ACTIVE',
          },
        },
        parents: {
          create: {
            parentId: parentObj.id,
            isPrimary: true,
          },
        },
      },
      include: { profile: true, enrollments: true },
    });
    createdStudents.push(student);
  }

  // 9. Seed Student Attendance Records (Including Previous Day Absentees)
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const pastDate = new Date();
    pastDate.setDate(now.getDate() - i);
    pastDate.setHours(0, 0, 0, 0);

    if (pastDate.getDay() === 0) continue; // Skip Sundays

    for (let sIdx = 0; sIdx < createdStudents.length; sIdx++) {
      const st = createdStudents[sIdx];
      // Mark Ananya Verma (index 1) absent on previous day
      const isAbsent = (i === 1 && sIdx === 1) || (i % 8 === 0 && sIdx === 2);
      const isLate = i % 11 === 0 && !isAbsent;
      const status = isAbsent ? 'ABSENT' : isLate ? 'LATE' : 'PRESENT';

      await prisma.attendance.create({
        data: {
          studentId: st.id,
          classId: 'cls_10',
          sectionId: 'sec_10_a',
          academicYearId: activeYear.id,
          date: pastDate,
          status,
          remarks: status === 'ABSENT' ? 'Sick leave' : 'Regular class session',
          markedBy: mainTeacher.profile.fullName,
        },
      });
    }
  }

  // 10. Seed Invoices & Verified Payments History for Accounts & Super Admin
  const inv1 = await prisma.invoice.create({
    data: {
      id: 'inv_101',
      invoiceNumber: 'INV-100101',
      studentId: createdStudents[0].id, // Rahul Sharma
      academicYearId: activeYear.id,
      feeCategory: 'Tuition Fee, Books Fee',
      subtotal: 20000,
      totalAmount: 20000,
      paidAmount: 20000,
      balanceAmount: 0,
      dueDate: new Date('2026-09-30'),
      status: 'PAID',
    },
  });

  await prisma.payment.create({
    data: {
      transactionNumber: '123456789012',
      invoiceId: inv1.id,
      studentId: createdStudents[0].id,
      provider: 'MANUAL_UPI',
      providerTxId: '123456789012',
      paymentMethod: 'UPI',
      amount: 20000,
      status: 'VERIFIED',
      referenceNote: 'Tuition & Books fee payment via PhonePe UPI',
    },
  });

  const inv2 = await prisma.invoice.create({
    data: {
      id: 'inv_102',
      invoiceNumber: 'INV-100102',
      studentId: createdStudents[1].id, // Ananya Verma
      academicYearId: activeYear.id,
      feeCategory: 'Tuition Fee, Transport Fee',
      subtotal: 15000,
      totalAmount: 15000,
      paidAmount: 0,
      balanceAmount: 15000,
      dueDate: new Date('2026-09-30'),
      status: 'PENDING_APPROVAL',
    },
  });

  await prisma.payment.create({
    data: {
      transactionNumber: '987654321098',
      invoiceId: inv2.id,
      studentId: createdStudents[1].id,
      provider: 'MANUAL_UPI',
      providerTxId: '987654321098',
      paymentMethod: 'UPI',
      amount: 15000,
      status: 'PENDING_VERIFICATION',
      referenceNote: 'Fee payment submitted for approval',
    },
  });

  // 11. Seed Daily Work Updates Feed
  await prisma.dailyWorkUpdate.create({
    data: {
      staffId: mainTeacher.id,
      date: new Date(),
      workSummary: 'Conducted Physics Mechanics Lab experiment for Class 10 Section A and evaluated numerical problem sets.',
      department: 'Academics & Science',
      hoursWorked: 8.0,
      status: 'APPROVED',
    },
  });

  await prisma.dailyWorkUpdate.create({
    data: {
      staffId: createdStaffRecords[2].id, // Sunita Rao
      date: new Date(),
      workSummary: 'Covered Differential Calculus theorems and led interactive problem-solving session for Class 10 Section B.',
      department: 'Academics & Science',
      hoursWorked: 7.5,
      status: 'APPROVED',
    },
  });

  // 12. Seed Leave Requests & Leave Types
  const leaveTypeCL = await prisma.leaveType.create({
    data: { schoolId: school.id, name: 'Casual Leave (CL)', allowedDaysPerYear: 12 },
  });

  await prisma.leaveRequest.create({
    data: {
      staffId: mainTeacher.id,
      leaveTypeId: leaveTypeCL.id,
      startDate: new Date('2026-09-15'),
      endDate: new Date('2026-09-17'),
      daysCount: 3,
      reason: 'Personal family emergency',
      status: 'PENDING',
    },
  });

  await prisma.leaveRequest.create({
    data: {
      staffId: createdStaffRecords[1].id, // Dr. Ramesh
      leaveTypeId: leaveTypeCL.id,
      startDate: new Date('2026-08-10'),
      endDate: new Date('2026-08-12'),
      daysCount: 3,
      reason: 'Attending Academic Physics Seminar',
      status: 'APPROVED',
    },
  });

  // 13. Seed Job Openings & Career Applications for Super Admin
  const job = await prisma.jobOpening.create({
    data: {
      schoolId: school.id,
      title: 'Senior PGT Physics Faculty',
      department: 'Academics',
      description: 'Looking for experienced PGT Physics Faculty to handle Class 11 and 12 CBSE curriculum.',
      requirements: 'M.Sc Physics, B.Ed with minimum 5 years teaching experience.',
      experience: '5+ Years',
      salaryRange: 'Rs. 50,000 - 65,000 / month',
      deadline: new Date('2026-10-31'),
      status: 'OPEN',
    },
  });

  await prisma.careerApplication.create({
    data: {
      jobOpeningId: job.id,
      applicantName: 'Dr. Alok Nath',
      email: 'alok.nath@gmail.com',
      phone: '+91 98111 22233',
      dob: new Date('1988-04-12'),
      qualification: 'Ph.D Physics',
      experience: '7 Years',
      resumeUrl: 'https://example.com/resumes/alok_nath.pdf',
      coverLetter: 'Passionate physics teacher with proven academic excellence.',
      status: 'APPLIED',
    },
  });

  // 14. Seed Audit Logs
  await prisma.auditLog.create({
    data: {
      profileId: pSuper.id,
      userRole: 'SUPER_ADMIN',
      action: 'SYSTEM_INITIALIZATION',
      entity: 'System',
      entityId: school.id,
      newValue: 'Seeded static data for all system roles successfully',
    },
  });

  console.log('Complete static data seeded successfully for ALL ROLES (SUPER_ADMIN, ADMIN, ACCOUNTS, STAFF, USER)!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
