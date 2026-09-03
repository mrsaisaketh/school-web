import React, { useEffect, useState } from 'react';
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
    const saved = localStorage.getItem('erp_user');
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const fetchDashboardData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/reports').then((r) => r.json()),
      fetch('/api/students?limit=100').then((r) => r.json()),
      fetch('/api/staff').then((r) => r.json()),
      fetch('/api/invoices').then((r) => r.json()),
      fetch('/api/leave').then((r) => r.json()),
      fetch('/api/work-updates').then((r) => r.json()),
      fetch('/api/careers?all=true').then((r) => r.json()),
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
    fetch(`/api/attendance?studentId=${stId}`)
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
      const res = await fetch('/api/leave', {
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
      const res = await fetch('/api/careers', {
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
      const res = await fetch('/api/careers', {
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
      const res = await fetch('/api/careers', {
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
    fetch(`/api/careers?jobOpeningId=${jobId}`)
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
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Header userRole="SUPER_ADMIN" userName={currentUser?.fullName || 'Super Admin'} />

      <div className="flex flex-1">
        <Sidebar role="SUPER_ADMIN" activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-8 overflow-y-auto space-y-8">
          {/* KPI Summary Cards - STRICTLY PRESENT ON OVERVIEW DASHBOARD ONLY */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex justify-between items-center text-[#0b192c]">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Students</span>
                  <Users className="w-5 h-5 text-[#0d9488]" />
                </div>
                <div className="text-3xl font-extrabold text-[#0b192c]">{metrics?.totalStudents ?? students.length}</div>
                <div className="text-xs text-slate-500 flex items-center space-x-1">
                  <span className="text-[#0d9488] font-bold">{metrics?.activeStudents ?? students.length} Active</span>
                  <span>•</span>
                  <span className="text-rose-600 font-bold">{metrics?.leftStudents ?? 0} Left</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex justify-between items-center text-[#0d9488]">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Fee Collection</span>
                  <CreditCard className="w-5 h-5 text-[#0d9488]" />
                </div>
                <div className="text-3xl font-extrabold text-[#0b192c]">
                  Rs. {(metrics?.feeCollection ?? 20000).toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-slate-500">
                  Pending Fees: <span className="font-bold text-amber-600">Rs. {(metrics?.pendingFees ?? 20000).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex justify-between items-center text-[#0b192c]">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Faculty & Staff</span>
                  <UserCheck className="w-5 h-5 text-[#0d9488]" />
                </div>
                <div className="text-3xl font-extrabold text-[#0b192c]">{metrics?.totalStaff ?? staffList.length}</div>
                <div className="text-xs text-[#0d9488] font-bold">100% Verified Profiles</div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex justify-between items-center text-amber-600">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Operations</span>
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-3xl font-extrabold text-[#0b192c]">
                  {leaveRequests.filter((l) => l.status === 'PENDING').length}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {leaveRequests.filter((l) => l.status === 'PENDING').length} Pending Leave Requests
                </div>
              </div>
            </div>
          )}

          {/* OVERVIEW TAB CONTENT */}
          {activeTab === 'overview' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-[#0b192c]">Executive System Overview</h2>
              <p className="text-xs text-slate-500">Select an operational module from the sidebar navigation menu to view or manage specific records.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-sm font-bold text-[#0b192c]">Students Module</div>
                  <div className="text-xs text-slate-500 mt-1">Manage student roster with search & class/section filters.</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-sm font-bold text-[#0b192c]">Faculty Staff</div>
                  <div className="text-xs text-slate-500 mt-1">Review active teachers and staff members list.</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-sm font-bold text-[#0b192c]">Careers & Applications</div>
                  <div className="text-xs text-slate-500 mt-1">Post jobs, build custom forms, and review FIFO applications.</div>
                </div>
              </div>
            </div>
          )}

          {/* STUDENTS TAB */}
          {activeTab === 'students' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#0b192c] flex items-center space-x-2">
                    <Users className="w-5 h-5 text-[#0d9488]" />
                    <span>Students Directory ({filteredStudents.length})</span>
                  </h2>
                  <p className="text-xs text-slate-500">Filter students by name, student code/ID, class, and section</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search Name or ID..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-[#0d9488] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold">
                    <Filter className="w-3.5 h-3.5 text-[#0d9488]" />
                    <span className="text-slate-500">Class:</span>
                    <select
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                      className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">All Classes</option>
                      <option value="Class 10">Class 10</option>
                      <option value="Class 9">Class 9</option>
                      <option value="Class 8">Class 8</option>
                      <option value="Class 7">Class 7</option>
                      <option value="Class 6">Class 6</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold">
                    <span className="text-slate-500">Section:</span>
                    <select
                      value={sectionFilter}
                      onChange={(e) => setSectionFilter(e.target.value)}
                      className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer"
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
                <div className="text-center py-12 text-slate-500 text-sm bg-slate-50 rounded-xl border border-slate-100">
                  No student records match the selected search or dropdown filters.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#0b192c] text-white text-xs uppercase tracking-wider">
                        <th className="p-3.5 rounded-l-xl">Student Code / ID</th>
                        <th className="p-3.5">Full Name</th>
                        <th className="p-3.5">Admission No</th>
                        <th className="p-3.5">Roll No</th>
                        <th className="p-3.5">Class & Section</th>
                        <th className="p-3.5 rounded-r-xl">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {filteredStudents.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3.5 font-mono text-xs font-bold text-[#0d9488]">{st.studentCode}</td>
                          <td className="p-3.5 font-bold text-[#0b192c]">{st.profile?.fullName || 'N/A'}</td>
                          <td className="p-3.5 text-xs text-slate-600">{st.admissionNumber}</td>
                          <td className="p-3.5 text-xs text-slate-600">{st.rollNumber}</td>
                          <td className="p-3.5 text-xs font-semibold text-slate-700">
                            {st.enrollments?.[0]?.class?.name || 'Class 10'}-{st.enrollments?.[0]?.section?.name || 'A'}
                          </td>
                          <td className="p-3.5">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                              st.status === 'ACTIVE' ? 'bg-teal-100 text-teal-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {st.status}
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-[#0b192c] flex items-center space-x-2">
                  <UserCheck className="w-5 h-5 text-[#0d9488]" />
                  <span>Currently Working Faculty & Staff ({staffList.length})</span>
                </h2>
                <p className="text-xs text-slate-500">List of verified teachers, administrative staff, and bursar officers</p>
              </div>

              {staffList.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm bg-slate-50 rounded-xl border border-slate-100">
                  No staff members currently registered in database.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#0b192c] text-white text-xs uppercase tracking-wider">
                        <th className="p-3.5 rounded-l-xl">Emp Code</th>
                        <th className="p-3.5">Teacher Name</th>
                        <th className="p-3.5">Designation</th>
                        <th className="p-3.5">Department</th>
                        <th className="p-3.5">Qualification</th>
                        <th className="p-3.5">Joining Date</th>
                        <th className="p-3.5 rounded-r-xl">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {staffList.map((stf) => (
                        <tr key={stf.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3.5 font-mono text-xs text-[#0d9488] font-bold">{stf.employeeCode}</td>
                          <td className="p-3.5 font-bold text-[#0b192c]">{stf.profile?.fullName || 'N/A'}</td>
                          <td className="p-3.5 text-xs text-slate-700">{stf.designation}</td>
                          <td className="p-3.5 text-xs text-slate-600">{stf.department?.name || 'General'}</td>
                          <td className="p-3.5 text-xs text-slate-600">{stf.qualification}</td>
                          <td className="p-3.5 text-xs text-slate-500">
                            {new Date(stf.joiningDate).toLocaleDateString()}
                          </td>
                          <td className="p-3.5">
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase bg-teal-100 text-teal-800">
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#0b192c] flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-[#0d9488]" />
                    <span>Student Attendance Lookup</span>
                  </h2>
                  <p className="text-xs text-slate-500">Select a student to display their full attendance log and summary</p>
                </div>

                <div className="min-w-[280px]">
                  <select
                    value={selectedStudentId}
                    onChange={(e) => {
                      setSelectedStudentId(e.target.value);
                      fetchStudentAttendance(e.target.value);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#0d9488] focus:outline-none cursor-pointer"
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
                <div className="text-center py-12 text-slate-500 text-sm bg-slate-50 rounded-xl border border-slate-100">
                  Please select a student from the dropdown above to view their attendance record.
                </div>
              ) : loadingAttendance ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  Fetching student attendance data...
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                      <div className="text-2xl font-extrabold text-[#0b192c]">
                        {studentAttendanceRecord?.stats?.total ?? 0}
                      </div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase mt-1">Total Days</div>
                    </div>

                    <div className="bg-teal-50 p-4 rounded-xl border border-teal-200 text-center">
                      <div className="text-2xl font-extrabold text-[#0d9488]">
                        {studentAttendanceRecord?.stats?.present ?? 0}
                      </div>
                      <div className="text-[11px] font-bold text-teal-800 uppercase mt-1">Present Days</div>
                    </div>

                    <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 text-center">
                      <div className="text-2xl font-extrabold text-rose-700">
                        {studentAttendanceRecord?.stats?.absent ?? 0}
                      </div>
                      <div className="text-[11px] font-bold text-rose-800 uppercase mt-1">Absent Days</div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-center">
                      <div className="text-2xl font-extrabold text-blue-900">
                        {studentAttendanceRecord?.stats?.percentage ?? 100}%
                      </div>
                      <div className="text-[11px] font-bold text-blue-800 uppercase mt-1">Attendance Rate</div>
                    </div>
                  </div>

                  <div className="table-responsive">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-[#0b192c] text-white text-xs uppercase tracking-wider">
                          <th className="p-3.5 rounded-l-xl">Date</th>
                          <th className="p-3.5">Class & Section</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5 rounded-r-xl">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                        {(studentAttendanceRecord?.attendances || []).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-slate-400 text-xs">
                              No attendance entries recorded for this student yet.
                            </td>
                          </tr>
                        ) : (
                          studentAttendanceRecord.attendances.map((att) => (
                            <tr key={att.id} className="hover:bg-slate-50">
                              <td className="p-3.5 text-xs font-mono text-slate-700">
                                {new Date(att.date).toLocaleDateString()}
                              </td>
                              <td className="p-3.5 text-xs font-bold text-[#0b192c]">
                                {att.class?.name || 'Class 10'}-{att.section?.name || 'A'}
                              </td>
                              <td className="p-3.5">
                                <span
                                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                                    att.status === 'PRESENT'
                                      ? 'bg-teal-100 text-teal-800'
                                      : att.status === 'ABSENT'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {att.status}
                                </span>
                              </td>
                              <td className="p-3.5 text-xs text-slate-500">{att.remarks || 'Normal'}</td>
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4 space-y-1">
                <h2 className="text-lg font-bold text-[#0b192c] flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-[#0d9488]" />
                  <span>Fees Collection & Invoice Management</span>
                </h2>
                <p className="text-xs text-slate-500">Monthly fees received breakdown and older invoices search bar</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#0b192c] uppercase tracking-wider">Total Fees Received by Month</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {monthlySummary.length === 0 ? (
                    <div className="col-span-full p-4 bg-slate-50 text-slate-400 text-xs text-center rounded-xl border border-slate-100">
                      No monthly payment records available.
                    </div>
                  ) : (
                    monthlySummary.map((item, idx) => (
                      <div key={idx} className="bg-teal-50 border border-teal-200 p-3 rounded-xl text-center space-y-1">
                        <div className="text-[11px] font-bold text-teal-800 uppercase">{item.month}</div>
                        <div className="text-sm font-extrabold text-[#0b192c]">Rs. {item.total.toLocaleString('en-IN')}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <h3 className="text-xs font-bold text-[#0b192c] uppercase tracking-wider">Invoices & Payments Record</h3>
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search Transaction ID, UAN / Student ID, or Invoice No..."
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-[#0d9488] focus:outline-none"
                  />
                </div>
              </div>

              <div className="table-responsive">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#0b192c] text-white text-xs uppercase tracking-wider">
                      <th className="p-3.5 rounded-l-xl">Invoice No</th>
                      <th className="p-3.5">Student Name (Code/UAN)</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Total Amount</th>
                      <th className="p-3.5">Paid Amount</th>
                      <th className="p-3.5">Tx ID / Ref</th>
                      <th className="p-3.5 rounded-r-xl">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                          No invoices found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((inv) => {
                        const tx = inv.payments?.[0]?.transactionNumber || inv.payments?.[0]?.providerTxId || 'N/A';
                        return (
                          <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3.5 font-mono text-xs font-bold text-[#0d9488]">{inv.invoiceNumber}</td>
                            <td className="p-3.5">
                              <div className="font-bold text-[#0b192c]">{inv.student?.profile?.fullName || 'N/A'}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{inv.student?.studentCode}</div>
                            </td>
                            <td className="p-3.5 text-xs text-slate-600">{inv.feeCategory}</td>
                            <td className="p-3.5 text-xs font-bold text-slate-900">
                              Rs. {inv.totalAmount.toLocaleString('en-IN')}
                            </td>
                            <td className="p-3.5 text-xs font-bold text-[#0d9488]">
                              Rs. {inv.paidAmount.toLocaleString('en-IN')}
                            </td>
                            <td className="p-3.5 font-mono text-xs text-slate-500">{tx}</td>
                            <td className="p-3.5">
                              <span
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                                  inv.status === 'PAID'
                                    ? 'bg-teal-100 text-teal-800'
                                    : inv.status === 'PARTIALLY_PAID'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {inv.status}
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-[#0b192c] flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-[#0d9488]" />
                  <span>Staff Leave Applications & Approvals</span>
                </h2>
                <p className="text-xs text-slate-500">Review staff leave requests and provide instant Approve or Reject decisions</p>
              </div>

              {leaveRequests.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm bg-slate-50 rounded-xl border border-slate-100">
                  No staff leave requests submitted yet.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#0b192c] text-white text-xs uppercase tracking-wider">
                        <th className="p-3.5 rounded-l-xl">Staff Member</th>
                        <th className="p-3.5">Department</th>
                        <th className="p-3.5">Dates & Duration</th>
                        <th className="p-3.5">Reason</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right rounded-r-xl">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {leaveRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3.5">
                            <div className="font-bold text-[#0b192c]">{req.staff?.profile?.fullName || 'Teacher'}</div>
                            <div className="text-[10px] text-slate-500">{req.staff?.designation}</div>
                          </td>
                          <td className="p-3.5 text-xs text-slate-600">{req.staff?.department?.name || 'General'}</td>
                          <td className="p-3.5 text-xs font-mono text-slate-700">
                            <div>{new Date(req.startDate).toLocaleDateString()} to {new Date(req.endDate).toLocaleDateString()}</div>
                            <div className="text-[10px] text-[#0d9488] font-bold">{req.daysCount} Day(s)</div>
                          </td>
                          <td className="p-3.5 text-xs text-slate-600 max-w-xs">{req.reason}</td>
                          <td className="p-3.5">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                                req.status === 'APPROVED'
                                  ? 'bg-teal-100 text-teal-800'
                                  : req.status === 'REJECTED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {req.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            {req.status === 'PENDING' ? (
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handleLeaveDecision(req.id, 'APPROVED')}
                                  className="bg-[#0d9488] hover:bg-[#0f766e] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  onClick={() => handleLeaveDecision(req.id, 'REJECTED')}
                                  className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 font-semibold">Processed</span>
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#0b192c] flex items-center space-x-2">
                    <CheckSquare className="w-5 h-5 text-[#0d9488]" />
                    <span>Staff Daily Work Updates Showcase</span>
                  </h2>
                  <p className="text-xs text-slate-500">Showcase works done by teachers and inspect past dates</p>
                </div>

                <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-300">
                  <span className="text-xs font-bold text-slate-600">Select Date:</span>
                  <input
                    type="date"
                    value={workDateFilter}
                    onChange={(e) => handleDateFilterChange(e.target.value)}
                    className="bg-white px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                  />
                  {workDateFilter && (
                    <button
                      onClick={() => handleDateFilterChange('')}
                      className="text-xs text-[#0d9488] font-bold hover:underline ml-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {workUpdates.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm bg-slate-50 rounded-xl border border-slate-100">
                  No work updates recorded for the selected date.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {workUpdates.map((work) => (
                    <div key={work.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-[#0b192c] text-sm">{work.staff?.profile?.fullName || 'Faculty Teacher'}</h3>
                          <p className="text-xs text-slate-500">{work.staff?.designation || work.department}</p>
                        </div>
                        <span className="text-xs font-mono text-[#0d9488] font-bold bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                          {new Date(work.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                        {work.workSummary}
                      </p>
                      <div className="flex justify-between items-center text-xs text-slate-500 font-medium pt-1">
                        <span>Hours Worked: <strong className="text-slate-800">{work.hoursWorked} hrs</strong></span>
                        <span className="text-teal-700 font-bold">✓ Logged</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CAREERS & APPLICATIONS TAB */}
          {activeTab === 'careers' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#0b192c] flex items-center space-x-2">
                    <Briefcase className="w-5 h-5 text-[#0d9488]" />
                    <span>Careers & Recruitment Control Center</span>
                  </h2>
                  <p className="text-xs text-slate-500">Post jobs, build custom forms, and view applicant submissions (FIFO order)</p>
                </div>

                <div className="bg-[#0b192c] p-1.5 rounded-xl border border-[#1e3e62] flex space-x-1">
                  <button
                    onClick={() => setCareerSubTab('CAREER')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      careerSubTab === 'CAREER'
                        ? 'bg-[#0d9488] text-white shadow-md'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    1. Career
                  </button>
                  <button
                    onClick={() => setCareerSubTab('FORM')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      careerSubTab === 'FORM'
                        ? 'bg-[#0d9488] text-white shadow-md'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    2. Form
                  </button>
                  <button
                    onClick={() => setCareerSubTab('APPLICATION')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      careerSubTab === 'APPLICATION'
                        ? 'bg-[#0d9488] text-white shadow-md'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    3. Application
                  </button>
                </div>
              </div>

              {/* SUB-TAB 1: CAREER */}
              {careerSubTab === 'CAREER' && (
                <div className="space-y-8">
                  <form onSubmit={handlePostJob} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                    <h3 className="text-sm font-bold text-[#0b192c] flex items-center space-x-2">
                      <Plus className="w-4 h-4 text-[#0d9488]" />
                      <span>Post a New Job Opening to Careers Page</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Job Title *</label>
                        <input
                          type="text"
                          required
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          placeholder="e.g. Senior Physics PGT Teacher"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#0d9488] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Department *</label>
                        <select
                          value={jobDept}
                          onChange={(e) => setJobDept(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#0d9488] focus:outline-none"
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
                        <label className="block text-xs font-bold text-slate-700 mb-1">Experience Required</label>
                        <input
                          type="text"
                          value={jobExp}
                          onChange={(e) => setJobExp(e.target.value)}
                          placeholder="e.g. 3-5 Years"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#0d9488] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Salary Range</label>
                        <input
                          type="text"
                          value={jobSalary}
                          onChange={(e) => setJobSalary(e.target.value)}
                          placeholder="e.g. Rs. 45,000 - 60,000"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#0d9488] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Application Deadline</label>
                        <input
                          type="date"
                          value={jobDeadline}
                          onChange={(e) => setJobDeadline(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#0d9488] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Job Description *</label>
                      <textarea
                        rows={2}
                        required
                        value={jobDesc}
                        onChange={(e) => setJobDesc(e.target.value)}
                        placeholder="Detailed role responsibilities..."
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#0d9488] focus:outline-none"
                      ></textarea>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Requirements & Qualifications</label>
                      <input
                        type="text"
                        value={jobReq}
                        onChange={(e) => setJobReq(e.target.value)}
                        placeholder="e.g. M.Sc Physics with B.Ed"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#0d9488] focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="bg-[#0d9488] hover:bg-[#0f766e] text-white font-bold px-6 py-3 rounded-xl text-xs shadow-md flex items-center space-x-2 cursor-pointer transition-all"
                    >
                      <Send className="w-4 h-4" />
                      <span>Post Job Opening Live</span>
                    </button>
                  </form>

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-[#0b192c] uppercase tracking-wider">Posted Jobs Directory</h3>
                    {jobOpenings.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-xl">
                        No job openings created yet. Use the form above to post a job.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {jobOpenings.map((job) => (
                          <div key={job.id} className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-sm">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-[#0b192c] text-base">{job.title}</h4>
                                <span className="text-[10px] font-bold text-[#0d9488] bg-teal-50 px-2 py-0.5 rounded-md uppercase">
                                  {job.department}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                                  job.isPublished
                                    ? 'bg-teal-100 text-teal-800'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {job.isPublished ? 'Visible on Careers' : 'Hidden (Soft Deleted)'}
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 line-clamp-2">{job.description}</p>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                              <span className="text-[11px] text-slate-500">
                                Applicants: <strong>{job._count?.applications ?? 0}</strong>
                              </span>

                              {job.isPublished ? (
                                <button
                                  onClick={() => handleTogglePublishJob(job.id, false)}
                                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Delete (Hide)</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleTogglePublishJob(job.id, true)}
                                  className="bg-teal-50 hover:bg-teal-100 text-[#0d9488] border border-teal-200 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-[#0d9488]" />
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
                    <label className="block text-xs font-bold text-[#0b192c]">Select Posted Job Opening *</label>
                    <select
                      value={selectedFormJobId}
                      onChange={(e) => handleSelectJobForForm(e.target.value)}
                      className="w-full max-w-md px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#0d9488] focus:outline-none cursor-pointer"
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
                    <div className="text-center py-12 text-slate-500 text-sm bg-slate-50 rounded-xl border border-slate-100">
                      Select a job opening from the dropdown to build required custom form fields.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                        <h4 className="text-xs font-bold text-[#0b192c] uppercase tracking-wider">
                          Google Forms Custom Requirement Builder
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div className="sm:col-span-2">
                            <input
                              type="text"
                              placeholder="Question / Requirement Label"
                              value={newQuestionLabel}
                              onChange={(e) => setNewQuestionLabel(e.target.value)}
                              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#0d9488] focus:outline-none"
                            />
                          </div>

                          <div>
                            <select
                              value={newFieldType}
                              onChange={(e) => setNewFieldType(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#0d9488] focus:outline-none"
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
                            className="bg-[#0b192c] hover:bg-[#1e3e62] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                          >
                            + Add Question
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-[#0b192c] uppercase tracking-wider">
                          Configured Form Fields ({formFields.length})
                        </h4>
                        {formFields.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No custom fields added yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {formFields.map((field, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
                                <span className="font-bold text-[#0b192c]">{idx + 1}. {field.label}</span>
                                <div className="flex items-center space-x-3">
                                  <span className="font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                    Type: {field.type}
                                  </span>
                                  <button
                                    onClick={() => setFormFields(formFields.filter((_, i) => i !== idx))}
                                    className="text-rose-600 hover:text-rose-800 font-bold"
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
                        className="bg-[#0d9488] hover:bg-[#0f766e] text-white font-bold px-6 py-3 rounded-xl text-xs shadow-md transition-all cursor-pointer"
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
                    <label className="block text-xs font-bold text-[#0b192c]">Select Job Opening to View Applications (FIFO Order) *</label>
                    <select
                      value={selectedAppJobId}
                      onChange={(e) => handleSelectJobForApplications(e.target.value)}
                      className="w-full max-w-md px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#0d9488] focus:outline-none cursor-pointer"
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
                    <div className="text-center py-12 text-slate-500 text-sm bg-slate-50 rounded-xl border border-slate-100">
                      Select a job opening above to display received candidate applications ordered by FIFO (earliest first).
                    </div>
                  ) : loadingApplications ? (
                    <div className="text-center py-12 text-slate-500 text-sm">
                      Loading candidate applications in FIFO queue...
                    </div>
                  ) : fifoApplications.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm bg-slate-50 rounded-xl border border-slate-100">
                      No applications submitted for this position yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-[#0b192c] uppercase tracking-wider">
                          Applications Sorted by FIFO Principle ({fifoApplications.length})
                        </h4>
                        <span className="text-[11px] text-[#0d9488] font-bold">Earliest Applicant First (Queue #1)</span>
                      </div>

                      <div className="space-y-3">
                        {fifoApplications.map((app, idx) => (
                          <div key={app.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center space-x-3">
                                <span className="w-7 h-7 bg-[#0b192c] text-teal-300 rounded-full flex items-center justify-center font-bold text-xs">
                                  #{idx + 1}
                                </span>
                                <div>
                                  <h5 className="font-bold text-[#0b192c] text-base">{app.applicantName}</h5>
                                  <p className="text-xs text-slate-500">{app.email} • {app.phone}</p>
                                </div>
                              </div>

                              <span className="text-[11px] font-mono text-slate-500">
                                Applied: {new Date(app.createdAt).toLocaleString()}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white p-3.5 rounded-xl border border-slate-200">
                              <div>Qualification: <strong className="text-slate-800">{app.qualification}</strong></div>
                              <div>Experience: <strong className="text-slate-800">{app.experience}</strong></div>
                              <div>
                                Resume: <a href={app.resumeUrl} target="_blank" rel="noreferrer" className="text-[#0d9488] font-bold underline">View Document</a>
                              </div>
                            </div>

                            {app.coverLetter && (
                              <p className="text-xs text-slate-600 italic bg-white p-3 rounded-xl border border-slate-200">
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
