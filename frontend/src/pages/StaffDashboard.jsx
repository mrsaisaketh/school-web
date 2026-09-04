import React, { useEffect, useState } from 'react';
import { api, getUser } from '../lib/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import {
  UserCheck,
  Calendar,
  CheckSquare,
  Clock,
  Send,
  Users,
  Search,
  Key,
  ShieldCheck,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  BookOpen,
} from 'lucide-react';

export default function StaffDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [currentUser, setCurrentUser] = useState(null);

  // Collections Data
  const [staffRecord, setStaffRecord] = useState(null);
  const [students, setStudents] = useState([]);
  const [academicClasses, setAcademicClasses] = useState([]);
  const [myWorkLogs, setMyWorkLogs] = useState([]);
  const [myLeaveRequests, setMyLeaveRequests] = useState([]);
  const [previousDayAbsents, setPreviousDayAbsents] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- DASHBOARD DAILY WORK FORM (TODAY ONLY) ---
  const [dailySummary, setDailySummary] = useState('');
  const [dailyHours, setDailyHours] = useState('8.0');
  const [postingWork, setPostingWork] = useState(false);

  // --- MY PROFILE CHANGE PASSWORD STATE ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // --- CLASS STUDENTS FILTER & SELECTION ---
  const [stuClassId, setStuClassId] = useState('');
  const [stuSectionId, setStuSectionId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  // --- MARK ATTENDANCE STATE (CLASS TEACHERS ONLY) ---
  const [absentStudentIds, setAbsentStudentIds] = useState({});
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [submittingAttendance, setSubmittingAttendance] = useState(false);

  // --- LEAVE REQUEST FORM STATE ---
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  useEffect(() => {
    const saved = getUser();
    if (saved) setCurrentUser(saved);
  }, []);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api('/api/staff').then((r) => r.json()),
      api('/api/students').then((r) => r.json()),
      api('/api/academic/setup').then((r) => r.json()),
      api('/api/work-updates').then((r) => r.json()),
      api(`/api/leave?email=${encodeURIComponent(currentUser?.email || '')}`).then((r) => r.json()),
    ])
      .then(([stfRes, stuRes, acadRes, workRes, leaveRes]) => {
        if (stfRes.staffMembers && currentUser) {
          const myRec =
            stfRes.staffMembers.find(
              (s) => s.profileId === currentUser.id || s.profile?.email === currentUser.email
            ) || stfRes.staffMembers[0];
          setStaffRecord(myRec);
        }
        if (stuRes.students) setStudents(stuRes.students);
        if (acadRes.classes) setAcademicClasses(acadRes.classes);
        if (workRes.workUpdates) setMyWorkLogs(workRes.workUpdates);
        if (leaveRes.leaveRequests) setMyLeaveRequests(leaveRes.leaveRequests);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  // Check Class Teacher Assignment
  const classTeacherAssignment = staffRecord?.assignments?.find((a) => a.roleType === 'CLASS_TEACHER');
  const isClassTeacher = Boolean(classTeacherAssignment);

  // Class & Section details for class teacher
  const assignedClassId = classTeacherAssignment?.classId || 'cls_1';
  const assignedSectionId = classTeacherAssignment?.sectionId || 'sec_1';
  const assignedClassName = classTeacherAssignment?.class?.name || 'Class 10';
  const assignedSectionName = classTeacherAssignment?.section?.name || 'A';

  // Load Absent yesterday for Class Teacher
  useEffect(() => {
    if (isClassTeacher) {
      api(`/api/attendance?classId=${assignedClassId}&sectionId=${assignedSectionId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.attendances) {
            // Find absent records from previous dates
            const absents = d.attendances.filter((a) => a.status === 'ABSENT');
            setPreviousDayAbsents(absents);
          }
        })
        .catch(() => {});
    }
  }, [isClassTeacher, assignedClassId, assignedSectionId]);

  // Students belonging to Class Teacher's assigned Class & Section
  const assignedClassStudents = students.filter((st) => {
    const enrollment = st.enrollments?.[0];
    return enrollment?.classId === assignedClassId && enrollment?.sectionId === assignedSectionId;
  });

  // Students matching filter in "Class Students" tab
  const filteredClassStudents = students.filter((st) => {
    const enrollment = st.enrollments?.[0];
    const matchesClass = !stuClassId || enrollment?.classId === stuClassId;
    const matchesSection = !stuSectionId || enrollment?.sectionId === stuSectionId;
    return matchesClass && matchesSection;
  });

  // --- POST DAILY WORK (TODAY ONLY CONSTRAINT) ---
  const handlePostDailyWork = async (e) => {
    e.preventDefault();
    if (!dailySummary.trim()) {
      alert('Please enter your daily work summary.');
      return;
    }
    try {
      setPostingWork(true);
      const res = await api('/api/work-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: staffRecord?.id || currentUser?.staffId,
          workSummary: dailySummary.trim(),
          department: staffRecord?.department?.name || 'Faculty Academics',
          hoursWorked: dailyHours,
        }),
      });
      const data = await res.json();
      setPostingWork(false);
      if (data.success) {
        alert('Daily work update posted successfully for today!');
        setDailySummary('');
        loadData();
      } else {
        alert(data.error || 'Failed to post daily work update.');
      }
    } catch (err) {
      setPostingWork(false);
      alert('Error posting daily work update.');
    }
  };

  // --- CHANGE PASSWORD HANDLER ---
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('New password and confirm password do not match.');
      return;
    }
    try {
      setChangingPassword(true);
      const res = await api('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: currentUser?.id,
          oldPassword: currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      setChangingPassword(false);

      if (data.success) {
        alert('Password updated successfully! Please use your new password for future logins.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        alert(data.error || 'Failed to update password.');
      }
    } catch (err) {
      setChangingPassword(false);
      alert('Error changing password.');
    }
  };

  // --- ATTENDANCE SELECTION HANDLERS ---
  const toggleAbsentStudent = (studentId) => {
    setAbsentStudentIds((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const markedAbsentCount = Object.values(absentStudentIds).filter(Boolean).length;
  const absentStudentsList = assignedClassStudents.filter((st) => absentStudentIds[st.id]);

  // Open Attendance Confirmation Modal
  const handleOpenAttendanceModal = () => {
    setIsAttendanceModalOpen(true);
  };

  // Confirm and Post Attendance
  const handleConfirmPostAttendance = async () => {
    try {
      setSubmittingAttendance(true);

      const records = assignedClassStudents.map((st) => ({
        studentId: st.id,
        status: absentStudentIds[st.id] ? 'ABSENT' : 'PRESENT',
        remarks: absentStudentIds[st.id] ? 'Marked Absent by Class Teacher' : 'Regular Attendance',
      }));

      const res = await api('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: assignedClassId,
          sectionId: assignedSectionId,
          date: new Date().toISOString(),
          records,
          staffId: staffRecord?.id || currentUser?.staffId,
          profileId: currentUser?.id,
          userRole: 'STAFF',
        }),
      });

      const data = await res.json();
      setSubmittingAttendance(false);
      setIsAttendanceModalOpen(false);

      if (data.success) {
        alert(
          `Attendance successfully posted for ${assignedClassName}-${assignedSectionName}!\n\nTotal Students: ${records.length}\nAbsents Marked: ${markedAbsentCount}`
        );
        setAbsentStudentIds({});
        loadData();
      } else {
        alert(data.error || 'Failed to post attendance.');
      }
    } catch (err) {
      setSubmittingAttendance(false);
      setIsAttendanceModalOpen(false);
      alert('Error posting attendance.');
    }
  };

  // --- SUBMIT LEAVE REQUEST HANDLER ---
  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!leaveStart || !leaveEnd || !leaveReason.trim()) {
      alert('Please enter leave start date, end date, and reason.');
      return;
    }
    try {
      const res = await api('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: staffRecord?.id || currentUser?.staffId,
          profileId: currentUser?.id,
          email: currentUser?.email,
          startDate: leaveStart,
          endDate: leaveEnd,
          reason: leaveReason.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Leave request submitted successfully! Status will update upon Admin / Super Admin review.');
        setLeaveStart('');
        setLeaveEnd('');
        setLeaveReason('');
        loadData();
      } else {
        alert(data.error || 'Failed to submit leave request.');
      }
    } catch (err) {
      alert('Error submitting leave request.');
    }
  };

  // Latest Leave Request Status
  const latestLeave = myLeaveRequests[0];
  const latestLeaveStatus = latestLeave?.status || 'NO_REQUESTS';

  return (
    <div className="min-h-screen bg-paper flex flex-col font-sans">
      <Header userRole="STAFF" userName={currentUser?.fullName || 'Faculty Teacher'} />

      <div className="flex flex-1">
        {/* Dynamic Sidebar - Hides "Mark Class Attendance" if NOT a Class Teacher */}
        <Sidebar
          role="STAFF"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isClassTeacher={isClassTeacher}
        />

        <main className="flex-1 p-8 overflow-y-auto space-y-8">
          {/* TAB 1: DASHBOARD (OVERVIEW) */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Daily Work Post Textbox (Today Only Constraint) */}
              <div className="bg-sheet p-6 border border-rule space-y-4">
                <div className="border-b border-rule-soft pb-3 flex justify-between items-center">
                  <div>
                    <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                      <CheckSquare className="w-5 h-5 text-copy" />
                      <span>Log today's work</span>
                    </h2>
                    <p className="text-xs text-ink-soft">
                      What you taught or handled today. Recorded against {new Date().toLocaleDateString()})
                    </p>
                  </div>
                  <span className="bg-copy-wash border border-copy/25 text-copy text-xs font-mono font-medium px-3 py-1">
                    Today: {new Date().toLocaleDateString('en-GB')}
                  </span>
                </div>

                <form onSubmit={handlePostDailyWork} className="bg-paper p-5 border border-rule space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-ink">Work summary *</label>
                    <textarea
                      rows={3}
                      required
                      value={dailySummary}
                      onChange={(e) => setDailySummary(e.target.value)}
                      placeholder="Topics taught, practicals run, or admin work handled.."
                      className="w-full px-3.5 py-2.5 border border-rule bg-sheet text-xs text-ink focus:ring-2 focus:ring-copy focus:outline-none"
                    ></textarea>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-ink-soft font-medium">Hours</span>
                      <input
                        type="number"
                        step="0.5"
                        value={dailyHours}
                        onChange={(e) => setDailyHours(e.target.value)}
                        className="w-20 px-3 py-1.5 border border-rule bg-sheet text-xs text-center font-medium"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={postingWork || !dailySummary.trim()}
                      className="bg-copy hover:bg-copy-deep text-white font-medium px-5 py-2.5 text-xs transition-all cursor-pointer flex items-center space-x-2 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>{postingWork ? 'Posting Work Log...' : "Save work log"}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Absent yesterday Showcase (Class Teachers Only) */}
              {isClassTeacher ? (
                <div className="bg-sheet p-6 border border-rule space-y-4">
                  <div className="border-b border-rule-soft pb-3 flex justify-between items-center">
                    <div>
                      <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                        <UserCheck className="w-5 h-5 text-due" />
                        <span>Absent yesterday ({assignedClassName}-{assignedSectionName})</span>
                      </h2>
                      <p className="text-xs text-ink-soft">
                        Students marked absent in the class you look after.
                      </p>
                    </div>
                    <span className="bg-due-wash text-due text-xs font-medium px-3 py-1">
                      {previousDayAbsents.length} Absentee(s)
                    </span>
                  </div>

                  {previousDayAbsents.length === 0 ? (
                    <div className="p-8 text-center bg-copy-wash/60 border border-copy/25 text-copy-deep text-xs font-medium">
                      ✓ No students were absent on the previous day. 100% full attendance recorded!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {previousDayAbsents.map((ab) => (
                        <div
                          key={ab.id}
                          className="bg-due-wash/60 border border-due/25 p-4 space-y-2"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-ink text-sm">
                                {ab.student?.profile?.fullName || 'Student'}
                              </h4>
                              <div className="text-[11px] font-mono text-ink-soft">
                                {ab.student?.studentCode}
                              </div>
                            </div>
                            <span className="bg-rose-200 text-rose-900 font-mono text-[10px] font-medium px-2 py-0.5">
                              Roll #{ab.student?.rollNumber}
                            </span>
                          </div>

                          <div className="text-xs text-ink-soft pt-2 border-t border-due/25/60">
                            Status: <strong className="text-due">ABSENT</strong> • Date: {new Date(ab.date).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 2: MY PROFILE */}
          {activeTab === 'profile' && (
            <div className="bg-sheet p-6 border border-rule space-y-6">
              <div className="border-b border-rule-soft pb-4">
                <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                  <UserCheck className="w-5 h-5 text-copy" />
                  <span>My profile</span>
                </h2>
                <p className="text-xs text-ink-soft">
                  Inspect credentials, subject specializations, salary details, and update login password
                </p>
              </div>

              {/* Profile Details Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Faculty Info Card */}
                <div className="bg-paper border border-rule p-6 space-y-4">
                  <h3 className="text-xs font-medium text-ink uppercase tracking-wider">
                    Personal & Professional Credentials
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-2 border-b border-rule">
                      <span className="text-ink-soft font-medium">Faculty Full Name:</span>
                      <span className="font-medium text-ink">{currentUser?.fullName || 'Faculty Member'}</span>
                    </div>

                    <div className="flex justify-between py-2 border-b border-rule">
                      <span className="text-ink-soft font-medium">Login Email ID:</span>
                      <span className="font-mono font-medium text-copy">{currentUser?.email}</span>
                    </div>

                    <div className="flex justify-between py-2 border-b border-rule">
                      <span className="text-ink-soft font-medium">Designation & Subject:</span>
                      <span className="font-medium text-ink">
                        {staffRecord?.designation || 'Senior Faculty Teacher'}
                      </span>
                    </div>

                    <div className="flex justify-between py-2 border-b border-rule">
                      <span className="text-ink-soft font-medium">Years of Experience:</span>
                      <span className="font-medium text-ink">5 Years</span>
                    </div>

                    <div className="flex justify-between py-2 border-b border-rule">
                      <span className="text-ink-soft font-medium">Base Salary Amount:</span>
                      <span className="font-medium text-copy-deep">
                        Rs. {(staffRecord?.baseSalary || 45000).toLocaleString('en-IN')} / month
                      </span>
                    </div>

                    {/* Class Teacher Assignment Details - Showcase ONLY if assigned */}
                    {isClassTeacher ? (
                      <div className="bg-copy-wash border border-copy/25 p-3.5 text-teal-900 font-medium space-y-1">
                        <div className="font-medium text-xs uppercase tracking-wider text-copy">
                          Class Teacher Assignment:
                        </div>
                        <div className="text-sm font-semibold text-ink">
                          {assignedClassName} - Section {assignedSectionName}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Change Password Form */}
                <form onSubmit={handleChangePassword} className="bg-paper border border-rule p-6 space-y-4">
                  <h3 className="text-xs font-medium text-ink uppercase tracking-wider flex items-center space-x-1.5">
                    <Key className="w-4 h-4 text-copy" />
                    <span>Change password</span>
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-ink mb-1">Current Password *</label>
                      <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="w-full px-3.5 py-2 border border-rule text-xs bg-sheet focus:ring-2 focus:ring-copy focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ink mb-1">New Password *</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full px-3.5 py-2 border border-rule text-xs bg-sheet focus:ring-2 focus:ring-copy focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ink mb-1">Confirm New Password *</label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full px-3.5 py-2 border border-rule text-xs bg-sheet focus:ring-2 focus:ring-copy focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="w-full bg-ink hover:bg-copy-deep text-white font-medium py-2.5 text-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {changingPassword ? 'Updating…' : 'Update password'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: CLASS STUDENTS */}
          {activeTab === 'students' && (
            <div className="bg-sheet p-6 border border-rule space-y-6">
              <div className="border-b border-rule-soft pb-4">
                <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                  <Users className="w-5 h-5 text-copy" />
                  <span>Students in my class</span>
                </h2>
                <p className="text-xs text-ink-soft">
                  Select Class & Section to view student list and inspect complete details (Name, Class, Sec, Roll No, ID, Parent Name & Mobile)
                </p>
              </div>

              {/* Class & Section Selector Bar */}
              <div className="bg-paper p-4 border border-rule grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Select Class *</label>
                  <select
                    value={stuClassId}
                    onChange={(e) => {
                      setStuClassId(e.target.value);
                      setStuSectionId('');
                      setSelectedStudent(null);
                    }}
                    className="w-full px-3.5 py-2 border border-rule text-xs bg-sheet font-medium focus:ring-2 focus:ring-copy focus:outline-none cursor-pointer"
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
                    value={stuSectionId}
                    onChange={(e) => {
                      setStuSectionId(e.target.value);
                      setSelectedStudent(null);
                    }}
                    className="w-full px-3.5 py-2 border border-rule text-xs bg-sheet font-medium focus:ring-2 focus:ring-copy focus:outline-none cursor-pointer"
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

              {/* Student Directory Table & Selected Detail Cards */}
              <div className="space-y-4">
                <h3 className="text-xs font-medium text-ink uppercase tracking-wider">
                  Class Student Directory ({filteredClassStudents.length} Students)
                </h3>

                {filteredClassStudents.length === 0 ? (
                  <div className="text-center py-10 bg-paper border border-rule text-ink-faint text-xs">
                    Please select a Class & Section to view student directory.
                  </div>
                ) : (
                  <div className="register-scroll">
                    <table className="register">
                      <thead>
                        <tr>
                          <th>Roll No</th>
                          <th>Student Name</th>
                          <th>Student Code / ID</th>
                          <th>Class & Section</th>
                          <th>Parent / Guardian Name</th>
                          <th>Parent Mobile No</th>
                          <th className="num">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rule-soft font-medium text-ink">
                        {filteredClassStudents.map((st) => (
                          <tr key={st.id} className="hover:bg-manila/25">
                            <td className="font-medium text-ink">{st.rollNumber}</td>
                            <td className="font-medium text-ink">{st.profile?.fullName}</td>
                            <td className="font-mono text-xs font-medium text-copy">{st.studentCode}</td>
                            <td className="text-xs text-ink">
                              {st.enrollments?.[0]?.class?.name || 'Class 10'}-{st.enrollments?.[0]?.section?.name || 'A'}
                            </td>
                            <td className="text-xs text-ink-soft">
                              {st.parents?.[0]?.parent?.fullName || 'Parent'}
                            </td>
                            <td className="text-xs font-mono text-ink">
                              {st.parents?.[0]?.parent?.phone || st.profile?.phone || 'N/A'}
                            </td>
                            <td className="text-right">
                              <button
                                onClick={() => setSelectedStudent(st)}
                                className="bg-copy-wash hover:bg-copy-wash text-copy px-3 py-1 text-xs font-medium cursor-pointer"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Selected Student Detail Showcase Modal / Drawer */}
              {selectedStudent && (
                <div className="bg-paper border border-rule p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-rule pb-3">
                    <h4 className="font-medium text-ink text-base">
                      Student Details: {selectedStudent.profile?.fullName}
                    </h4>
                    <button
                      onClick={() => setSelectedStudent(null)}
                      className="text-ink-faint hover:text-ink-soft font-medium text-xs"
                    >
                      ✕ Close
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="bg-sheet p-3.5 border border-rule">
                      <span className="text-ink-soft font-medium block">Full Name:</span>
                      <strong className="text-sm font-medium text-ink">{selectedStudent.profile?.fullName}</strong>
                    </div>

                    <div className="bg-sheet p-3.5 border border-rule">
                      <span className="text-ink-soft font-medium block">Student ID / Code:</span>
                      <strong className="text-sm font-mono font-medium text-copy">{selectedStudent.studentCode}</strong>
                    </div>

                    <div className="bg-sheet p-3.5 border border-rule">
                      <span className="text-ink-soft font-medium block">Roll Number:</span>
                      <strong className="text-sm font-medium text-ink">#{selectedStudent.rollNumber}</strong>
                    </div>

                    <div className="bg-sheet p-3.5 border border-rule">
                      <span className="text-ink-soft font-medium block">Class & Section:</span>
                      <strong className="text-sm font-medium text-ink">
                        {selectedStudent.enrollments?.[0]?.class?.name || 'Class 10'}-{selectedStudent.enrollments?.[0]?.section?.name || 'A'}
                      </strong>
                    </div>

                    <div className="bg-sheet p-3.5 border border-rule">
                      <span className="text-ink-soft font-medium block">Parent / Guardian Name:</span>
                      <strong className="text-sm font-medium text-ink">
                        {selectedStudent.parents?.[0]?.parent?.fullName || 'Parent'}
                      </strong>
                    </div>

                    <div className="bg-sheet p-3.5 border border-rule">
                      <span className="text-ink-soft font-medium block">Parent Mobile Number:</span>
                      <strong className="text-sm font-mono font-medium text-copy">
                        {selectedStudent.parents?.[0]?.parent?.phone || selectedStudent.profile?.phone || 'N/A'}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MARK CLASS ATTENDANCE (CLASS TEACHERS ONLY) */}
          {activeTab === 'attendance' && isClassTeacher && (
            <div className="bg-sheet p-6 border border-rule space-y-6">
              <div className="border-b border-rule-soft pb-4 flex justify-between items-center">
                <div>
                  <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-copy" />
                    <span>Mark attendance ({assignedClassName}-{assignedSectionName})</span>
                  </h2>
                  <p className="text-xs text-ink-soft">
                    Check the box next to students who are ABSENT today, then click Post Attendance to confirm.
                  </p>
                </div>
                <span className="bg-paid-wash text-paid text-xs font-medium px-3.5 py-1.5">
                  Assigned Class Teacher
                </span>
              </div>

              {/* Roster Table with Checkboxes */}
              <div className="register-scroll">
                <table className="register">
                  <thead>
                    <tr>
                      <th>Roll No</th>
                      <th>Student Name</th>
                      <th>Student Code</th>
                      <th className="num">Mark Absent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule-soft font-medium text-ink">
                    {assignedClassStudents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-ink-faint text-xs">
                          No students allocated to {assignedClassName}-{assignedSectionName}.
                        </td>
                      </tr>
                    ) : (
                      assignedClassStudents.map((st) => {
                        const isAbsent = Boolean(absentStudentIds[st.id]);
                        return (
                          <tr key={st.id} className={isAbsent ? 'bg-due-wash/50' : 'hover:bg-manila/25'}>
                            <td className="font-medium text-ink">#{st.rollNumber}</td>
                            <td className="font-medium text-ink">{st.profile?.fullName}</td>
                            <td className="font-mono text-xs font-medium text-ink-soft">{st.studentCode}</td>
                            <td className="text-right">
                              <label className="inline-flex items-center space-x-2 cursor-pointer bg-sheet px-3 py-1 border border-rule hover:border-rose-400">
                                <input
                                  type="checkbox"
                                  checked={isAbsent}
                                  onChange={() => toggleAbsentStudent(st.id)}
                                  className="w-4 h-4 text-due rounded focus:ring-rose-500"
                                />
                                <span className={`text-xs font-medium ${isAbsent ? 'text-due' : 'text-ink-soft'}`}>
                                  {isAbsent ? 'ABSENT' : 'Present'}
                                </span>
                              </label>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* POST ATTENDANCE BUTTON - ENABLED ONCE RENDERED */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleOpenAttendanceModal}
                  className="bg-copy hover:bg-copy-deep text-white font-medium px-6 py-2.5 text-xs transition-all cursor-pointer flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Post Attendance ({markedAbsentCount} Absentees)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: SUBMIT DAILY WORK */}
          {activeTab === 'work' && (
            <div className="bg-sheet p-6 border border-rule space-y-6">
              <div className="border-b border-rule-soft pb-4">
                <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                  <CheckSquare className="w-5 h-5 text-copy" />
                  <span>Submitted Daily Work Updates Showcase</span>
                </h2>
                <p className="text-xs text-ink-soft">
                  History of your submitted daily work logs containing date, timestamp, work summary, and hours
                </p>
              </div>

              <div className="register-scroll">
                <table className="register">
                  <thead>
                    <tr>
                      <th>Submitted Date</th>
                      <th>Department</th>
                      <th>Work Summary Details</th>
                      <th>Hours</th>
                      <th className="num">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule-soft font-medium text-ink">
                    {myWorkLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-ink-faint text-xs">
                          No daily work updates submitted yet.
                        </td>
                      </tr>
                    ) : (
                      myWorkLogs.map((w) => (
                        <tr key={w.id} className="hover:bg-manila/25">
                          <td className="font-mono text-xs font-medium text-copy">
                            {new Date(w.date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="text-xs text-ink-soft">{w.department}</td>
                          <td className="text-xs font-medium text-ink">{w.workSummary}</td>
                          <td className="text-xs font-medium text-ink">{w.hoursWorked} hrs</td>
                          <td className="text-right">
                            <span className="bg-paid-wash text-paid mark">
                              RECORDED
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: LEAVE REQUESTS */}
          {activeTab === 'leave' && (
            <div className="bg-sheet p-6 border border-rule space-y-6">
              <div className="border-b border-rule-soft pb-4 flex justify-between items-center">
                <div>
                  <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-copy" />
                    <span>My leave requests</span>
                  </h2>
                  <p className="text-xs text-ink-soft">
                    Apply for leaves and track real-time approval status from Admin / Super Admin
                  </p>
                </div>

                {/* Top Right Corner Status Badge / Button */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-ink-soft">Latest Leave Status:</span>
                  <span
                    className={`text-xs font-semibold px-3 py-1.5 uppercase ${
                      latestLeaveStatus === 'APPROVED'
                        ? 'bg-paid-wash text-paid border border-teal-300'
                        : latestLeaveStatus === 'REJECTED'
                        ? 'bg-due-wash text-due border border-rose-300'
                        : latestLeaveStatus === 'PENDING'
                        ? 'bg-hold-wash text-hold border border-amber-300'
                        : 'bg-paper text-ink-soft border border-rule'
                    }`}
                  >
                    {latestLeaveStatus}
                  </span>
                </div>
              </div>

              {/* Leave Application Form */}
              <form onSubmit={handleApplyLeave} className="bg-paper p-5 border border-rule space-y-4">
                <h3 className="text-xs font-medium text-ink uppercase tracking-wider">Submit New Leave Application</h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">From Date (Start Date) *</label>
                    <input
                      type="date"
                      required
                      value={leaveStart}
                      onChange={(e) => setLeaveStart(e.target.value)}
                      className="w-full px-3.5 py-2 border border-rule text-xs bg-sheet"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">To Date (End Date) *</label>
                    <input
                      type="date"
                      required
                      value={leaveEnd}
                      onChange={(e) => setLeaveEnd(e.target.value)}
                      className="w-full px-3.5 py-2 border border-rule text-xs bg-sheet"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">Reason for Leave *</label>
                    <input
                      type="text"
                      required
                      value={leaveReason}
                      onChange={(e) => setLeaveReason(e.target.value)}
                      placeholder="e.g. Medical emergency / Personal leave"
                      className="w-full px-3.5 py-2 border border-rule text-xs bg-sheet"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!leaveStart || !leaveEnd || !leaveReason.trim()}
                  className="bg-ink hover:bg-copy-deep text-white font-medium px-5 py-2.5 text-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  Submit Leave Request
                </button>
              </form>

              {/* Leave Requests History Table */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-ink uppercase tracking-wider">Leave Applications History</h3>
                <div className="register-scroll">
                  <table className="register">
                    <thead>
                      <tr>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Reason</th>
                        <th>Submitted Date</th>
                        <th className="num">Approval Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rule-soft font-medium text-ink">
                      {myLeaveRequests.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-ink-faint text-xs">
                            No leave applications submitted.
                          </td>
                        </tr>
                      ) : (
                        myLeaveRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-manila/25">
                            <td className="font-mono text-xs font-medium text-ink">
                              {new Date(req.startDate).toLocaleDateString()}
                            </td>
                            <td className="font-mono text-xs font-medium text-ink">
                              {new Date(req.endDate).toLocaleDateString()}
                            </td>
                            <td className="text-xs text-ink-soft">{req.reason}</td>
                            <td className="text-xs text-ink-soft">{new Date(req.createdAt).toLocaleDateString()}</td>
                            <td className="text-right">
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
                          </tr>
                        ))
                      )}
                      </tbody>
                    </table>
                  </div>
                </div>
            </div>
          )}
        </main>
      </div>

      {/* POP-UP MODAL NOTIFICATION FOR ATTENDANCE CONFIRMATION */}
      {isAttendanceModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-sheet w-full max-w-md border border-rule overflow-hidden p-6 space-y-4">
            <div className="flex items-center space-x-3 text-due border-b border-rule-soft pb-3">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-medium text-ink">Confirm Class Attendance Posting</h3>
            </div>

            <div className="space-y-3 text-xs text-ink">
              <p>
                You are about to post daily attendance for <strong>{assignedClassName}-{assignedSectionName}</strong>.
              </p>

              <div className="bg-due-wash border border-due/25 p-3.5 space-y-1">
                <div className="font-medium text-rose-900 text-xs">
                  Absent Students Roll Numbers ({absentStudentsList.length} Absentees):
                </div>
                {absentStudentsList.length === 0 ? (
                  <div className="text-copy-deep font-medium text-xs pt-1">
                    ✓ All students present! (0 Absentees)
                  </div>
                ) : (
                  <div className="font-mono text-xs font-semibold text-due pt-1">
                    {absentStudentsList.map((st) => `#${st.rollNumber} (${st.profile?.fullName})`).join(', ')}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAttendanceModalOpen(false)}
                className="flex-1 bg-manila/50 hover:bg-manila text-ink font-medium py-2.5 text-xs"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={submittingAttendance}
                onClick={handleConfirmPostAttendance}
                className="flex-1 bg-copy hover:bg-copy-deep text-white font-medium py-2.5 text-xs transition-all flex items-center justify-center space-x-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{submittingAttendance ? 'Posting...' : 'Confirm & Post'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
