import React, { useEffect, useState } from 'react';
import { api, getUser } from '../lib/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import {
  CreditCard,
  DollarSign,
  Receipt,
  CheckCircle,
  XCircle,
  Search,
  BookOpen,
  UserCheck,
  Calendar,
  Clock,
  QrCode,
  ArrowRight,
  Info,
  Check,
  AlertCircle,
  FileText,
} from 'lucide-react';

export default function AccountsDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [currentUser, setCurrentUser] = useState(null);

  // Data Collections
  const [invoices, setInvoices] = useState([]);
  const [paymentsHistory, setPaymentsHistory] = useState([]);
  const [students, setStudents] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [academicClasses, setAcademicClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- DASHBOARD (OVERVIEW) STATE ---
  const [selectedSubject, setSelectedSubject] = useState('Physics');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  // --- FEE STRUCTURES & PAY FLOW STATE ---
  const [feeClassId, setFeeClassId] = useState('');
  const [feeSectionId, setFeeSectionId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Pay Modal / Form Steps State
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState({
    'Tuition Fee': false,
    'Transport Fee': false,
    'Books Fee': false,
    'Other Fee': false,
  });
  const [payAmount, setPayAmount] = useState('');
  const [payStep, setPayStep] = useState(1); // Step 1: Category & Amount, Step 2: QR & UTR Entry
  const [utrNumber, setUtrNumber] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  useEffect(() => {
    const saved = getUser();
    if (saved) setCurrentUser(saved);
  }, []);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api('/api/invoices').then((r) => r.json()),
      api('/api/students').then((r) => r.json()),
      api('/api/staff').then((r) => r.json()),
      api('/api/academic/setup').then((r) => r.json()),
    ])
      .then(([invRes, stuRes, stfRes, acadRes]) => {
        if (invRes.invoices) setInvoices(invRes.invoices);
        if (invRes.paymentsHistory) setPaymentsHistory(invRes.paymentsHistory);
        if (stuRes.students) setStudents(stuRes.students);
        if (stfRes.staffMembers) setStaffList(stfRes.staffMembers);
        if (acadRes.classes) setAcademicClasses(acadRes.classes);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter teachers by selected subject
  const subjectTeachers = staffList.filter((stf) => {
    const desg = (stf.designation || '').toLowerCase();
    const subj = (selectedSubject || '').toLowerCase();
    return desg.includes(subj) || stf.assignments?.some((a) => a.subject?.name?.toLowerCase().includes(subj));
  });

  const activeTeacher = staffList.find((t) => t.id === selectedTeacherId) || subjectTeachers[0] || staffList[0];

  // Compute teacher attendance & payroll details
  const getTeacherPayrollDetails = (t) => {
    if (!t) return null;
    const baseSalary = t.baseSalary || 45000;
    const totalWorkingDays = 26;
    const absentDays = t.employeeCode?.endsWith('2') ? 3 : 1;
    const presentDays = totalWorkingDays - absentDays;
    const lopDays = 1; // 1 Loss of pay day
    const casualLeaves = absentDays - lopDays; // Remaining casual leaves
    const perDaySalary = baseSalary / totalWorkingDays;
    const lopDeduction = Math.round(lopDays * perDaySalary);
    const netSalary = Math.round(baseSalary - lopDeduction);

    return {
      name: t.profile?.fullName || 'Teacher',
      employeeCode: t.employeeCode,
      designation: t.designation || 'Faculty Member',
      subject: selectedSubject,
      totalWorkingDays,
      presentDays,
      absentDays,
      baseSalary,
      netSalary,
      leaves: [
        { type: 'LOP (Loss of Pay)', days: lopDays, deduction: `Rs. ${lopDeduction.toLocaleString('en-IN')}`, status: 'Deducted' },
        { type: 'Casual Leave (CL)', days: casualLeaves, deduction: 'Rs. 0', status: 'Paid Leave' },
        { type: 'Sick Leave (SL)', days: 0, deduction: 'Rs. 0', status: 'Available' },
      ],
    };
  };

  const teacherDetails = getTeacherPayrollDetails(activeTeacher);

  // Student filtering for Fee Structures
  const filteredStudents = students.filter((st) => {
    const enrollment = st.enrollments?.[0];
    const matchesClass = !feeClassId || enrollment?.classId === feeClassId;
    const matchesSection = !feeSectionId || enrollment?.sectionId === feeSectionId;
    const q = studentSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      st.studentCode?.toLowerCase().includes(q) ||
      st.profile?.fullName?.toLowerCase().includes(q) ||
      st.rollNumber?.toLowerCase().includes(q);
    return matchesClass && matchesSection && matchesSearch;
  });

  // Calculate Student Ledger balance
  const getStudentFeeSummary = (student) => {
    if (!student) return { totalFee: 50000, paidAmount: 0, balanceAmount: 50000 };
    const stuInvoices = invoices.filter((i) => i.studentId === student.id);
    const totalFee = 50000;
    const paidAmount = stuInvoices
      .filter((i) => i.status === 'PAID')
      .reduce((sum, i) => sum + (i.paidAmount || 0), 0);
    const pendingAmount = stuInvoices
      .filter((i) => i.status === 'PENDING_APPROVAL')
      .reduce((sum, i) => sum + (i.totalAmount || 0), 0);
    const balanceAmount = Math.max(0, totalFee - paidAmount);

    return { totalFee, paidAmount, pendingAmount, balanceAmount };
  };

  // Toggle Fee Category Checkbox
  const handleCategoryToggle = (categoryKey) => {
    setSelectedCategories((prev) => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  const selectedCategoryList = Object.keys(selectedCategories).filter((k) => selectedCategories[k]);
  const hasSelectedCategory = selectedCategoryList.length > 0;

  // Open Pay Modal
  const handleOpenPay = (student) => {
    setSelectedStudent(student);
    const summary = getStudentFeeSummary(student);
    setPayAmount(String(summary.balanceAmount || 15000));
    setSelectedCategories({
      'Tuition Fee': true,
      'Transport Fee': false,
      'Books Fee': false,
      'Other Fee': false,
    });
    setPayStep(1);
    setUtrNumber('');
    setIsPayOpen(true);
  };

  // Submit Payment for Approval
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!utrNumber.trim()) {
      alert('Please enter the Transaction ID / UTR No. to proceed.');
      return;
    }
    try {
      setSubmittingPayment(true);
      const res = await api('/api/invoices/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          feeCategories: selectedCategoryList,
          amount: payAmount,
          utrNumber: utrNumber.trim(),
          paymentMethod: 'UPI',
          userRole: 'ACCOUNTS',
          profileId: currentUser?.id,
        }),
      });
      const data = await res.json();
      setSubmittingPayment(false);

      if (data.success) {
        alert(
          `Invoice ${data.invoice.invoiceNumber} generated & submitted for approval!\n\nUTR No: ${utrNumber}\nAmount: Rs. ${parseFloat(payAmount).toLocaleString('en-IN')}\n\nOnce approved in "Invoices Issued", the balance will update for both Accounts and User.`
        );
        setIsPayOpen(false);
        loadData();
      } else {
        alert(data.error || 'Failed to submit fee payment.');
      }
    } catch (err) {
      setSubmittingPayment(false);
      alert('Error submitting payment.');
    }
  };

  // Handle Approve Invoice
  const handleApproveInvoice = async (invoiceId) => {
    if (!confirm('Approve this invoice and verify payment? Balance will update immediately across Accounts & Student portal.')) return;
    try {
      const res = await api(`/api/invoices/${invoiceId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED', userRole: 'ACCOUNTS', profileId: currentUser?.id }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Invoice ${data.invoice.invoiceNumber} approved! Fee balance updated.`);
        loadData();
      }
    } catch (err) {
      alert('Error approving invoice');
    }
  };

  // Handle Reject Invoice
  const handleRejectInvoice = async (invoiceId) => {
    if (!confirm('Are you sure you want to reject and cancel this invoice?')) return;
    try {
      const res = await api(`/api/invoices/${invoiceId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED', userRole: 'ACCOUNTS', profileId: currentUser?.id }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Invoice rejected and cancelled.');
        loadData();
      }
    } catch (err) {
      alert('Error rejecting invoice');
    }
  };

  const pendingInvoices = invoices.filter((i) => i.status === 'PENDING_APPROVAL');

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Header userRole="ACCOUNTS" userName={currentUser?.fullName || 'Accounts & Bursar Officer'} />

      <div className="flex flex-1">
        <Sidebar role="ACCOUNTS" activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-8 overflow-y-auto space-y-8">
          {/* TAB 1: DASHBOARD (OVERVIEW) */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Latest Transactions & Invoices Feed */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#0b192c] flex items-center space-x-2">
                      <Receipt className="w-5 h-5 text-[#0d9488]" />
                      <span>Latest Transactions & Issued Invoices Showcase</span>
                    </h2>
                    <p className="text-xs text-slate-500">Real-time ledger of latest fee payment transactions and invoice statuses</p>
                  </div>
                  <button
                    onClick={loadData}
                    className="bg-[#0b192c] hover:bg-[#1e3e62] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Refresh Feed
                  </button>
                </div>

                <div className="table-responsive">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#0b192c] text-white text-xs uppercase tracking-wider">
                        <th className="p-3.5 rounded-l-xl">Invoice No</th>
                        <th className="p-3.5">Student Name (Code)</th>
                        <th className="p-3.5">Fee Category</th>
                        <th className="p-3.5">Total Amount</th>
                        <th className="p-3.5">Paid Amount</th>
                        <th className="p-3.5">UTR / Tx Ref</th>
                        <th className="p-3.5 rounded-r-xl">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {invoices.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                            No transaction invoices recorded.
                          </td>
                        </tr>
                      ) : (
                        invoices.slice(0, 8).map((inv) => {
                          const tx = inv.payments?.[0]?.transactionNumber || inv.payments?.[0]?.providerTxId || 'N/A';
                          return (
                            <tr key={inv.id} className="hover:bg-slate-50">
                              <td className="p-3.5 font-mono text-xs font-bold text-[#0d9488]">{inv.invoiceNumber}</td>
                              <td className="p-3.5">
                                <div className="font-bold text-[#0b192c]">{inv.student?.profile?.fullName || 'Student'}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{inv.student?.studentCode}</div>
                              </td>
                              <td className="p-3.5 text-xs text-slate-600 font-medium">{inv.feeCategory}</td>
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
                                      : inv.status === 'PENDING_APPROVAL'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {inv.status === 'PENDING_APPROVAL' ? 'Pending Approval' : inv.status}
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

              {/* Subject -> Teacher Attendance & Payroll Details Inspector */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-[#0b192c] flex items-center space-x-2">
                    <UserCheck className="w-5 h-5 text-[#0d9488]" />
                    <span>Teacher Attendance & Payroll Monthly Inspector</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Select a subject to list associated teachers, then inspect working days, attendance, total salary & detailed month leaves (LOP/CL/SL)
                  </p>
                </div>

                {/* Step A: Subject Drop Box */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Select Subject Dropdown *</label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => {
                        setSelectedSubject(e.target.value);
                        setSelectedTeacherId('');
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#0d9488] focus:outline-none bg-white font-bold text-[#0b192c] cursor-pointer"
                    >
                      <option value="Physics">Physics</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Biology">Biology</option>
                      <option value="English">English</option>
                      <option value="Social Studies">Social Studies</option>
                      <option value="Computer Science">Computer Science</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Select Faculty Teacher for {selectedSubject} *</label>
                    <select
                      value={selectedTeacherId || (subjectTeachers[0]?.id || '')}
                      onChange={(e) => setSelectedTeacherId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#0d9488] focus:outline-none bg-white font-bold text-[#0b192c] cursor-pointer"
                    >
                      {subjectTeachers.length === 0 ? (
                        <option value="">No teachers allocated for {selectedSubject}</option>
                      ) : (
                        subjectTeachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.profile?.fullName} ({t.employeeCode})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Step B: Teacher Detailed Showcase Card */}
                {teacherDetails ? (
                  <div className="space-y-6">
                    <div className="bg-[#0b192c] text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <span className="bg-teal-900 text-teal-300 text-[10px] font-mono font-bold px-2.5 py-1 rounded-md uppercase">
                          Emp Code: {teacherDetails.employeeCode}
                        </span>
                        <h3 className="text-xl font-extrabold text-white mt-1.5">{teacherDetails.name}</h3>
                        <p className="text-xs text-slate-300 mt-1">
                          {teacherDetails.designation} • Department of {teacherDetails.subject}
                        </p>
                      </div>

                      <div className="flex items-center space-x-4 bg-[#1e3e62] p-4 rounded-xl border border-teal-500/30">
                        <div className="text-center">
                          <div className="text-[10px] text-teal-200 font-bold uppercase">Net Salary</div>
                          <div className="text-2xl font-extrabold text-teal-300">
                            Rs. {teacherDetails.netSalary.toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div className="h-8 w-px bg-slate-600"></div>
                        <div className="text-center">
                          <div className="text-[10px] text-teal-200 font-bold uppercase">Base Salary</div>
                          <div className="text-lg font-bold text-white">
                            Rs. {teacherDetails.baseSalary.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Attendance Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                        <div className="text-xs font-bold text-slate-700 uppercase">Working Days</div>
                        <div className="text-2xl font-extrabold text-[#0b192c] mt-1">{teacherDetails.totalWorkingDays} Days</div>
                        <div className="text-[10px] text-slate-500 mt-1">Current Academic Month</div>
                      </div>

                      <div className="bg-teal-50 border border-teal-200 p-4 rounded-2xl">
                        <div className="text-xs font-bold text-teal-800 uppercase">Present Days</div>
                        <div className="text-2xl font-extrabold text-[#0d9488] mt-1">{teacherDetails.presentDays} Days</div>
                        <div className="text-[10px] text-slate-500 mt-1">Sessions attended</div>
                      </div>

                      <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl">
                        <div className="text-xs font-bold text-rose-800 uppercase">Absent Days</div>
                        <div className="text-2xl font-extrabold text-rose-600 mt-1">{teacherDetails.absentDays} Days</div>
                        <div className="text-[10px] text-slate-500 mt-1">Total leaves taken</div>
                      </div>

                      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
                        <div className="text-xs font-bold text-amber-800 uppercase">LOP Deductions</div>
                        <div className="text-2xl font-extrabold text-amber-600 mt-1">
                          {teacherDetails.leaves.find((l) => l.type.includes('LOP'))?.deduction}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">Loss of Pay calculated</div>
                      </div>
                    </div>

                    {/* Detailed Leaves Breakdown Table */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-[#0b192c] uppercase tracking-wider">
                        Itemized Leave Breakdown for Month
                      </h4>
                      <div className="table-responsive">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="bg-[#0b192c] text-white text-xs uppercase tracking-wider">
                              <th className="p-3.5 rounded-l-xl">Leave Category</th>
                              <th className="p-3.5">Days Taken</th>
                              <th className="p-3.5">Salary Impact</th>
                              <th className="p-3.5 rounded-r-xl">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                            {teacherDetails.leaves.map((lv, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-3.5 font-bold text-[#0b192c]">{lv.type}</td>
                                <td className="p-3.5 text-xs text-slate-700 font-bold">{lv.days} Day(s)</td>
                                <td className="p-3.5 text-xs font-bold text-rose-600">{lv.deduction}</td>
                                <td className="p-3.5">
                                  <span
                                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                                      lv.type.includes('LOP')
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-teal-100 text-teal-800'
                                    }`}
                                  >
                                    {lv.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl">
                    No teacher details available for the selected subject.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: FEE STRUCTURES & PAY FLOW */}
          {activeTab === 'fee_structures' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-[#0b192c] flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-[#0d9488]" />
                  <span>Fee Structures & Student Fee Collection</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Select Class & Section or Search Student ID to showcase details, choose fee categories, enter amount & Transaction UTR to generate invoice for approval.
                </p>
              </div>

              {/* Step 1: Class, Section & Search Filter Bar */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Class *</label>
                  <select
                    value={feeClassId}
                    onChange={(e) => {
                      setFeeClassId(e.target.value);
                      setFeeSectionId('');
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#0d9488] focus:outline-none bg-white font-medium"
                  >
                    <option value="">-- All Classes --</option>
                    {academicClasses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Section *</label>
                  <select
                    value={feeSectionId}
                    onChange={(e) => setFeeSectionId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#0d9488] focus:outline-none bg-white font-medium"
                  >
                    <option value="">-- All Sections --</option>
                    {(academicClasses.find((c) => c.id === feeClassId)?.sections || [
                      { id: 'sec_a', name: 'A' },
                      { id: 'sec_b', name: 'B' },
                    ]).map((sec) => (
                      <option key={sec.id} value={sec.id}>Section {sec.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Search by Student Code / ID / Name</label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="e.g. STU_1001 or Rahul..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Student Fee Directory Table with Details Showcase */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#0b192c] uppercase tracking-wider">
                  Allocated Students Fee Directory ({filteredStudents.length} Students)
                </h3>

                {filteredStudents.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl text-slate-400 text-xs border border-slate-200">
                    No students match the selected class, section or search query.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-[#0b192c] text-white text-xs uppercase tracking-wider">
                          <th className="p-3.5 rounded-l-xl">Student Code / ID</th>
                          <th className="p-3.5">Name</th>
                          <th className="p-3.5">Class & Sec</th>
                          <th className="p-3.5">Roll No</th>
                          <th className="p-3.5">Total Fee to Pay</th>
                          <th className="p-3.5">Amount Paid</th>
                          <th className="p-3.5">Balance Amount</th>
                          <th className="p-3.5 text-right rounded-r-xl">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                        {filteredStudents.map((st) => {
                          const summary = getStudentFeeSummary(st);
                          return (
                            <tr key={st.id} className="hover:bg-slate-50">
                              <td className="p-3.5 font-mono text-xs font-bold text-[#0d9488]">{st.studentCode}</td>
                              <td className="p-3.5 font-bold text-[#0b192c]">{st.profile?.fullName}</td>
                              <td className="p-3.5 text-xs text-slate-700 font-semibold">
                                {st.enrollments?.[0]?.class?.name || 'Class 10'}-{st.enrollments?.[0]?.section?.name || 'A'}
                              </td>
                              <td className="p-3.5 text-xs text-slate-600">{st.rollNumber}</td>
                              <td className="p-3.5 text-xs font-bold text-slate-900">
                                Rs. {summary.totalFee.toLocaleString('en-IN')}
                              </td>
                              <td className="p-3.5 text-xs font-bold text-[#0d9488]">
                                Rs. {summary.paidAmount.toLocaleString('en-IN')}
                              </td>
                              <td className="p-3.5 text-xs font-bold text-rose-600">
                                Rs. {summary.balanceAmount.toLocaleString('en-IN')}
                              </td>
                              <td className="p-3.5 text-right">
                                <button
                                  onClick={() => handleOpenPay(st)}
                                  className="bg-[#0d9488] hover:bg-[#0f766e] text-white px-4 py-1.5 rounded-xl text-xs font-bold cursor-pointer shadow-sm transition-all"
                                >
                                  Pay Fee
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: INVOICES ISSUED */}
          {activeTab === 'invoices' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-[#0b192c] flex items-center space-x-2">
                  <Receipt className="w-5 h-5 text-[#0d9488]" />
                  <span>Invoices Issued & Approval Queue</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Review generated fee invoices submitted for approval. Approving sends the invoice to the student and updates balance amounts.
                </p>
              </div>

              {/* Pending Approval Invoices Banner */}
              {pendingInvoices.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between text-xs text-amber-900 font-medium">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>
                      <strong>{pendingInvoices.length} Invoice(s) Pending Approval:</strong> Review payment UTRs below and approve to send invoices to students.
                    </span>
                  </div>
                </div>
              )}

              {/* Invoices Directory Table */}
              <div className="table-responsive">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#0b192c] text-white text-xs uppercase tracking-wider">
                      <th className="p-3.5 rounded-l-xl">Invoice No</th>
                      <th className="p-3.5">Student Name (Code)</th>
                      <th className="p-3.5">Fee Category</th>
                      <th className="p-3.5">Total Amount</th>
                      <th className="p-3.5">UTR / Tx Ref</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right rounded-r-xl">Approval Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                          No invoices issued yet.
                        </td>
                      </tr>
                    ) : (
                      invoices.map((inv) => {
                        const tx = inv.payments?.[0]?.transactionNumber || inv.payments?.[0]?.providerTxId || 'N/A';
                        const isPending = inv.status === 'PENDING_APPROVAL';
                        return (
                          <tr key={inv.id} className={isPending ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-slate-50'}>
                            <td className="p-3.5 font-mono text-xs font-bold text-[#0d9488]">{inv.invoiceNumber}</td>
                            <td className="p-3.5">
                              <div className="font-bold text-[#0b192c]">{inv.student?.profile?.fullName || 'Student'}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{inv.student?.studentCode}</div>
                            </td>
                            <td className="p-3.5 text-xs text-slate-600">{inv.feeCategory}</td>
                            <td className="p-3.5 text-xs font-bold text-slate-900">
                              Rs. {inv.totalAmount.toLocaleString('en-IN')}
                            </td>
                            <td className="p-3.5 font-mono text-xs font-bold text-slate-700">{tx}</td>
                            <td className="p-3.5">
                              <span
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                                  inv.status === 'PAID'
                                    ? 'bg-teal-100 text-teal-800'
                                    : isPending
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {isPending ? 'Pending Approval' : inv.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              {isPending ? (
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    onClick={() => handleApproveInvoice(inv.id)}
                                    className="bg-[#0d9488] hover:bg-[#0f766e] text-white px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center space-x-1"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    onClick={() => handleRejectInvoice(inv.id)}
                                    className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center space-x-1"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Reject</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 font-bold">Approved & Sent</span>
                              )}
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

          {/* TAB 4: PAYMENT HISTORY */}
          {activeTab === 'payments' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-[#0b192c] flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-[#0d9488]" />
                  <span>Payment History & Money Received Log</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Complete ledger of verified money received with corresponding generated invoice details
                </p>
              </div>

              <div className="table-responsive">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#0b192c] text-white text-xs uppercase tracking-wider">
                      <th className="p-3.5 rounded-l-xl">Transaction / UTR No</th>
                      <th className="p-3.5">Invoice No</th>
                      <th className="p-3.5">Student Name (Code)</th>
                      <th className="p-3.5">Amount Received</th>
                      <th className="p-3.5">Payment Method</th>
                      <th className="p-3.5">Date & Time</th>
                      <th className="p-3.5 rounded-r-xl">Verification Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {paymentsHistory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                          No verified payments recorded.
                        </td>
                      </tr>
                    ) : (
                      paymentsHistory.map((pmt) => (
                        <tr key={pmt.id} className="hover:bg-slate-50">
                          <td className="p-3.5 font-mono text-xs font-bold text-[#0d9488]">
                            {pmt.transactionNumber || pmt.providerTxId}
                          </td>
                          <td className="p-3.5 font-mono text-xs text-slate-700">{pmt.invoice?.invoiceNumber || 'N/A'}</td>
                          <td className="p-3.5">
                            <div className="font-bold text-[#0b192c]">{pmt.student?.profile?.fullName || 'Student'}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{pmt.student?.studentCode}</div>
                          </td>
                          <td className="p-3.5 text-xs font-bold text-[#0d9488]">
                            Rs. {pmt.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3.5 text-xs font-bold text-slate-700">{pmt.paymentMethod}</td>
                          <td className="p-3.5 text-xs text-slate-500">{new Date(pmt.createdAt).toLocaleString()}</td>
                          <td className="p-3.5">
                            <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                              VERIFIED
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
        </main>
      </div>

      {/* FEE PAYMENT SELECTION MODAL */}
      {isPayOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden space-y-5 p-6">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#0b192c]">Student Fee Payment & Invoice Generation</h3>
                <p className="text-xs text-slate-500">
                  {selectedStudent.profile?.fullName} ({selectedStudent.studentCode}) • Roll #{selectedStudent.rollNumber}
                </p>
              </div>
              <button
                onClick={() => setIsPayOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* STEP 1: CATEGORY SELECTION & AMOUNT ENTRY */}
            {payStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[#0b192c] uppercase tracking-wider">
                    1. Select Fee Category (Check at least one option) *
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    {['Tuition Fee', 'Transport Fee', 'Books Fee', 'Other Fee'].map((catKey) => (
                      <label
                        key={catKey}
                        onClick={() => handleCategoryToggle(catKey)}
                        className={`flex items-center space-x-2.5 p-3 rounded-2xl border cursor-pointer transition-all ${
                          selectedCategories[catKey]
                            ? 'bg-teal-50 border-[#0d9488] text-[#0d9488] font-bold shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories[catKey]}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-[#0d9488] focus:ring-[#0d9488]"
                        />
                        <span className="text-xs">{catKey}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Text Box appears ONLY after selecting a category */}
                {hasSelectedCategory ? (
                  <div className="space-y-3 bg-teal-50/60 border border-teal-200 p-4 rounded-2xl">
                    <label className="block text-xs font-bold text-[#0b192c]">
                      2. Enter Payment Amount for ({selectedCategoryList.join(', ')}) *
                    </label>
                    <input
                      type="number"
                      required
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="e.g. 15000"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold text-[#0b192c] focus:ring-2 focus:ring-[#0d9488] focus:outline-none"
                    />

                    <button
                      type="button"
                      disabled={!payAmount || parseFloat(payAmount) <= 0}
                      onClick={() => setPayStep(2)}
                      className="w-full bg-[#0d9488] hover:bg-[#0f766e] text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      <span>Continue to Payment QR & UTR Entry</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center space-x-2">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Please select at least one fee category above to reveal the amount entry box.</span>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: QR CODE DISPLAY & UTR TRANSACTION ID ENTRY */}
            {payStep === 2 && (
              <form onSubmit={handleSubmitPayment} className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center space-y-3">
                  <div className="text-xs font-bold text-slate-700">Scan QR Code to Pay Fee via UPI</div>
                  <div className="flex justify-center py-2">
                    {/* Visual Payment QR Code Placeholder */}
                    <div className="w-40 h-40 bg-white border-2 border-[#0b192c] p-2 rounded-2xl shadow-inner flex flex-col items-center justify-center text-center space-y-1">
                      <QrCode className="w-24 h-24 text-[#0b192c]" />
                      <span className="text-[10px] font-mono font-bold text-[#0d9488]">UPI ID: school@upi</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 font-semibold">
                    Amount to Pay: <strong className="text-[#0d9488] font-extrabold text-sm">Rs. {parseFloat(payAmount || '0').toLocaleString('en-IN')}</strong> ({selectedCategoryList.join(', ')})
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#0b192c]">
                    Enter Transaction ID / UTR No. *
                  </label>
                  <input
                    type="text"
                    required
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder="e.g. 123456789012"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white font-mono text-sm font-bold text-[#0b192c] focus:ring-2 focus:ring-[#0d9488] focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500">
                    The Done button will be enabled only after you enter the Transaction ID / UTR No.
                  </p>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setPayStep(1)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-xl"
                  >
                    ← Back
                  </button>

                  {/* DONE / SUBMIT BUTTON: ENABLED ONLY IF UTR IS ENTERED */}
                  <button
                    type="submit"
                    disabled={!utrNumber.trim() || submittingPayment}
                    className="flex-1 bg-[#0b192c] hover:bg-[#1e3e62] text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {submittingPayment ? (
                      <span>Submitting Invoice...</span>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 text-teal-400" />
                        <span>Done (Generate & Submit Invoice)</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
