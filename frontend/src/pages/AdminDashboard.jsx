import React, { useEffect, useState } from 'react';
import { api, getUser } from '../lib/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import {
  Users,
  UserPlus,
  UserCheck,
  BookOpen,
  Calendar,
  CheckSquare,
  Clock,
  Search,
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Send,
  ShieldCheck,
  Award,
  Key,
  Info,
} from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [currentUser, setCurrentUser] = useState(null);

  const [students, setStudents] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [academicClasses, setAcademicClasses] = useState([]);
  const [workUpdates, setWorkUpdates] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Student Admissions Form State
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [stuName, setStuName] = useState('');
  const [stuRoll, setStuRoll] = useState('');
  const [stuCode, setStuCode] = useState('');
  const [stuDob, setStuDob] = useState('');
  const [stuParentName, setStuParentName] = useState('');
  const [stuParentPhone, setStuParentPhone] = useState('');
  const [stuAadhar, setStuAadhar] = useState('');
  const [stuClassId, setStuClassId] = useState('');
  const [stuSectionId, setStuSectionId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  // Staff Management Form State
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [stfName, setStfName] = useState('');
  const [stfSubject, setStfSubject] = useState('');
  const [stfEmpCode, setStfEmpCode] = useState('');
  const [stfEmail, setStfEmail] = useState('');
  const [stfPassword, setStfPassword] = useState('');
  const [stfDesignation, setStfDesignation] = useState('Faculty Teacher');
  const [stfSalary, setStfSalary] = useState('45000');
  const [staffSearch, setStaffSearch] = useState('');

  // Academic Setup Allocations State
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [allocationRoleType, setAllocationRoleType] = useState('CLASS_TEACHER');

  // Attendance by student State
  const [attClassId, setAttClassId] = useState('');
  const [attSectionId, setAttSectionId] = useState('');
  const [selectedStudentForAttendance, setSelectedStudentForAttendance] = useState(null);
  const [studentAttendanceData, setStudentAttendanceData] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Admin Daily Work Log Form State
  const [adminWorkSummary, setAdminWorkSummary] = useState('');
  const [adminHoursWorked, setAdminHoursWorked] = useState('8.0');

  // Admin Leave Request Form State
  const [adminLeaveStart, setAdminLeaveStart] = useState('');
  const [adminLeaveEnd, setAdminLeaveEnd] = useState('');
  const [adminLeaveReason, setAdminLeaveReason] = useState('');

  useEffect(() => {
    const saved = getUser();
    if (saved) setCurrentUser(saved);
  }, []);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api('/api/students').then((r) => r.json()),
      api('/api/staff').then((r) => r.json()),
      api('/api/invoices').then((r) => r.json()),
      api('/api/academic/setup').then((r) => r.json()),
      api('/api/work-updates').then((r) => r.json()),
      api('/api/leave').then((r) => r.json()),
    ])
      .then(([stuRes, stfRes, invRes, acadRes, workRes, leaveRes]) => {
        if (stuRes.students) setStudents(stuRes.students);
        if (stfRes.staffMembers) setStaffList(stfRes.staffMembers);
        if (invRes.invoices) setInvoices(invRes.invoices);
        if (acadRes.classes) setAcademicClasses(acadRes.classes);
        if (workRes.workUpdates) setWorkUpdates(workRes.workUpdates);
        if (leaveRes.leaveRequests) setLeaveRequests(leaveRes.leaveRequests);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- ATTENDANCE ANALYTICS FETCH ---
  const fetchStudentAttendanceAnalytics = (student) => {
    setSelectedStudentForAttendance(student);
    setLoadingAttendance(true);
    api(`/api/attendance?studentId=${student.id}`)
      .then((r) => r.json())
      .then((data) => {
        setStudentAttendanceData(data);
        setLoadingAttendance(false);
      })
      .catch(() => setLoadingAttendance(false));
  };

  // --- STUDENT ADMISSIONS HANDLERS ---
  const handleSaveStudent = async (e) => {
    e.preventDefault();
    try {
      const url = editingStudentId ? `/api/students/${editingStudentId}` : '/api/students';
      const method = editingStudentId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: stuName,
          rollNumber: stuRoll,
          studentCode: stuCode,
          dob: stuDob,
          parentName: stuParentName,
          parentPhone: stuParentPhone,
          aadharNumber: stuAadhar,
          classId: stuClassId,
          sectionId: stuSectionId,
          userRole: 'ADMIN',
          profileId: currentUser?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const generatedCode = data.student?.studentCode || stuCode;
        alert(
          editingStudentId
            ? 'Student profile updated successfully!'
            : `Student admitted.\n\nStudent ID: ${generatedCode}\nFirst password: their date of birth, ${data.loginCredentials?.passwordDOB || 'DD/MM/YYYY'}`
        );
        resetStudentForm();
        loadData();
      } else {
        alert(data.error || 'Failed to save student record');
      }
    } catch (err) {
      alert('Error saving student record');
    }
  };

  const handleEditStudent = (st) => {
    setEditingStudentId(st.id);
    setStuName(st.profile?.fullName || '');
    setStuRoll(st.rollNumber || '');
    setStuCode(st.studentCode || '');
    setStuDob(st.dob ? new Date(st.dob).toISOString().split('T')[0] : '');
    setStuParentName(st.parents?.[0]?.parent?.fullName || '');
    setStuParentPhone(st.parents?.[0]?.parent?.phone || st.profile?.phone || '');
    setStuAadhar(st.profile?.phone || '');
    setStuClassId(st.enrollments?.[0]?.classId || '');
    setStuSectionId(st.enrollments?.[0]?.sectionId || '');
  };

  const handleDeleteStudent = async (id) => {
    if (!confirm('Are you sure you want to delete this student record? Their login profile will also be removed.')) return;
    try {
      const res = await api(`/api/students/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userRole: 'ADMIN', profileId: currentUser?.id }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Student profile deleted.');
        loadData();
      }
    } catch (err) {
      alert('Error deleting student');
    }
  };

  const resetStudentForm = () => {
    setEditingStudentId(null);
    setStuName('');
    setStuRoll('');
    setStuCode('');
    setStuDob('');
    setStuParentName('');
    setStuParentPhone('');
    setStuAadhar('');
    setStuClassId('');
    setStuSectionId('');
  };

  // --- STAFF MANAGEMENT HANDLERS ---
  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!editingStaffId && !stfPassword) {
      alert('Please enter a login password for the new staff member.');
      return;
    }
    try {
      const url = editingStaffId ? `/api/staff/${editingStaffId}` : '/api/staff';
      const method = editingStaffId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: stfName,
          email: stfEmail,
          password: stfPassword || 'password123',
          employeeCode: stfEmpCode,
          subject: stfSubject,
          designation: stfDesignation,
          baseSalary: stfSalary,
          userRole: 'ADMIN',
          profileId: currentUser?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(
          editingStaffId
            ? 'Staff member profile & credentials updated successfully!'
            : `Staff member added.\n\nEmail: ${stfEmail}\nGive them the password you just set — it is not shown again.`
        );
        resetStaffForm();
        loadData();
      } else {
        alert(data.error || 'Failed to save staff record');
      }
    } catch (err) {
      alert('Error saving staff record');
    }
  };

  const handleEditStaff = (stf) => {
    setEditingStaffId(stf.id);
    setStfName(stf.profile?.fullName || '');
    setStfEmail(stf.profile?.email || '');
    setStfPassword('');
    setStfEmpCode(stf.employeeCode || '');
    setStfDesignation(stf.designation || 'Faculty Teacher');
    setStfSubject(stf.designation?.replace(' Teacher', '') || 'Science');
    setStfSalary(String(stf.baseSalary || '45000'));
  };

  const handleDeleteStaff = async (id) => {
    if (!confirm('Are you sure you want to delete this staff member? Their login account will be permanently removed.')) return;
    try {
      const res = await api(`/api/staff/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userRole: 'ADMIN', profileId: currentUser?.id }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Staff profile and login account deleted.');
        loadData();
      }
    } catch (err) {
      alert('Error deleting staff');
    }
  };

  const resetStaffForm = () => {
    setEditingStaffId(null);
    setStfName('');
    setStfEmail('');
    setStfPassword('');
    setStfEmpCode('');
    setStfSubject('');
    setStfDesignation('Faculty Teacher');
    setStfSalary('45000');
  };

  // --- ACADEMIC SETUP HANDLERS ---
  const handleAssignTeacher = async (e) => {
    e.preventDefault();
    if (!selectedClassId || !selectedSectionId || !selectedTeacherId) {
      alert('Please select class, section, and teacher.');
      return;
    }
    try {
      const res = await api('/api/academic/assign-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: selectedTeacherId,
          classId: selectedClassId,
          sectionId: selectedSectionId,
          roleType: allocationRoleType,
          userRole: 'ADMIN',
          profileId: currentUser?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Teacher allocated and attendance access granted successfully!');
        loadData();
      }
    } catch (err) {
      alert('Error allocating teacher');
    }
  };

  const handleGrantAttendancePermission = async (staffId, classId, sectionId) => {
    try {
      const res = await api('/api/academic/grant-permission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId,
          classId,
          sectionId,
          hoursValid: 24,
          userRole: 'ADMIN',
          profileId: currentUser?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('24-Hour attendance posting access granted to teacher!');
        loadData();
      }
    } catch (err) {
      alert('Error granting permission');
    }
  };

  // --- ADMIN POST WORK LOG HANDLER ---
  const handlePostAdminWorkLog = async (e) => {
    e.preventDefault();
    try {
      const res = await api('/api/work-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: currentUser?.staffId || staffList[0]?.id,
          workSummary: `[ADMIN LOG] ${adminWorkSummary}`,
          department: 'Administration',
          hoursWorked: adminHoursWorked,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Admin daily work update posted successfully!');
        setAdminWorkSummary('');
        loadData();
      }
    } catch (err) {
      alert('Error posting work update');
    }
  };

  // --- ADMIN LEAVE APPLICATION HANDLER ---
  const handleApplyAdminLeave = async (e) => {
    e.preventDefault();
    if (!currentUser?.staffId && staffList.length === 0) {
      alert('No staff ID associated for admin leave request.');
      return;
    }
    try {
      const res = await api('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: currentUser?.staffId || staffList[0]?.id,
          startDate: adminLeaveStart,
          endDate: adminLeaveEnd,
          reason: `[ADMIN LEAVE] ${adminLeaveReason}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Admin leave request submitted! It will appear in the Super Admin Panel for approval.');
        setAdminLeaveStart('');
        setAdminLeaveEnd('');
        setAdminLeaveReason('');
        loadData();
      }
    } catch (err) {
      alert('Error submitting admin leave');
    }
  };

  const handleLeaveDecision = async (leaveRequestId, decisionStatus) => {
    try {
      const res = await api('/api/leave', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveRequestId,
          status: decisionStatus,
          userRole: 'ADMIN',
          profileId: currentUser?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Leave request ${decisionStatus.toLowerCase()}!`);
        loadData();
      }
    } catch (err) {
      alert('Error updating leave');
    }
  };

  const filteredStudents = students.filter(
    (st) =>
      !studentSearch ||
      st.profile?.fullName?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      st.studentCode?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const filteredStaff = staffList.filter(
    (stf) =>
      !staffSearch ||
      stf.profile?.fullName?.toLowerCase().includes(staffSearch.toLowerCase()) ||
      stf.employeeCode?.toLowerCase().includes(staffSearch.toLowerCase()) ||
      stf.profile?.email?.toLowerCase().includes(staffSearch.toLowerCase())
  );

  const classSectionStudents = students.filter((st) => {
    const enrollment = st.enrollments?.[0];
    const matchesClass = !attClassId || enrollment?.classId === attClassId;
    const matchesSection = !attSectionId || enrollment?.sectionId === attSectionId;
    return matchesClass && matchesSection;
  });

  const availableSections = academicClasses.find((c) => c.id === selectedClassId)?.sections || [];

  return (
    <div className="min-h-screen bg-paper flex flex-col font-sans">
      <Header userRole="ADMIN" userName={currentUser?.fullName || 'School Administrator'} />

      <div className="flex flex-1">
        <Sidebar role="ADMIN" activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-8 overflow-y-auto space-y-8">
          {/* DASHBOARD TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-sheet p-6 border border-rule space-y-4">
                <div className="flex justify-between items-center border-b border-rule-soft pb-3">
                  <div>
                    <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                      <CreditCard className="w-5 h-5 text-copy" />
                      <span>Recent fee payments</span>
                    </h2>
                    <p className="text-xs text-ink-soft">The most recent invoices and where each one stands.</p>
                  </div>
                  <button
                    onClick={loadData}
                    className="bg-ink hover:bg-copy-deep text-white px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer"
                  >
                    Refresh
                  </button>
                </div>

                <div className="register-scroll">
                  <table className="register">
                    <thead>
                      <tr>
                        <th>Invoice No</th>
                        <th>Student Name (Code)</th>
                        <th>Category</th>
                        <th>Total Amount</th>
                        <th>Paid Amount</th>
                        <th>Tx Ref ID</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rule-soft font-medium text-ink">
                      {invoices.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-ink-faint text-xs">
                            No recent invoices issued or received.
                          </td>
                        </tr>
                      ) : (
                        invoices.slice(0, 10).map((inv) => {
                          const tx = inv.payments?.[0]?.transactionNumber || 'N/A';
                          return (
                            <tr key={inv.id} className="hover:bg-manila/25">
                              <td className="font-mono text-xs font-medium text-copy">{inv.invoiceNumber}</td>
                              <td>
                                <div className="font-medium text-ink">{inv.student?.profile?.fullName || 'Student'}</div>
                                <div className="text-[10px] text-ink-soft font-mono">{inv.student?.studentCode}</div>
                              </td>
                              <td className="text-xs text-ink-soft">{inv.feeCategory}</td>
                              <td className="text-xs font-medium text-ink">
                                Rs. {inv.totalAmount.toLocaleString('en-IN')}
                              </td>
                              <td className="text-xs font-medium text-copy">
                                Rs. {inv.paidAmount.toLocaleString('en-IN')}
                              </td>
                              <td className="font-mono text-xs text-ink-soft">{tx}</td>
                              <td>
                                <span
                                  className={`mark ${
                                    inv.status === 'PAID'
                                      ? 'bg-paid-wash text-paid'
                                      : inv.status === 'PARTIALLY_PAID'
                                      ? 'bg-hold-wash text-hold'
                                      : 'bg-due-wash text-due'
                                  }`}
                                >
                                  {String(inv.status).replace(/_/g, " ")}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STUDENT ADMISSIONS TAB */}
          {activeTab === 'students' && (
            <div className="bg-sheet p-6 border border-rule space-y-6">
              <div className="flex justify-between items-center border-b border-rule-soft pb-4">
                <div>
                  <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                    <UserPlus className="w-5 h-5 text-copy" />
                    <span>Admit a student</span>
                  </h2>
                  <p className="text-xs text-ink-soft">
                    Admit students with DOB. Student login credentials are automatically set to: <strong>Student ID</strong> & <strong>DOB (DD/MM/YYYY)</strong>.
                  </p>
                </div>
                {editingStudentId && (
                  <button
                    onClick={resetStudentForm}
                    className="bg-manila/50 hover:bg-manila text-ink text-xs font-medium px-3 py-1.5"
                  >
                    Cancel Editing
                  </button>
                )}
              </div>

              {/* Form Container */}
              <form onSubmit={handleSaveStudent} className="bg-paper p-5 border border-rule space-y-4">
                <div className="flex items-center space-x-2 text-xs text-teal-900 bg-copy-wash border border-copy/25 p-3 font-medium">
                  <Info className="w-4 h-4 text-copy shrink-0" />
                  <span>
                    <strong>Student Login Notice:</strong> Students log in using their <strong>Student Code / ID</strong> (e.g. <code>STU_1001</code>) and password set as their <strong>DOB</strong> in <code>DD/MM/YYYY</code> format. No email required!
                  </span>
                </div>

                <h3 className="text-xs font-medium text-ink uppercase tracking-wider">
                  {editingStudentId ? 'Edit Student Details' : 'New Student Admission Entry'}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">Student Full Name *</label>
                    <input
                      type="text"
                      required
                      value={stuName}
                      onChange={(e) => setStuName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">Date of Birth (DOB) *</label>
                    <input
                      type="date"
                      required
                      value={stuDob}
                      onChange={(e) => setStuDob(e.target.value)}
                      className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">Roll No *</label>
                    <input
                      type="text"
                      required
                      value={stuRoll}
                      onChange={(e) => setStuRoll(e.target.value)}
                      placeholder="e.g. 101"
                      className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">Student Code / ID</label>
                    <input
                      type="text"
                      value={stuCode}
                      onChange={(e) => setStuCode(e.target.value)}
                      placeholder="Auto-generated (e.g. STU_1001)"
                      className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">Parent / Guardian Name</label>
                    <input
                      type="text"
                      value={stuParentName}
                      onChange={(e) => setStuParentName(e.target.value)}
                      placeholder="e.g. Suresh Sharma"
                      className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">Parent Mobile Number</label>
                    <input
                      type="tel"
                      value={stuParentPhone}
                      onChange={(e) => setStuParentPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">Aadhar Number</label>
                    <input
                      type="text"
                      value={stuAadhar}
                      onChange={(e) => setStuAadhar(e.target.value)}
                      placeholder="e.g. 1234-5678-9012"
                      className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">Class Selection *</label>
                    <select
                      required
                      value={stuClassId}
                      onChange={(e) => setStuClassId(e.target.value)}
                      className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Select Class --</option>
                      {academicClasses.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">Section Selection *</label>
                    <select
                      required
                      value={stuSectionId}
                      onChange={(e) => setStuSectionId(e.target.value)}
                      className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Select Section --</option>
                      {(academicClasses.find((c) => c.id === stuClassId)?.sections || [
                        { id: 'sec_a', name: 'A' },
                        { id: 'sec_b', name: 'B' },
                      ]).map((sec) => (
                        <option key={sec.id} value={sec.id}>Section {sec.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="bg-copy hover:bg-copy-deep text-white font-medium px-5 py-2.5 text-xs transition-all cursor-pointer"
                >
                  {editingStudentId ? 'Update Student Profile' : 'Admit Student & Generate Credentials'}
                </button>
              </form>

              {/* Roster Table */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-medium text-ink uppercase tracking-wider">Admitted Students Directory</h3>
                  <div className="relative w-64">
                    <Search className="w-4 h-4 text-ink-faint absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search student code or name..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-paper border border-rule text-xs"
                    />
                  </div>
                </div>

                <div className="register-scroll">
                  <table className="register">
                    <thead>
                      <tr>
                        <th>Student Login ID</th>
                        <th>Name</th>
                        <th>Date of birth</th>
                        <th>Roll No</th>
                        <th>Class & Section</th>
                        <th>Parent Contact</th>
                        <th className="num">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rule-soft font-medium text-ink">
                      {filteredStudents.map((st) => {
                        const dobFormatted = st.dob ? new Date(st.dob).toLocaleDateString('en-GB') : '15/08/2010';
                        return (
                          <tr key={st.id} className="hover:bg-manila/25">
                            <td className="font-mono text-xs font-medium text-copy">{st.studentCode}</td>
                            <td className="font-medium text-ink">{st.profile?.fullName}</td>
                            <td className="font-mono text-xs font-medium text-ink">{dobFormatted}</td>
                            <td className="text-xs text-ink-soft">{st.rollNumber}</td>
                            <td className="text-xs font-semibold text-ink">
                              {st.enrollments?.[0]?.class?.name || 'Class 10'}-{st.enrollments?.[0]?.section?.name || 'A'}
                            </td>
                            <td className="text-xs text-ink-soft">
                              {st.parents?.[0]?.parent?.fullName || 'Parent'} ({st.parents?.[0]?.parent?.phone || st.profile?.phone || 'N/A'})
                            </td>
                            <td className="text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handleEditStudent(st)}
                                  className="bg-copy-wash hover:bg-copy-wash text-copy px-2.5 py-1 text-xs font-medium cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5 inline mr-1" /> Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteStudent(st.id)}
                                  className="bg-due-wash hover:bg-due-wash text-due px-2.5 py-1 text-xs font-medium cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 inline mr-1" /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STAFF MANAGEMENT TAB */}
          {activeTab === 'staff' && (
            <div className="bg-sheet p-6 border border-rule space-y-6">
              <div className="flex justify-between items-center border-b border-rule-soft pb-4">
                <div>
                  <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                    <UserCheck className="w-5 h-5 text-copy" />
                    <span>Staff Management</span>
                  </h2>
                  <p className="text-xs text-ink-soft">
                    Add new staff members with login credentials (Email & Password), edit details, or delete staff profiles.
                  </p>
                </div>
                {editingStaffId && (
                  <button
                    onClick={resetStaffForm}
                    className="bg-manila/50 hover:bg-manila text-ink text-xs font-medium px-3 py-1.5"
                  >
                    Cancel Editing
                  </button>
                )}
              </div>

              {/* Staff Form */}
              <form onSubmit={handleSaveStaff} className="bg-paper p-5 border border-rule space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium text-ink uppercase tracking-wider flex items-center space-x-1.5">
                    <Key className="w-4 h-4 text-copy" />
                    <span>{editingStaffId ? 'Edit Staff Profile & Credentials' : 'Add New Staff Member with Login Credentials'}</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={stfName}
                      onChange={(e) => setStfName(e.target.value)}
                      placeholder="e.g. Dr. Ramesh Kumar"
                      className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">Login Email ID *</label>
                    <input
                      type="email"
                      required
                      value={stfEmail}
                      onChange={(e) => setStfEmail(e.target.value)}
                      placeholder="e.g. ramesh@school.com"
                      className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">
                      Password {editingStaffId ? '(leave empty to keep the current one)' : '*'}
                    </label>
                    <input
                      type="password"
                      required={!editingStaffId}
                      value={stfPassword}
                      onChange={(e) => setStfPassword(e.target.value)}
                      placeholder={editingStaffId ? 'Leave blank to preserve password' : 'Assign login password'}
                      className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">Employee ID / Code</label>
                    <input
                      type="text"
                      value={stfEmpCode}
                      onChange={(e) => setStfEmpCode(e.target.value)}
                      placeholder="Auto-generated if empty"
                      className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">Subject</label>
                    <input
                      type="text"
                      value={stfSubject}
                      onChange={(e) => setStfSubject(e.target.value)}
                      placeholder="e.g. Physics PGT"
                      className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">Designation</label>
                    <input
                      type="text"
                      value={stfDesignation}
                      onChange={(e) => setStfDesignation(e.target.value)}
                      placeholder="e.g. Senior Faculty Teacher"
                      className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="bg-copy hover:bg-copy-deep text-white font-medium px-5 py-2.5 text-xs transition-all cursor-pointer flex items-center space-x-2"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{editingStaffId ? 'Update Staff Account' : 'Create Staff Member with Login Credentials'}</span>
                </button>
              </form>

              {/* Staff Directory Table */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-medium text-ink uppercase tracking-wider">Active Staff Members & Login Accounts</h3>
                  <div className="relative w-64">
                    <Search className="w-4 h-4 text-ink-faint absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search staff by name/email/ID..."
                      value={staffSearch}
                      onChange={(e) => setStaffSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-paper border border-rule text-xs"
                    />
                  </div>
                </div>

                <div className="register-scroll">
                  <table className="register">
                    <thead>
                      <tr>
                        <th>Emp Code</th>
                        <th>Name</th>
                        <th>Staff Login Email</th>
                        <th>Designation</th>
                        <th>Joining Date</th>
                        <th className="num">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rule-soft font-medium text-ink">
                      {filteredStaff.map((stf) => (
                        <tr key={stf.id} className="hover:bg-manila/25">
                          <td className="font-mono text-xs font-medium text-copy">{stf.employeeCode}</td>
                          <td className="font-medium text-ink">{stf.profile?.fullName}</td>
                          <td className="text-xs font-mono font-medium text-ink">
                            {stf.profile?.email}
                          </td>
                          <td className="text-xs text-ink">{stf.designation}</td>
                          <td className="text-xs text-ink-soft">{new Date(stf.joiningDate).toLocaleDateString()}</td>
                          <td className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleEditStaff(stf)}
                                className="bg-copy-wash hover:bg-copy-wash text-copy px-2.5 py-1 text-xs font-medium cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5 inline mr-1" /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteStaff(stf.id)}
                                className="bg-due-wash hover:bg-due-wash text-due px-2.5 py-1 text-xs font-medium cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 inline mr-1" /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ACADEMIC SETUP TAB */}
          {activeTab === 'academic' && (
            <div className="bg-sheet p-6 border border-rule space-y-6">
              <div className="border-b border-rule-soft pb-4">
                <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-copy" />
                  <span>Classes and class teachers</span>
                </h2>
                <p className="text-xs text-ink-soft">
                  Allocate Class Teachers & Subject Teachers and grant 1-click attendance posting permission
                </p>
              </div>

              {/* Allocation Form */}
              <form onSubmit={handleAssignTeacher} className="bg-paper p-5 border border-rule space-y-4">
                <h3 className="text-xs font-medium text-ink uppercase tracking-wider">Teacher Allocation & Permission Grant</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">Class *</label>
                    <select
                      required
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Select Class --</option>
                      {academicClasses.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">Section *</label>
                    <select
                      required
                      value={selectedSectionId}
                      onChange={(e) => setSelectedSectionId(e.target.value)}
                      className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Select Section --</option>
                      {availableSections.map((sec) => (
                        <option key={sec.id} value={sec.id}>Section {sec.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">Faculty Member *</label>
                    <select
                      required
                      value={selectedTeacherId}
                      onChange={(e) => setSelectedTeacherId(e.target.value)}
                      className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Select Teacher --</option>
                      {staffList.map((stf) => (
                        <option key={stf.id} value={stf.id}>
                          {stf.profile?.fullName} ({stf.designation})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">Role Type</label>
                    <select
                      value={allocationRoleType}
                      onChange={(e) => setAllocationRoleType(e.target.value)}
                      className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none cursor-pointer"
                    >
                      <option value="CLASS_TEACHER">Class Teacher</option>
                      <option value="SUBJECT_TEACHER">Subject Teacher</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="bg-ink hover:bg-copy-deep text-white font-medium px-5 py-2.5 text-xs cursor-pointer transition-all"
                >
                  Allocate Teacher & Grant Access
                </button>
              </form>

              {/* Classes & Teacher Allocations List */}
              <div className="space-y-4">
                <h3 className="text-xs font-medium text-ink uppercase tracking-wider">Current Class Allocations & Attendance Access</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {academicClasses.map((cls) => (
                    <div key={cls.id} className="p-5 border border-rule bg-sheet space-y-3">
                      <h4 className="font-medium text-ink text-base">{cls.name}</h4>
                      <div className="space-y-2">
                        {cls.sections.map((sec) => {
                          const assignment = cls.staffAssignments?.find((a) => a.sectionId === sec.id);
                          return (
                            <div key={sec.id} className="bg-paper p-3 border border-rule flex items-center justify-between text-xs">
                              <div>
                                <span className="font-medium text-ink">Section {sec.name}</span>
                                <div className="text-ink-soft mt-0.5">
                                  Class Teacher: <strong>{assignment?.staff?.profile?.fullName || 'Not Allocated'}</strong>
                                </div>
                              </div>

                              <button
                                onClick={() => handleGrantAttendancePermission(assignment?.staffId || staffList[0]?.id, cls.id, sec.id)}
                                className="bg-copy-wash hover:bg-copy-wash text-copy border border-copy/25 px-3 py-1 text-xs font-medium cursor-pointer"
                              >
                                Grant Attendance Access
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ATTENDANCE RECORDS TAB - FILTER CLASS & SECTION -> SHOWCASE STUDENT PROFILES -> MONTHLY & START-TILL-DATE STATS */}
          {activeTab === 'attendance' && (
            <div className="bg-sheet p-6 border border-rule space-y-6">
              <div className="border-b border-rule-soft pb-4 flex justify-between items-center">
                <div>
                  <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-copy" />
                    <span>Attendance by student</span>
                  </h2>
                  <p className="text-xs text-ink-soft">
                    Filter by Class and Section to showcase allocated student profiles, then inspect monthly and overall start-to-date attendance.
                  </p>
                </div>
                {selectedStudentForAttendance && (
                  <button
                    onClick={() => {
                      setSelectedStudentForAttendance(null);
                      setStudentAttendanceData(null);
                    }}
                    className="bg-manila/50 hover:bg-manila text-ink text-xs font-medium px-3 py-1.5 cursor-pointer"
                  >
                    ← Back to Class Roster
                  </button>
                )}
              </div>

              {/* Step 1: Class & Section Filters */}
              <div className="bg-paper p-4 border border-rule grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Select Class *</label>
                  <select
                    value={attClassId}
                    onChange={(e) => {
                      setAttClassId(e.target.value);
                      setAttSectionId('');
                      setSelectedStudentForAttendance(null);
                      setStudentAttendanceData(null);
                    }}
                    className="w-full px-3.5 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none bg-sheet font-medium cursor-pointer"
                  >
                    <option value="">-- Select Class --</option>
                    {academicClasses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Select Section *</label>
                  <select
                    value={attSectionId}
                    onChange={(e) => {
                      setAttSectionId(e.target.value);
                      setSelectedStudentForAttendance(null);
                      setStudentAttendanceData(null);
                    }}
                    className="w-full px-3.5 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none bg-sheet font-medium cursor-pointer"
                  >
                    <option value="">-- Select Section --</option>
                    {(academicClasses.find((c) => c.id === attClassId)?.sections || [
                      { id: 'sec_a', name: 'A' },
                      { id: 'sec_b', name: 'B' },
                    ]).map((sec) => (
                      <option key={sec.id} value={sec.id}>Section {sec.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Step 2: Roster Showcase for Selected Class & Section */}
              {!selectedStudentForAttendance ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-medium text-ink uppercase tracking-wider">
                      Allocated Student Profiles ({classSectionStudents.length} Students)
                    </h3>
                    <span className="text-xs text-ink-soft font-medium">
                      Select a student profile below to view monthly & overall attendance analytics
                    </span>
                  </div>

                  {classSectionStudents.length === 0 ? (
                    <div className="text-center py-10 bg-paper border border-rule text-ink-faint text-xs">
                      No students allocated to the selected Class & Section. Please select a Class & Section above.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {classSectionStudents.map((st) => (
                        <div
                          key={st.id}
                          onClick={() => fetchStudentAttendanceAnalytics(st)}
                          className="bg-paper hover:bg-copy-wash/50 p-4 border border-rule hover:border-copy transition-all cursor-pointer space-y-2 group hover:"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-ink text-sm group-hover:text-copy transition-colors">
                                {st.profile?.fullName}
                              </h4>
                              <div className="text-[11px] font-mono text-ink-soft">{st.studentCode}</div>
                            </div>
                            <span className="bg-paid-wash text-paid text-[10px] font-medium px-2 py-0.5">
                              Roll #{st.rollNumber}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-ink-soft pt-2 border-t border-rule/60">
                            <span>Class: <strong>{st.enrollments?.[0]?.class?.name || 'Class 10'}-{st.enrollments?.[0]?.section?.name || 'A'}</strong></span>
                            <span className="text-copy font-medium group-hover:underline">View Analytics →</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Step 3: Selected Student Attendance Analytics Showcase */
                <div className="space-y-6">
                  {/* Selected Profile Header */}
                  <div className="bg-ink text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <span className="text-copy text-xs font-mono font-medium uppercase tracking-wider">
                        {selectedStudentForAttendance.studentCode} • Roll #{selectedStudentForAttendance.rollNumber}
                      </span>
                      <h3 className="text-xl font-semibold text-white mt-1">
                        {selectedStudentForAttendance.profile?.fullName}
                      </h3>
                      <p className="text-xs text-ink-faint mt-1">
                        Allocated to {selectedStudentForAttendance.enrollments?.[0]?.class?.name || 'Class 10'}-Section {selectedStudentForAttendance.enrollments?.[0]?.section?.name || 'A'}
                      </p>
                    </div>

                    <div className="flex items-center space-x-4 bg-ink p-4 border border-teal-500/30">
                      <div className="text-center">
                        <div className="text-[10px] text-copy uppercase font-medium">Overall Attendance</div>
                        <div className="text-2xl font-semibold text-copy">
                          {studentAttendanceData?.startToDateStats?.overallPercentage || 100}%
                        </div>
                      </div>
                      <div className="h-8 w-px bg-slate-600"></div>
                      <div className="text-center">
                        <div className="text-[10px] text-copy uppercase font-medium">Session Working Days</div>
                        <div className="text-2xl font-semibold text-white">
                          {studentAttendanceData?.startToDateStats?.totalDays || 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Start-to-Date Overall Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-copy-wash border border-copy/25 p-4">
                      <div className="text-xs font-medium text-copy-deep uppercase tracking-wider">Days Present</div>
                      <div className="text-2xl font-semibold text-copy mt-1">
                        {studentAttendanceData?.startToDateStats?.presentDays || 0}
                      </div>
                      <div className="text-[10px] text-ink-soft mt-1">From starting date till today</div>
                    </div>

                    <div className="bg-due-wash border border-due/25 p-4">
                      <div className="text-xs font-medium text-due uppercase tracking-wider">Days Absent</div>
                      <div className="text-2xl font-semibold text-due mt-1">
                        {studentAttendanceData?.startToDateStats?.absentDays || 0}
                      </div>
                      <div className="text-[10px] text-ink-soft mt-1">Unexcused leaves</div>
                    </div>

                    <div className="bg-hold-wash border border-hold/25 p-4">
                      <div className="text-xs font-medium text-hold uppercase tracking-wider">Days Late</div>
                      <div className="text-2xl font-semibold text-hold mt-1">
                        {studentAttendanceData?.startToDateStats?.lateDays || 0}
                      </div>
                      <div className="text-[10px] text-ink-soft mt-1">Partial credit sessions</div>
                    </div>

                    <div className="bg-paper border border-rule p-4">
                      <div className="text-xs font-medium text-ink uppercase tracking-wider">Date Span</div>
                      <div className="text-xs font-medium text-ink mt-2 font-mono">
                        Start Date → Today
                      </div>
                      <div className="text-[10px] text-ink-soft mt-1">Till Date Roster Analysis</div>
                    </div>
                  </div>

                  {/* Monthly Attendance Breakdown */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-medium text-ink uppercase tracking-wider">Monthly Attendance Breakdown</h4>
                    <div className="register-scroll">
                      <table className="register">
                        <thead>
                          <tr>
                            <th>Month</th>
                            <th>Total Days</th>
                            <th>Days Present</th>
                            <th>Days Absent</th>
                            <th>Days Late</th>
                            <th>Monthly Attendance %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rule-soft font-medium text-ink">
                          {studentAttendanceData?.monthlyStats?.map((m) => (
                            <tr key={m.month} className="hover:bg-manila/25">
                              <td className="font-medium text-ink">{m.month}</td>
                              <td className="text-xs text-ink-soft">{m.total} Days</td>
                              <td className="text-xs font-medium text-copy">{m.present} Days</td>
                              <td className="text-xs font-medium text-due">{m.absent} Days</td>
                              <td className="text-xs font-medium text-hold">{m.late} Days</td>
                              <td>
                                <span className="bg-paid-wash text-paid font-medium px-2.5 py-1 text-xs">
                                  {m.percentage}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Daily Attendance History Timeline */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-medium text-ink uppercase tracking-wider">Daily Attendance History Log</h4>
                    <div className="register-scroll">
                      <table className="register">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Class & Section</th>
                            <th>Status</th>
                            <th>Marked By</th>
                            <th>Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rule-soft font-medium text-ink">
                          {studentAttendanceData?.attendances?.map((rec) => (
                            <tr key={rec.id} className="hover:bg-manila/25">
                              <td className="font-mono text-xs font-medium text-ink">
                                {new Date(rec.date).toLocaleDateString('en-GB')}
                              </td>
                              <td className="text-xs text-ink-soft">
                                {rec.class?.name || 'Class 10'}-{rec.section?.name || 'A'}
                              </td>
                              <td>
                                <span
                                  className={`mark ${
                                    rec.status === 'PRESENT'
                                      ? 'bg-paid-wash text-paid'
                                      : rec.status === 'ABSENT'
                                      ? 'bg-due-wash text-due'
                                      : 'bg-hold-wash text-hold'
                                  }`}
                                >
                                  {String(rec.status).replace(/_/g, " ")}
                                </span>
                              </td>
                              <td className="text-xs text-ink-soft">{rec.markedBy || 'Teacher'}</td>
                              <td className="text-xs text-ink-soft">{rec.remarks || 'Regular Session'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DAILY WORK LOGS TAB */}
          {activeTab === 'work' && (
            <div className="bg-sheet p-6 border border-rule space-y-6">
              <div className="border-b border-rule-soft pb-4">
                <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                  <CheckSquare className="w-5 h-5 text-copy" />
                  <span>Daily work logs</span>
                </h2>
                <p className="text-xs text-ink-soft">Staff work logs, and your own.</p>
              </div>

              {/* Admin Post Daily Work Log Form */}
              <form onSubmit={handlePostAdminWorkLog} className="bg-paper p-5 border border-rule space-y-3">
                <h3 className="text-xs font-medium text-ink uppercase tracking-wider">Post Admin Daily Work Log</h3>
                <textarea
                  rows={2}
                  required
                  value={adminWorkSummary}
                  onChange={(e) => setAdminWorkSummary(e.target.value)}
                  placeholder="Enter details of operational tasks accomplished today..."
                  className="w-full px-3.5 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none"
                ></textarea>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-ink-soft font-medium">Hours Worked:</span>
                    <input
                      type="number"
                      step="0.5"
                      value={adminHoursWorked}
                      onChange={(e) => setAdminHoursWorked(e.target.value)}
                      className="w-20 px-2 py-1 border border-rule text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-copy hover:bg-copy-deep text-white px-4 py-2 text-xs font-medium cursor-pointer"
                  >
                    Post Admin Work Update
                  </button>
                </div>
              </form>

              {/* Staff Work Logs Directory */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-ink uppercase tracking-wider">Submitted Work Updates Showcase</h3>
                {workUpdates.length === 0 ? (
                  <div className="text-center py-8 text-ink-faint text-xs bg-paper">
                    No work updates recorded yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {workUpdates.map((w) => (
                      <div key={w.id} className="p-4 border border-rule bg-paper space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-ink text-sm">{w.staff?.profile?.fullName || 'Staff Member'}</h4>
                            <p className="text-xs text-ink-soft">{w.staff?.designation || w.department}</p>
                          </div>
                          <span className="text-xs font-mono text-copy font-medium">
                            {new Date(w.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-ink bg-sheet p-3 border border-rule">
                          {w.workSummary}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LEAVE APPROVALS TAB */}
          {activeTab === 'leave' && (
            <div className="bg-sheet p-6 border border-rule space-y-6">
              <div className="border-b border-rule-soft pb-4">
                <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-copy" />
                  <span>Leave requests</span>
                </h2>
                <p className="text-xs text-ink-soft">Approve staff leave, or request leave of your own.</p>
              </div>

              {/* Admin Leave Request Form */}
              <form onSubmit={handleApplyAdminLeave} className="bg-paper p-5 border border-rule space-y-4">
                <h3 className="text-xs font-medium text-ink uppercase tracking-wider">
                  Apply for Admin Leave (Routes to Super Admin Panel)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={adminLeaveStart}
                      onChange={(e) => setAdminLeaveStart(e.target.value)}
                      className="w-full px-3 py-2 border border-rule text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">End Date *</label>
                    <input
                      type="date"
                      required
                      value={adminLeaveEnd}
                      onChange={(e) => setAdminLeaveEnd(e.target.value)}
                      className="w-full px-3 py-2 border border-rule text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">Reason *</label>
                    <input
                      type="text"
                      required
                      value={adminLeaveReason}
                      onChange={(e) => setAdminLeaveReason(e.target.value)}
                      placeholder="e.g. Official Duty / Personal Leave"
                      className="w-full px-3 py-2 border border-rule text-xs"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-ink hover:bg-copy-deep text-white px-5 py-2.5 text-xs font-medium cursor-pointer"
                >
                  Submit Leave Request to Super Admin
                </button>
              </form>

              {/* Staff Leave Applications Table */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-ink uppercase tracking-wider">Staff Leave Applications</h3>
                {leaveRequests.length === 0 ? (
                  <div className="text-center py-8 text-ink-faint text-xs bg-paper">
                    No leave requests submitted.
                  </div>
                ) : (
                  <div className="register-scroll">
                    <table className="register">
                      <thead>
                        <tr>
                          <th>Staff Member</th>
                          <th>Dates & Duration</th>
                          <th>Reason</th>
                          <th>Status</th>
                          <th className="num">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rule-soft font-medium text-ink">
                        {leaveRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-manila/25">
                            <td>
                              <div className="font-medium text-ink">{req.staff?.profile?.fullName || 'Staff'}</div>
                              <div className="text-[10px] text-ink-soft">{req.staff?.designation}</div>
                            </td>
                            <td className="text-xs font-mono">
                              {new Date(req.startDate).toLocaleDateString()} to {new Date(req.endDate).toLocaleDateString()}
                            </td>
                            <td className="text-xs text-ink-soft">{req.reason}</td>
                            <td>
                              <span
                                className={`mark ${
                                  req.status === 'APPROVED'
                                    ? 'bg-paid-wash text-paid'
                                    : req.status === 'REJECTED'
                                    ? 'bg-due-wash text-due'
                                    : 'bg-hold-wash text-hold'
                                }`}
                              >
                                {String(req.status).replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="text-right">
                              {req.status === 'PENDING' ? (
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    onClick={() => handleLeaveDecision(req.id, 'APPROVED')}
                                    className="bg-copy hover:bg-copy-deep text-white px-3 py-1.5 text-xs font-medium"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleLeaveDecision(req.id, 'REJECTED')}
                                    className="bg-rose-600 hover:bg-due-wash0 text-white px-3 py-1.5 text-xs font-medium"
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-ink-faint">Processed</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
