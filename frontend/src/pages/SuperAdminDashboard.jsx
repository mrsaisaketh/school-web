import React, { useEffect, useState } from 'react';
import { Facts, Mark, PageHead, Sheet, SheetFoot, SheetHead } from '../components/ui';
import { api, getUser } from '../lib/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import {
  Users,
  UserCheck,
  CreditCard,
  Briefcase,
  Calendar,
  AlertCircle,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  Filter,
  Send,
  Trash2,
  RotateCcw,
  CheckSquare,
} from 'lucide-react';

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState(null);
  const [students, setStudents] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [workUpdates, setWorkUpdates] = useState([]);
  const [jobOpenings, setJobOpenings] = useState([]);
  const [loading, setLoading] = useState(true);

  // The two queues a principal is the bottleneck for.
  const pendingLeave = leaveRequests.filter((l) => l.status === 'PENDING');
  const pendingInvoices = invoices.filter((i) => i.status === 'PENDING_APPROVAL');
  const [currentUser, setCurrentUser] = useState(null);

  // Filter & Search states
  const [studentSearch, setStudentSearch] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentAttendanceRecord, setStudentAttendanceRecord] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [workDateFilter, setWorkDateFilter] = useState('');

  const [careerSubTab, setCareerSubTab] = useState('CAREER');

  const [jobTitle, setJobTitle] = useState('');
  const [jobDept, setJobDept] = useState('Science & Mathematics');
  const [jobDesc, setJobDesc] = useState('');
  const [jobReq, setJobReq] = useState('');
  const [jobExp, setJobExp] = useState('2-5 Years');
  const [jobSalary, setJobSalary] = useState('Rs. 40,000 - 55,000 / month');
  const [jobDeadline, setJobDeadline] = useState('');

  const [selectedFormJobId, setSelectedFormJobId] = useState('');
  const [formFields, setFormFields] = useState([]);
  const [newQuestionLabel, setNewQuestionLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [newIsRequired, setNewIsRequired] = useState(true);

  const [selectedAppJobId, setSelectedAppJobId] = useState('');
  const [fifoApplications, setFifoApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(false);

  useEffect(() => {
    const saved = getUser();
    if (saved) setCurrentUser(saved);
  }, []);

  const fetchDashboardData = () => {
    setLoading(true);
    Promise.all([
      api('/api/reports').then((r) => r.json()),
      api('/api/students?limit=100').then((r) => r.json()),
      api('/api/staff').then((r) => r.json()),
      api('/api/invoices').then((r) => r.json()),
      api('/api/leave').then((r) => r.json()),
      api('/api/work-updates').then((r) => r.json()),
      api('/api/careers?all=true').then((r) => r.json()),
    ])
      .then(([repRes, stuRes, stfRes, invRes, leaveRes, workRes, carRes]) => {
        if (repRes.metrics) setMetrics(repRes.metrics);
        if (stuRes.students) setStudents(stuRes.students);
        if (stfRes.staffMembers) setStaffList(stfRes.staffMembers);
        if (invRes.invoices) setInvoices(invRes.invoices);
        if (invRes.monthlySummary) setMonthlySummary(invRes.monthlySummary);
        if (leaveRes.leaveRequests) setLeaveRequests(leaveRes.leaveRequests);
        if (workRes.workUpdates) setWorkUpdates(workRes.workUpdates);
        if (carRes.jobOpenings) setJobOpenings(carRes.jobOpenings);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchStudentAttendance = (stId) => {
    if (!stId) {
      setStudentAttendanceRecord(null);
      return;
    }
    setLoadingAttendance(true);
    api(`/api/attendance?studentId=${stId}`)
      .then((r) => r.json())
      .then((res) => {
        setStudentAttendanceRecord(res);
        setLoadingAttendance(false);
      })
      .catch(() => setLoadingAttendance(false));
  };

  const handleDateFilterChange = (dateVal) => {
    setWorkDateFilter(dateVal);
    const url = dateVal ? `/api/work-updates?date=${dateVal}` : '/api/work-updates';
    fetch(url)
      .then((r) => r.json())
      .then((res) => {
        if (res.workUpdates) setWorkUpdates(res.workUpdates);
      });
  };

  const handleLeaveDecision = async (leaveRequestId, decisionStatus) => {
    try {
      const res = await api('/api/leave', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveRequestId,
          status: decisionStatus,
          userRole: 'SUPER_ADMIN',
          profileId: currentUser?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Leave request ${decisionStatus.toLowerCase()} successfully!`);
        fetchDashboardData();
      }
    } catch (err) {
      alert('Error updating leave request');
    }
  };

  const handlePostJob = async (e) => {
    e.preventDefault();
    try {
      const res = await api('/api/careers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_JOB',
          title: jobTitle,
          department: jobDept,
          description: jobDesc,
          requirements: jobReq,
          experience: jobExp,
          salaryRange: jobSalary,
          deadline: jobDeadline,
          userRole: 'SUPER_ADMIN',
          profileId: currentUser?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Job opening posted successfully to Careers page!');
        setJobTitle('');
        setJobDesc('');
        setJobReq('');
        setJobDeadline('');
        fetchDashboardData();
      } else {
        alert(data.error || 'Failed to post job');
      }
    } catch (err) {
      alert('Error posting job');
    }
  };

  const handleTogglePublishJob = async (id, isPublished) => {
    try {
      const res = await api('/api/careers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_PUBLISH',
          id,
          isPublished,
          userRole: 'SUPER_ADMIN',
          profileId: currentUser?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(isPublished ? 'Job reposted to Careers page!' : 'Job deleted from public Careers page.');
        fetchDashboardData();
      }
    } catch (err) {
      alert('Error toggling job visibility');
    }
  };

  const handleAddFormField = () => {
    if (!newQuestionLabel.trim()) return;
    const updated = [...formFields, { label: newQuestionLabel, type: newFieldType, required: newIsRequired }];
    setFormFields(updated);
    setNewQuestionLabel('');
  };

  const handleSaveFormFields = async () => {
    if (!selectedFormJobId) {
      alert('Please select a job opening to attach form fields.');
      return;
    }
    try {
      const res = await api('/api/careers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_FORM_FIELDS',
          id: selectedFormJobId,
          customFields: formFields,
          userRole: 'SUPER_ADMIN',
          profileId: currentUser?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Custom application form saved successfully!');
        fetchDashboardData();
      }
    } catch (err) {
      alert('Error saving custom form');
    }
  };

  const handleSelectJobForForm = (jobId) => {
    setSelectedFormJobId(jobId);
    const found = jobOpenings.find((j) => j.id === jobId);
    if (found && found.customFieldsJson) {
      try {
        setFormFields(JSON.parse(found.customFieldsJson));
      } catch (e) {
        setFormFields([]);
      }
    } else {
      setFormFields([]);
    }
  };

  const handleSelectJobForApplications = (jobId) => {
    setSelectedAppJobId(jobId);
    if (!jobId) {
      setFifoApplications([]);
      return;
    }
    setLoadingApplications(true);
    api(`/api/careers?jobOpeningId=${jobId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.applications) setFifoApplications(res.applications);
        setLoadingApplications(false);
      })
      .catch(() => setLoadingApplications(false));
  };

  const filteredStudents = students.filter((st) => {
    const nameMatch =
      !studentSearch ||
      st.profile?.fullName?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      st.studentCode?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      st.admissionNumber?.toLowerCase().includes(studentSearch.toLowerCase());

    const className = st.enrollments?.[0]?.class?.name || 'Class 10';
    const classMatch = classFilter === 'ALL' || className === classFilter;

    const secName = st.enrollments?.[0]?.section?.name || 'A';
    const secMatch = sectionFilter === 'ALL' || secName === sectionFilter;

    return nameMatch && classMatch && secMatch;
  });

  const filteredInvoices = invoices.filter((inv) => {
    if (!invoiceSearch) return true;
    const q = invoiceSearch.toLowerCase();
    const invNoMatch = inv.invoiceNumber?.toLowerCase().includes(q);
    const stuCodeMatch = inv.student?.studentCode?.toLowerCase().includes(q);
    const stuNameMatch = inv.student?.profile?.fullName?.toLowerCase().includes(q);
    const txIdMatch = inv.payments?.some((p) => p.transactionNumber?.toLowerCase().includes(q) || p.providerTxId?.toLowerCase().includes(q));
    return invNoMatch || stuCodeMatch || stuNameMatch || txIdMatch;
  });

  return (
    <div className="min-h-screen bg-paper flex flex-col font-sans">
      <Header userRole="SUPER_ADMIN" userName={currentUser?.fullName || 'Super Admin'} />

      <div className="flex flex-1">
        <Sidebar role="SUPER_ADMIN" activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-8 overflow-y-auto space-y-8">
          {/* KPI Summary Cards - STRICTLY PRESENT ON OVERVIEW DASHBOARD ONLY */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <PageHead eyebrow="Principal's desk" title="Today at a glance" />

              {/* Figures read across as one line of facts, not as a row of tiles. */}
              <Facts
                items={[
                  { label: 'On roll', value: metrics?.totalStudents ?? students.length },
                  { label: 'Faculty & staff', value: metrics?.totalStaff ?? staffList.length },
                  {
                    label: 'Collected',
                    value: `Rs. ${(metrics?.feeCollection ?? 0).toLocaleString('en-IN')}`,
                    tone: 'paid',
                  },
                  {
                    label: 'Outstanding',
                    value: `Rs. ${(metrics?.pendingFees ?? 0).toLocaleString('en-IN')}`,
                    tone: (metrics?.pendingFees ?? 0) > 0 ? 'due' : undefined,
                  },
                ]}
              />

              {/* What actually needs the principal, rather than a list of modules. */}
              <Sheet>
                <SheetHead
                  title="Waiting on you"
                  note="Items that cannot move until someone approves them."
                  count={pendingLeave.length + pendingInvoices.length}
                />
                <div className="register-scroll">
                  <table className="register">
                    <thead>
                      <tr>
                        <th className="serial">#</th>
                        <th>Item</th>
                        <th>Who</th>
                        <th>Raised</th>
                        <th className="num">Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingLeave.length + pendingInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-xs text-ink-faint">
                            Nothing is waiting for approval. The registers are up to date.
                          </td>
                        </tr>
                      ) : (
                        <>
                          {pendingLeave.map((req, i) => (
                            <tr key={`lv-${req.id}`}>
                              <td className="serial">{String(i + 1).padStart(2, '0')}</td>
                              <td className="font-medium text-ink">Leave request</td>
                              <td className="text-ink-soft">{req.staff?.profile?.fullName || 'Staff'}</td>
                              <td className="text-ink-soft">
                                {new Date(req.createdAt).toLocaleDateString('en-IN')}
                              </td>
                              <td className="num text-ink-faint">{req.daysCount} d</td>
                              <td>
                                <Mark status={req.status} />
                              </td>
                            </tr>
                          ))}
                          {pendingInvoices.map((inv, i) => (
                            <tr key={`in-${inv.id}`}>
                              <td className="serial">
                                {String(pendingLeave.length + i + 1).padStart(2, '0')}
                              </td>
                              <td className="font-medium text-ink">
                                Fee payment{' '}
                                <span className="font-mono text-[0.6875rem] text-ink-faint">
                                  {inv.invoiceNumber}
                                </span>
                              </td>
                              <td className="text-ink-soft">
                                {inv.student?.profile?.fullName || 'Student'}
                              </td>
                              <td className="text-ink-soft">
                                {new Date(inv.createdAt).toLocaleDateString('en-IN')}
                              </td>
                              <td className="num">Rs. {inv.totalAmount.toLocaleString('en-IN')}</td>
                              <td>
                                <Mark status={inv.status} />
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
                <SheetFoot>
                  <span>
                    {pendingLeave.length} leave &middot; {pendingInvoices.length} payment
                    {pendingInvoices.length === 1 ? '' : 's'}
                  </span>
                  <span>Session 2026&ndash;27</span>
                </SheetFoot>
              </Sheet>
            </div>
          )}

          {/* STUDENTS TAB */}
          {activeTab === 'students' && (
            <div className="bg-sheet p-6 border border-rule space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-rule-soft pb-4">
                <div>
                  <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                    <Users className="w-5 h-5 text-copy" />
                    <span>Students Directory ({filteredStudents.length})</span>
                  </h2>
                  <p className="text-xs text-ink-soft">Search by name, student ID, class or section.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative min-w-[200px]">
                    <Search className="w-4 h-4 text-ink-faint absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search Name or ID..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-paper border border-rule text-xs text-ink focus:ring-2 focus:ring-copy focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center space-x-1.5 bg-paper px-3 py-1.5 border border-rule text-xs font-semibold">
                    <Filter className="w-3.5 h-3.5 text-copy" />
                    <span className="text-ink-soft">Class:</span>
                    <select
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                      className="bg-transparent text-ink font-medium focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">All Classes</option>
                      <option value="Class 10">Class 10</option>
                      <option value="Class 9">Class 9</option>
                      <option value="Class 8">Class 8</option>
                      <option value="Class 7">Class 7</option>
                      <option value="Class 6">Class 6</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-1.5 bg-paper px-3 py-1.5 border border-rule text-xs font-semibold">
                    <span className="text-ink-soft">Section:</span>
                    <select
                      value={sectionFilter}
                      onChange={(e) => setSectionFilter(e.target.value)}
                      className="bg-transparent text-ink font-medium focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">All Sections</option>
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="C">Section C</option>
                      <option value="D">Section D</option>
                    </select>
                  </div>
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="text-center py-12 text-ink-soft text-sm bg-paper border border-rule-soft">
                  No student records match the selected search or dropdown filters.
                </div>
              ) : (
                <div className="register-scroll">
                  <table className="register">
                    <thead>
                      <tr>
                        <th>Student Code / ID</th>
                        <th>Full Name</th>
                        <th>Admission No</th>
                        <th>Roll No</th>
                        <th>Class & Section</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rule-soft font-medium text-ink">
                      {filteredStudents.map((st) => (
                        <tr key={st.id} className="hover:bg-manila/25 transition-colors">
                          <td className="font-mono text-xs font-medium text-copy">{st.studentCode}</td>
                          <td className="font-medium text-ink">{st.profile?.fullName || 'N/A'}</td>
                          <td className="text-xs text-ink-soft">{st.admissionNumber}</td>
                          <td className="text-xs text-ink-soft">{st.rollNumber}</td>
                          <td className="text-xs font-semibold text-ink">
                            {st.enrollments?.[0]?.class?.name || 'Class 10'}-{st.enrollments?.[0]?.section?.name || 'A'}
                          </td>
                          <td>
                            <span className={`mark ${
                              st.status === 'ACTIVE' ? 'bg-paid-wash text-paid' : 'bg-due-wash text-due'
                            }`}>
                              {String(st.status).replace(/_/g, " ")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* STAFF MANAGEMENT TAB */}
          {activeTab === 'staff' && (
            <div className="bg-sheet p-6 border border-rule space-y-6">
              <div className="border-b border-rule-soft pb-4">
                <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                  <UserCheck className="w-5 h-5 text-copy" />
                  <span>Faculty and staff ({staffList.length})</span>
                </h2>
                <p className="text-xs text-ink-soft">Teaching and administrative staff currently on the roll.</p>
              </div>

              {staffList.length === 0 ? (
                <div className="text-center py-12 text-ink-soft text-sm bg-paper border border-rule-soft">
                  No staff members currently registered in database.
                </div>
              ) : (
                <div className="register-scroll">
                  <table className="register">
                    <thead>
                      <tr>
                        <th>Emp Code</th>
                        <th>Teacher Name</th>
                        <th>Designation</th>
                        <th>Department</th>
                        <th>Qualification</th>
                        <th>Joining Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rule-soft font-medium text-ink">
                      {staffList.map((stf) => (
                        <tr key={stf.id} className="hover:bg-manila/25 transition-colors">
                          <td className="font-mono text-xs text-copy font-medium">{stf.employeeCode}</td>
                          <td className="font-medium text-ink">{stf.profile?.fullName || 'N/A'}</td>
                          <td className="text-xs text-ink">{stf.designation}</td>
                          <td className="text-xs text-ink-soft">{stf.department?.name || 'General'}</td>
                          <td className="text-xs text-ink-soft">{stf.qualification}</td>
                          <td className="text-xs text-ink-soft">
                            {new Date(stf.joiningDate).toLocaleDateString()}
                          </td>
                          <td>
                            <span className="mark bg-paid-wash text-paid">
                              {stf.employmentStatus || 'ACTIVE'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ATTENDANCE RECORDS TAB */}
          {activeTab === 'attendance' && (
            <div className="bg-sheet p-6 border border-rule space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-rule-soft pb-4">
                <div>
                  <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-copy" />
                    <span>Student Attendance Lookup</span>
                  </h2>
                  <p className="text-xs text-ink-soft">Pick a student to see their full attendance record.</p>
                </div>

                <div className="min-w-[280px]">
                  <select
                    value={selectedStudentId}
                    onChange={(e) => {
                      setSelectedStudentId(e.target.value);
                      fetchStudentAttendance(e.target.value);
                    }}
                    className="w-full px-3.5 py-2.5 bg-paper border border-rule text-xs font-medium text-ink focus:ring-2 focus:ring-copy focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Select a Student --</option>
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.profile?.fullName} ({st.studentCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!selectedStudentId ? (
                <div className="text-center py-12 text-ink-soft text-sm bg-paper border border-rule-soft">
                  Please select a student from the dropdown above to view their attendance record.
                </div>
              ) : loadingAttendance ? (
                <div className="text-center py-12 text-ink-soft text-sm">
                  Fetching student attendance data...
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-paper p-4 border border-rule text-center">
                      <div className="text-2xl font-semibold text-ink">
                        {studentAttendanceRecord?.stats?.total ?? 0}
                      </div>
                      <div className="text-[11px] font-medium text-ink-soft uppercase mt-1">Total Days</div>
                    </div>

                    <div className="bg-copy-wash p-4 border border-copy/25 text-center">
                      <div className="text-2xl font-semibold text-copy">
                        {studentAttendanceRecord?.stats?.present ?? 0}
                      </div>
                      <div className="text-[11px] font-medium text-copy-deep uppercase mt-1">Present Days</div>
                    </div>

                    <div className="bg-due-wash p-4 border border-due/25 text-center">
                      <div className="text-2xl font-semibold text-due">
                        {studentAttendanceRecord?.stats?.absent ?? 0}
                      </div>
                      <div className="text-[11px] font-medium text-due uppercase mt-1">Absent Days</div>
                    </div>

                    <div className="bg-blue-50 p-4 border border-blue-200 text-center">
                      <div className="text-2xl font-semibold text-blue-900">
                        {studentAttendanceRecord?.stats?.percentage ?? 100}%
                      </div>
                      <div className="text-[11px] font-medium text-blue-800 uppercase mt-1">Attendance Rate</div>
                    </div>
                  </div>

                  <div className="register-scroll">
                    <table className="register">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Class & Section</th>
                          <th>Status</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rule-soft font-medium text-ink">
                        {(studentAttendanceRecord?.attendances || []).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-ink-faint text-xs">
                              No attendance entries recorded for this student yet.
                            </td>
                          </tr>
                        ) : (
                          studentAttendanceRecord.attendances.map((att) => (
                            <tr key={att.id} className="hover:bg-manila/25">
                              <td className="text-xs font-mono text-ink">
                                {new Date(att.date).toLocaleDateString()}
                              </td>
                              <td className="text-xs font-medium text-ink">
                                {att.class?.name || 'Class 10'}-{att.section?.name || 'A'}
                              </td>
                              <td>
                                <span
                                  className={`mark ${
                                    att.status === 'PRESENT'
                                      ? 'bg-paid-wash text-paid'
                                      : att.status === 'ABSENT'
                                      ? 'bg-due-wash text-due'
                                      : 'bg-hold-wash text-hold'
                                  }`}
                                >
                                  {String(att.status).replace(/_/g, " ")}
                                </span>
                              </td>
                              <td className="text-xs text-ink-soft">{att.remarks || 'Normal'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FEES AND INVOICES TAB */}
          {activeTab === 'fees' && (
            <div className="bg-sheet p-6 border border-rule space-y-6">
              <div className="border-b border-rule-soft pb-4 space-y-1">
                <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-copy" />
                  <span>Fees and invoices</span>
                </h2>
                <p className="text-xs text-ink-soft">Fees received each month, and a search across older invoices.</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-medium text-ink uppercase tracking-wider">Total Fees Received by Month</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {monthlySummary.length === 0 ? (
                    <div className="col-span-full p-4 bg-paper text-ink-faint text-xs text-center border border-rule-soft">
                      No monthly payment records available.
                    </div>
                  ) : (
                    monthlySummary.map((item, idx) => (
                      <div key={idx} className="bg-copy-wash border border-copy/25 p-3 text-center space-y-1">
                        <div className="text-[11px] font-medium text-copy-deep uppercase">{item.month}</div>
                        <div className="text-sm font-semibold text-ink">Rs. {item.total.toLocaleString('en-IN')}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <h3 className="text-xs font-medium text-ink uppercase tracking-wider">Invoices & Payments Record</h3>
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-ink-faint absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search Transaction ID, UAN / Student ID, or Invoice No..."
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 bg-paper border border-rule text-xs text-ink focus:ring-2 focus:ring-copy focus:outline-none"
                  />
                </div>
              </div>

              <div className="register-scroll">
                <table className="register">
                  <thead>
                    <tr>
                      <th>Invoice No</th>
                      <th>Student Name (Code/UAN)</th>
                      <th>Category</th>
                      <th>Total Amount</th>
                      <th>Paid Amount</th>
                      <th>Tx ID / Ref</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule-soft font-medium text-ink">
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-ink-faint text-xs">
                          No invoices found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((inv) => {
                        const tx = inv.payments?.[0]?.transactionNumber || inv.payments?.[0]?.providerTxId || 'N/A';
                        return (
                          <tr key={inv.id} className="hover:bg-manila/25 transition-colors">
                            <td className="font-mono text-xs font-medium text-copy">{inv.invoiceNumber}</td>
                            <td>
                              <div className="font-medium text-ink">{inv.student?.profile?.fullName || 'N/A'}</div>
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
          )}

          {/* LEAVE REQUESTS TAB */}
          {activeTab === 'leave' && (
            <div className="bg-sheet p-6 border border-rule space-y-6">
              <div className="border-b border-rule-soft pb-4">
                <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-copy" />
                  <span>Staff leave requests</span>
                </h2>
                <p className="text-xs text-ink-soft">Approve or decline staff leave.</p>
              </div>

              {leaveRequests.length === 0 ? (
                <div className="text-center py-12 text-ink-soft text-sm bg-paper border border-rule-soft">
                  No staff leave requests submitted yet.
                </div>
              ) : (
                <div className="register-scroll">
                  <table className="register">
                    <thead>
                      <tr>
                        <th>Staff Member</th>
                        <th>Department</th>
                        <th>Dates & Duration</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th className="num">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rule-soft font-medium text-ink">
                      {leaveRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-manila/25 transition-colors">
                          <td>
                            <div className="font-medium text-ink">{req.staff?.profile?.fullName || 'Teacher'}</div>
                            <div className="text-[10px] text-ink-soft">{req.staff?.designation}</div>
                          </td>
                          <td className="text-xs text-ink-soft">{req.staff?.department?.name || 'General'}</td>
                          <td className="text-xs font-mono text-ink">
                            <div>{new Date(req.startDate).toLocaleDateString()} to {new Date(req.endDate).toLocaleDateString()}</div>
                            <div className="text-[10px] text-copy font-medium">{req.daysCount} Day(s)</div>
                          </td>
                          <td className="text-xs text-ink-soft max-w-xs">{req.reason}</td>
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
                                  className="bg-copy hover:bg-copy-deep text-white px-3 py-1.5 text-xs font-medium transition-all flex items-center space-x-1 cursor-pointer"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  onClick={() => handleLeaveDecision(req.id, 'REJECTED')}
                                  className="bg-rose-600 hover:bg-due-wash0 text-white px-3 py-1.5 text-xs font-medium transition-all flex items-center space-x-1 cursor-pointer"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-ink-faint font-semibold">Processed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* DAILY WORK UPDATES TAB */}
          {activeTab === 'work' && (
            <div className="bg-sheet p-6 border border-rule space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-rule-soft pb-4">
                <div>
                  <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                    <CheckSquare className="w-5 h-5 text-copy" />
                    <span>Staff work logs</span>
                  </h2>
                  <p className="text-xs text-ink-soft">What teachers logged, by date.</p>
                </div>

                <div className="flex items-center space-x-2 bg-paper p-2 border border-rule">
                  <span className="text-xs font-medium text-ink-soft">Select Date:</span>
                  <input
                    type="date"
                    value={workDateFilter}
                    onChange={(e) => handleDateFilterChange(e.target.value)}
                    className="bg-sheet px-3 py-1.5 border border-rule text-xs font-medium text-ink focus:outline-none cursor-pointer"
                  />
                  {workDateFilter && (
                    <button
                      onClick={() => handleDateFilterChange('')}
                      className="text-xs text-copy font-medium hover:underline ml-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {workUpdates.length === 0 ? (
                <div className="text-center py-12 text-ink-soft text-sm bg-paper border border-rule-soft">
                  No work updates recorded for the selected date.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {workUpdates.map((work) => (
                    <div key={work.id} className="p-5 border border-rule bg-paper space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-ink text-sm">{work.staff?.profile?.fullName || 'Faculty Teacher'}</h3>
                          <p className="text-xs text-ink-soft">{work.staff?.designation || work.department}</p>
                        </div>
                        <span className="text-xs font-mono text-copy font-medium bg-copy-wash px-2.5 py-1 border border-copy/25">
                          {new Date(work.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-ink leading-relaxed bg-sheet p-3 border border-rule">
                        {work.workSummary}
                      </p>
                      <div className="flex justify-between items-center text-xs text-ink-soft font-medium pt-1">
                        <span>Hours Worked: <strong className="text-ink">{work.hoursWorked} hrs</strong></span>
                        <span className="text-copy font-medium">✓ Logged</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CAREERS & APPLICATIONS TAB */}
          {activeTab === 'careers' && (
            <div className="bg-sheet p-6 border border-rule space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-rule-soft pb-4">
                <div>
                  <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                    <Briefcase className="w-5 h-5 text-copy" />
                    <span>Openings and applicants</span>
                  </h2>
                  <p className="text-xs text-ink-soft">Openings, their forms, and applicants in the order they applied.</p>
                </div>

                <div className="bg-ink p-1.5 border border-ink/20 flex space-x-1">
                  <button
                    onClick={() => setCareerSubTab('CAREER')}
                    className={`px-4 py-2 text-xs font-medium transition-all cursor-pointer ${
                      careerSubTab === 'CAREER'
                        ? 'bg-copy text-white'
                        : 'text-ink-faint hover:text-white'
                    }`}
                  >
                    1. Career
                  </button>
                  <button
                    onClick={() => setCareerSubTab('FORM')}
                    className={`px-4 py-2 text-xs font-medium transition-all cursor-pointer ${
                      careerSubTab === 'FORM'
                        ? 'bg-copy text-white'
                        : 'text-ink-faint hover:text-white'
                    }`}
                  >
                    2. Form
                  </button>
                  <button
                    onClick={() => setCareerSubTab('APPLICATION')}
                    className={`px-4 py-2 text-xs font-medium transition-all cursor-pointer ${
                      careerSubTab === 'APPLICATION'
                        ? 'bg-copy text-white'
                        : 'text-ink-faint hover:text-white'
                    }`}
                  >
                    3. Application
                  </button>
                </div>
              </div>

              {/* SUB-TAB 1: CAREER */}
              {careerSubTab === 'CAREER' && (
                <div className="space-y-8">
                  <form onSubmit={handlePostJob} className="bg-paper p-6 border border-rule space-y-4">
                    <h3 className="text-sm font-medium text-ink flex items-center space-x-2">
                      <Plus className="w-4 h-4 text-copy" />
                      <span>Post an opening</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-ink mb-1">Job Title *</label>
                        <input
                          type="text"
                          required
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          placeholder="e.g. Senior Physics PGT Teacher"
                          className="w-full px-3.5 py-2.5 border border-rule text-sm focus:ring-2 focus:ring-copy focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-ink mb-1">Department *</label>
                        <select
                          value={jobDept}
                          onChange={(e) => setJobDept(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-rule text-sm focus:ring-2 focus:ring-copy focus:outline-none"
                        >
                          <option value="Science & Mathematics">Science & Mathematics</option>
                          <option value="Languages & Literature">Languages & Literature</option>
                          <option value="Social Sciences & Humanities">Social Sciences & Humanities</option>
                          <option value="Sports & Physical Education">Sports & Physical Education</option>
                          <option value="Administration & Operations">Administration & Operations</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-ink mb-1">Experience Required</label>
                        <input
                          type="text"
                          value={jobExp}
                          onChange={(e) => setJobExp(e.target.value)}
                          placeholder="e.g. 3-5 Years"
                          className="w-full px-3.5 py-2.5 border border-rule text-sm focus:ring-2 focus:ring-copy focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-ink mb-1">Salary Range</label>
                        <input
                          type="text"
                          value={jobSalary}
                          onChange={(e) => setJobSalary(e.target.value)}
                          placeholder="e.g. Rs. 45,000 - 60,000"
                          className="w-full px-3.5 py-2.5 border border-rule text-sm focus:ring-2 focus:ring-copy focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-ink mb-1">Application Deadline</label>
                        <input
                          type="date"
                          value={jobDeadline}
                          onChange={(e) => setJobDeadline(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-rule text-sm focus:ring-2 focus:ring-copy focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ink mb-1">Job Description *</label>
                      <textarea
                        rows={2}
                        required
                        value={jobDesc}
                        onChange={(e) => setJobDesc(e.target.value)}
                        placeholder="Detailed role responsibilities..."
                        className="w-full px-3.5 py-2 border border-rule text-sm focus:ring-2 focus:ring-copy focus:outline-none"
                      ></textarea>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ink mb-1">Requirements & Qualifications</label>
                      <input
                        type="text"
                        value={jobReq}
                        onChange={(e) => setJobReq(e.target.value)}
                        placeholder="e.g. M.Sc Physics with B.Ed"
                        className="w-full px-3.5 py-2.5 border border-rule text-sm focus:ring-2 focus:ring-copy focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="bg-copy hover:bg-copy-deep text-white font-medium px-6 py-3 text-xs flex items-center space-x-2 cursor-pointer transition-all"
                    >
                      <Send className="w-4 h-4" />
                      <span>Post opening</span>
                    </button>
                  </form>

                  <div className="space-y-4">
                    <h3 className="text-xs font-medium text-ink uppercase tracking-wider">Posted Jobs Directory</h3>
                    {jobOpenings.length === 0 ? (
                      <div className="text-center py-8 text-ink-faint text-xs bg-paper">
                        No job openings created yet. Use the form above to post a job.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {jobOpenings.map((job) => (
                          <div key={job.id} className="p-5 border border-rule bg-sheet space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium text-ink text-base">{job.title}</h4>
                                <span className="text-[10px] font-medium text-copy bg-copy-wash px-2 py-0.5 uppercase">
                                  {job.department}
                                </span>
                              </div>
                              <span
                                className={`mark ${
                                  job.isPublished
                                    ? 'bg-paid-wash text-paid'
                                    : 'bg-manila/50 text-ink'
                                }`}
                              >
                                {job.isPublished ? 'Visible on Careers' : 'Hidden (Soft Deleted)'}
                              </span>
                            </div>

                            <p className="text-xs text-ink-soft line-clamp-2">{job.description}</p>

                            <div className="flex items-center justify-between pt-2 border-t border-rule-soft">
                              <span className="text-[11px] text-ink-soft">
                                Applicants: <strong>{job._count?.applications ?? 0}</strong>
                              </span>

                              {job.isPublished ? (
                                <button
                                  onClick={() => handleTogglePublishJob(job.id, false)}
                                  className="bg-due-wash hover:bg-due-wash text-due border border-due/25 px-3.5 py-1.5 text-xs font-medium flex items-center space-x-1.5 cursor-pointer transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-due" />
                                  <span>Unpublish</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleTogglePublishJob(job.id, true)}
                                  className="bg-copy-wash hover:bg-copy-wash text-copy border border-copy/25 px-3.5 py-1.5 text-xs font-medium flex items-center space-x-1.5 cursor-pointer transition-all"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-copy" />
                                  <span>Repost Job</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: FORM */}
              {careerSubTab === 'FORM' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-ink">Select Posted Job Opening *</label>
                    <select
                      value={selectedFormJobId}
                      onChange={(e) => handleSelectJobForForm(e.target.value)}
                      className="w-full max-w-md px-3.5 py-2.5 bg-paper border border-rule text-sm font-medium text-ink focus:ring-2 focus:ring-copy focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Select a Posted Job --</option>
                      {jobOpenings.map((job) => (
                        <option key={job.id} value={job.id}>
                          {job.title} ({job.department})
                        </option>
                      ))}
                    </select>
                  </div>

                  {!selectedFormJobId ? (
                    <div className="text-center py-12 text-ink-soft text-sm bg-paper border border-rule-soft">
                      Select a job opening from the dropdown to build required custom form fields.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-paper p-5 border border-rule space-y-4">
                        <h4 className="text-xs font-medium text-ink uppercase tracking-wider">
                          Google Forms Custom Requirement Builder
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div className="sm:col-span-2">
                            <input
                              type="text"
                              placeholder="Question / Requirement Label"
                              value={newQuestionLabel}
                              onChange={(e) => setNewQuestionLabel(e.target.value)}
                              className="w-full px-3.5 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none"
                            />
                          </div>

                          <div>
                            <select
                              value={newFieldType}
                              onChange={(e) => setNewFieldType(e.target.value)}
                              className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none"
                            >
                              <option value="text">Short Text</option>
                              <option value="textarea">Paragraph / Essay</option>
                              <option value="number">Numeric Answer</option>
                              <option value="file">Document Upload</option>
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={handleAddFormField}
                            className="bg-ink hover:bg-copy-deep text-white px-4 py-2 text-xs font-medium transition-all cursor-pointer"
                          >
                            + Add Question
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-medium text-ink uppercase tracking-wider">
                          Configured Form Fields ({formFields.length})
                        </h4>
                        {formFields.length === 0 ? (
                          <p className="text-xs text-ink-faint italic">No custom fields added yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {formFields.map((field, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-sheet p-3.5 border border-rule text-xs">
                                <span className="font-medium text-ink">{idx + 1}. {field.label}</span>
                                <div className="flex items-center space-x-3">
                                  <span className="font-mono text-ink-soft bg-paper px-2 py-0.5 rounded">
                                    Type: {field.type}
                                  </span>
                                  <button
                                    onClick={() => setFormFields(formFields.filter((_, i) => i !== idx))}
                                    className="text-due hover:text-due font-medium"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveFormFields}
                        className="bg-copy hover:bg-copy-deep text-white font-medium px-6 py-3 text-xs transition-all cursor-pointer"
                      >
                        Save Form Configuration
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB 3: APPLICATION */}
              {careerSubTab === 'APPLICATION' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-ink">Select Job Opening to View Applications (FIFO Order) *</label>
                    <select
                      value={selectedAppJobId}
                      onChange={(e) => handleSelectJobForApplications(e.target.value)}
                      className="w-full max-w-md px-3.5 py-2.5 bg-paper border border-rule text-sm font-medium text-ink focus:ring-2 focus:ring-copy focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Select a Job Opening --</option>
                      {jobOpenings.map((job) => (
                        <option key={job.id} value={job.id}>
                          {job.title} ({job._count?.applications ?? 0} Applications)
                        </option>
                      ))}
                    </select>
                  </div>

                  {!selectedAppJobId ? (
                    <div className="text-center py-12 text-ink-soft text-sm bg-paper border border-rule-soft">
                      Select a job opening above to display received candidate applications ordered by FIFO (earliest first).
                    </div>
                  ) : loadingApplications ? (
                    <div className="text-center py-12 text-ink-soft text-sm">
                      Loading candidate applications in FIFO queue...
                    </div>
                  ) : fifoApplications.length === 0 ? (
                    <div className="text-center py-12 text-ink-faint text-sm bg-paper border border-rule-soft">
                      No applications submitted for this position yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-medium text-ink uppercase tracking-wider">
                          Applications Sorted by FIFO Principle ({fifoApplications.length})
                        </h4>
                        <span className="text-[11px] text-copy font-medium">Earliest Applicant First (Queue #1)</span>
                      </div>

                      <div className="space-y-3">
                        {fifoApplications.map((app, idx) => (
                          <div key={app.id} className="p-5 border border-rule bg-paper space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center space-x-3">
                                <span className="w-7 h-7 bg-ink text-copy flex items-center justify-center font-medium text-xs">
                                  #{idx + 1}
                                </span>
                                <div>
                                  <h5 className="font-medium text-ink text-base">{app.applicantName}</h5>
                                  <p className="text-xs text-ink-soft">{app.email} • {app.phone}</p>
                                </div>
                              </div>

                              <span className="text-[11px] font-mono text-ink-soft">
                                Applied: {new Date(app.createdAt).toLocaleString()}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-sheet p-3.5 border border-rule">
                              <div>Qualification: <strong className="text-ink">{app.qualification}</strong></div>
                              <div>Experience: <strong className="text-ink">{app.experience}</strong></div>
                              <div>
                                Resume: <a href={app.resumeUrl} target="_blank" rel="noreferrer" className="text-copy font-medium underline">View Document</a>
                              </div>
                            </div>

                            {app.coverLetter && (
                              <p className="text-xs text-ink-soft italic bg-sheet p-3 border border-rule">
                                "{app.coverLetter}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
