import React, { useEffect, useState } from 'react';
import { Facts } from '../components/ui';
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
    <div className="min-h-screen bg-paper flex flex-col font-sans">
      <Header userRole="ACCOUNTS" userName={currentUser?.fullName || 'Accounts & Bursar Officer'} />

      <div className="flex flex-1">
        <Sidebar role="ACCOUNTS" activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-8 overflow-y-auto space-y-8">
          {/* TAB 1: DASHBOARD (OVERVIEW) */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Latest Transactions & Invoices Feed */}
              <div className="bg-sheet p-6 border border-rule space-y-4">
                <div className="flex justify-between items-center border-b border-rule-soft pb-3">
                  <div>
                    <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                      <Receipt className="w-5 h-5 text-copy" />
                      <span>Recent transactions</span>
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
                        <th>Fee Category</th>
                        <th>Total Amount</th>
                        <th>Paid Amount</th>
                        <th>UTR / Tx Ref</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rule-soft font-medium text-ink">
                      {invoices.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-ink-faint text-xs">
                            No transaction invoices recorded.
                          </td>
                        </tr>
                      ) : (
                        invoices.slice(0, 8).map((inv) => {
                          const tx = inv.payments?.[0]?.transactionNumber || inv.payments?.[0]?.providerTxId || 'N/A';
                          return (
                            <tr key={inv.id} className="hover:bg-manila/25">
                              <td className="font-mono text-xs font-medium text-copy">{inv.invoiceNumber}</td>
                              <td>
                                <div className="font-medium text-ink">{inv.student?.profile?.fullName || 'Student'}</div>
                                <div className="text-[10px] text-ink-soft font-mono">{inv.student?.studentCode}</div>
                              </td>
                              <td className="text-xs text-ink-soft font-medium">{inv.feeCategory}</td>
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
                                      : inv.status === 'PENDING_APPROVAL'
                                      ? 'bg-hold-wash text-hold'
                                      : 'bg-due-wash text-due'
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
              <div className="bg-sheet p-6 border border-rule space-y-6">
                <div className="border-b border-rule-soft pb-4">
                  <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                    <UserCheck className="w-5 h-5 text-copy" />
                    <span>Payroll and attendance by teacher</span>
                  </h2>
                  <p className="text-xs text-ink-soft">
                    Pick a subject, then a teacher, to see their days worked and this month’s pay.
                  </p>
                </div>

                {/* Step A: Subject Drop Box */}
                <div className="bg-paper p-4 border border-rule grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">Subject *</label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => {
                        setSelectedSubject(e.target.value);
                        setSelectedTeacherId('');
                      }}
                      className="w-full px-3.5 py-2.5 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none bg-sheet font-medium text-ink cursor-pointer"
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
                    <label className="block text-xs font-medium text-ink mb-1">Teacher for {selectedSubject} *</label>
                    <select
                      value={selectedTeacherId || (subjectTeachers[0]?.id || '')}
                      onChange={(e) => setSelectedTeacherId(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none bg-sheet font-medium text-ink cursor-pointer"
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
                    <div className="bg-ink text-white p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <span className="bg-copy-deep text-copy text-[10px] font-mono font-medium px-2.5 py-1 uppercase">
                          Emp Code: {teacherDetails.employeeCode}
                        </span>
                        <h3 className="text-xl font-semibold text-white mt-1.5">{teacherDetails.name}</h3>
                        <p className="text-xs text-ink-faint mt-1">
                          {teacherDetails.designation} • Department of {teacherDetails.subject}
                        </p>
                      </div>

                      <div className="flex items-center space-x-4 bg-ink p-4 border border-copy/30">
                        <div className="text-center">
                          <div className="text-[10px] text-white/60 font-medium uppercase">Net Salary</div>
                          <div className="text-2xl font-semibold text-copy">
                            Rs. {teacherDetails.netSalary.toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div className="h-8 w-px bg-white/25"></div>
                        <div className="text-center">
                          <div className="text-[10px] text-white/60 font-medium uppercase">Base Salary</div>
                          <div className="text-[0.9375rem] font-semibold text-white">
                            Rs. {teacherDetails.baseSalary.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Attendance for the month, as one line of facts. */}
                    <Facts
                      className="mt-1"
                      items={[
                        { label: 'Working days', value: teacherDetails.totalWorkingDays },
                        { label: 'Present', value: teacherDetails.presentDays, tone: 'paid' },
                        { label: 'Absent', value: teacherDetails.absentDays, tone: teacherDetails.absentDays > 0 ? 'due' : undefined },
                        {
                          label: 'Loss of pay',
                          value: teacherDetails.leaves.find((l) => l.type.includes('LOP'))?.deduction ?? 'Rs. 0',
                          tone: 'due',
                        },
                      ]}
                    />

                    {/* Detailed Leaves Breakdown Table */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-medium text-ink uppercase tracking-wider">
                        Leave taken this month
                      </h4>
                      <div className="register-scroll">
                        <table className="register">
                          <thead>
                            <tr>
                              <th>Leave Category</th>
                              <th>Days Taken</th>
                              <th>Salary Impact</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-rule-soft font-medium text-ink">
                            {teacherDetails.leaves.map((lv, idx) => (
                              <tr key={idx} className="hover:bg-manila/25">
                                <td className="font-medium text-ink">{lv.type}</td>
                                <td className="text-xs text-ink font-medium">{lv.days} Day(s)</td>
                                <td className="text-xs font-medium text-due">{lv.deduction}</td>
                                <td>
                                  <span
                                    className={`mark ${
                                      lv.type.includes('LOP')
                                        ? 'bg-due-wash text-due'
                                        : 'bg-paid-wash text-paid'
                                    }`}
                                  >
                                    {String(lv.status).replace(/_/g, " ")}
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
                  <div className="p-8 text-center text-ink-faint text-xs bg-paper">
                    No teacher details available for the selected subject.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: FEE STRUCTURES & PAY FLOW */}
          {activeTab === 'fee_structures' && (
            <div className="bg-sheet p-6 border border-rule space-y-6">
              <div className="border-b border-rule-soft pb-4">
                <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-copy" />
                  <span>Fee structures</span>
                </h2>
                <p className="text-xs text-ink-soft">
                  Select Class & Section or Search Student ID to showcase details, choose fee categories, enter amount & Transaction UTR to generate invoice for approval.
                </p>
              </div>

              {/* Step 1: Class, Section & Search Filter Bar */}
              <div className="bg-paper p-4 border border-rule grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Select Class *</label>
                  <select
                    value={feeClassId}
                    onChange={(e) => {
                      setFeeClassId(e.target.value);
                      setFeeSectionId('');
                    }}
                    className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none bg-sheet font-medium"
                  >
                    <option value="">-- All Classes --</option>
                    {academicClasses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Select Section *</label>
                  <select
                    value={feeSectionId}
                    onChange={(e) => setFeeSectionId(e.target.value)}
                    className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none bg-sheet font-medium"
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
                  <label className="block text-xs font-medium text-ink mb-1">Search by Student Code / ID / Name</label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-ink-faint absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="e.g. STU_1001 or Rahul..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-sheet border border-rule text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Student Fee Directory Table with Details Showcase */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-ink uppercase tracking-wider">
                  Allocated Students Fee Directory ({filteredStudents.length} Students)
                </h3>

                {filteredStudents.length === 0 ? (
                  <div className="text-center py-10 bg-paper text-ink-faint text-xs border border-rule">
                    No students match the selected class, section or search query.
                  </div>
                ) : (
                  <div className="register-scroll">
                    <table className="register">
                      <thead>
                        <tr>
                          <th>Student Code / ID</th>
                          <th>Name</th>
                          <th>Class & Sec</th>
                          <th>Roll No</th>
                          <th>Total Fee to Pay</th>
                          <th>Amount Paid</th>
                          <th>Balance Amount</th>
                          <th className="num">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rule-soft font-medium text-ink">
                        {filteredStudents.map((st) => {
                          const summary = getStudentFeeSummary(st);
                          return (
                            <tr key={st.id} className="hover:bg-manila/25">
                              <td className="font-mono text-xs font-medium text-copy">{st.studentCode}</td>
                              <td className="font-medium text-ink">{st.profile?.fullName}</td>
                              <td className="text-xs text-ink font-semibold">
                                {st.enrollments?.[0]?.class?.name || 'Class 10'}-{st.enrollments?.[0]?.section?.name || 'A'}
                              </td>
                              <td className="text-xs text-ink-soft">{st.rollNumber}</td>
                              <td className="text-xs font-medium text-ink">
                                Rs. {summary.totalFee.toLocaleString('en-IN')}
                              </td>
                              <td className="text-xs font-medium text-copy">
                                Rs. {summary.paidAmount.toLocaleString('en-IN')}
                              </td>
                              <td className="text-xs font-medium text-due">
                                Rs. {summary.balanceAmount.toLocaleString('en-IN')}
                              </td>
                              <td className="text-right">
                                <button
                                  onClick={() => handleOpenPay(st)}
                                  className="bg-copy hover:bg-copy-deep text-white px-4 py-1.5 text-xs font-medium cursor-pointer transition-all"
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
            <div className="bg-sheet p-6 border border-rule space-y-6">
              <div className="border-b border-rule-soft pb-4">
                <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                  <Receipt className="w-5 h-5 text-copy" />
                  <span>Invoices awaiting approval</span>
                </h2>
                <p className="text-xs text-ink-soft">
                  Review generated fee invoices submitted for approval. Approving sends the invoice to the student and updates balance amounts.
                </p>
              </div>

              {/* Pending Approval Invoices Banner */}
              {pendingInvoices.length > 0 && (
                <div className="bg-hold-wash border border-hold/25 p-4 flex items-center justify-between text-xs text-amber-900 font-medium">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-hold shrink-0" />
                    <span>
                      <strong>{pendingInvoices.length} Invoice(s) Pending Approval:</strong> Review payment UTRs below and approve to send invoices to students.
                    </span>
                  </div>
                </div>
              )}

              {/* Invoices Directory Table */}
              <div className="register-scroll">
                <table className="register">
                  <thead>
                    <tr>
                      <th>Invoice No</th>
                      <th>Student Name (Code)</th>
                      <th>Fee Category</th>
                      <th>Total Amount</th>
                      <th>UTR / Tx Ref</th>
                      <th>Status</th>
                      <th className="num">Approval Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule-soft font-medium text-ink">
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-ink-faint text-xs">
                          No invoices issued yet.
                        </td>
                      </tr>
                    ) : (
                      invoices.map((inv) => {
                        const tx = inv.payments?.[0]?.transactionNumber || inv.payments?.[0]?.providerTxId || 'N/A';
                        const isPending = inv.status === 'PENDING_APPROVAL';
                        return (
                          <tr key={inv.id} className={isPending ? 'bg-hold-wash/40 hover:bg-hold-wash' : 'hover:bg-manila/25'}>
                            <td className="font-mono text-xs font-medium text-copy">{inv.invoiceNumber}</td>
                            <td>
                              <div className="font-medium text-ink">{inv.student?.profile?.fullName || 'Student'}</div>
                              <div className="text-[10px] text-ink-soft font-mono">{inv.student?.studentCode}</div>
                            </td>
                            <td className="text-xs text-ink-soft">{inv.feeCategory}</td>
                            <td className="text-xs font-medium text-ink">
                              Rs. {inv.totalAmount.toLocaleString('en-IN')}
                            </td>
                            <td className="font-mono text-xs font-medium text-ink">{tx}</td>
                            <td>
                              <span
                                className={`mark ${
                                  inv.status === 'PAID'
                                    ? 'bg-paid-wash text-paid'
                                    : isPending
                                    ? 'bg-hold-wash text-hold'
                                    : 'bg-due-wash text-due'
                                }`}
                              >
                                {isPending ? 'Pending Approval' : inv.status}
                              </span>
                            </td>
                            <td className="text-right">
                              {isPending ? (
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    onClick={() => handleApproveInvoice(inv.id)}
                                    className="bg-copy hover:bg-copy-deep text-white px-3 py-1.5 text-xs font-medium cursor-pointer transition-all flex items-center space-x-1"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    onClick={() => handleRejectInvoice(inv.id)}
                                    className="bg-rose-600 hover:bg-due-wash0 text-white px-3 py-1.5 text-xs font-medium cursor-pointer transition-all flex items-center space-x-1"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Reject</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-ink-faint font-medium">Approved & Sent</span>
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
            <div className="bg-sheet p-6 border border-rule space-y-6">
              <div className="border-b border-rule-soft pb-4">
                <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-copy" />
                  <span>Payments received</span>
                </h2>
                <p className="text-xs text-ink-soft">
                  Complete ledger of verified money received with corresponding generated invoice details
                </p>
              </div>

              <div className="register-scroll">
                <table className="register">
                  <thead>
                    <tr>
                      <th>Transaction / UTR No</th>
                      <th>Invoice No</th>
                      <th>Student Name (Code)</th>
                      <th>Amount Received</th>
                      <th>Payment Method</th>
                      <th>Date & Time</th>
                      <th>Verification Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule-soft font-medium text-ink">
                    {paymentsHistory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-ink-faint text-xs">
                          No verified payments recorded.
                        </td>
                      </tr>
                    ) : (
                      paymentsHistory.map((pmt) => (
                        <tr key={pmt.id} className="hover:bg-manila/25">
                          <td className="font-mono text-xs font-medium text-copy">
                            {pmt.transactionNumber || pmt.providerTxId}
                          </td>
                          <td className="font-mono text-xs text-ink">{pmt.invoice?.invoiceNumber || 'N/A'}</td>
                          <td>
                            <div className="font-medium text-ink">{pmt.student?.profile?.fullName || 'Student'}</div>
                            <div className="text-[10px] text-ink-soft font-mono">{pmt.student?.studentCode}</div>
                          </td>
                          <td className="text-xs font-medium text-copy">
                            Rs. {pmt.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="text-xs font-medium text-ink">{pmt.paymentMethod}</td>
                          <td className="text-xs text-ink-soft">{new Date(pmt.createdAt).toLocaleString()}</td>
                          <td>
                            <span className="bg-paid-wash text-paid mark">
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
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-sheet w-full max-w-lg border border-rule overflow-hidden space-y-5 p-6">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-rule-soft pb-3">
              <div>
                <h3 className="text-base font-medium text-ink">Student Fee Payment & Invoice Generation</h3>
                <p className="text-xs text-ink-soft">
                  {selectedStudent.profile?.fullName} ({selectedStudent.studentCode}) • Roll #{selectedStudent.rollNumber}
                </p>
              </div>
              <button
                onClick={() => setIsPayOpen(false)}
                className="text-ink-faint hover:text-ink-soft font-medium text-lg"
              >
                ✕
              </button>
            </div>

            {/* STEP 1: CATEGORY SELECTION & AMOUNT ENTRY */}
            {payStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-ink uppercase tracking-wider">
                    1. Select Fee Category (Check at least one option) *
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    {['Tuition Fee', 'Transport Fee', 'Books Fee', 'Other Fee'].map((catKey) => (
                      <label
                        key={catKey}
                        onClick={() => handleCategoryToggle(catKey)}
                        className={`flex items-center space-x-2.5 p-3 border cursor-pointer transition-all ${
                          selectedCategories[catKey]
                            ? 'bg-copy-wash border-copy text-copy font-medium'
                            : 'bg-paper border-rule text-ink hover:bg-manila/30'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories[catKey]}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-copy focus:ring-copy"
                        />
                        <span className="text-xs">{catKey}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Text Box appears ONLY after selecting a category */}
                {hasSelectedCategory ? (
                  <div className="space-y-3 bg-copy-wash/60 border border-copy/25 p-4">
                    <label className="block text-xs font-medium text-ink">
                      2. Enter Payment Amount for ({selectedCategoryList.join(', ')}) *
                    </label>
                    <input
                      type="number"
                      required
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="e.g. 15000"
                      className="w-full px-4 py-2.5 border border-rule bg-sheet text-sm font-medium text-ink focus:ring-2 focus:ring-copy focus:outline-none"
                    />

                    <button
                      type="button"
                      disabled={!payAmount || parseFloat(payAmount) <= 0}
                      onClick={() => setPayStep(2)}
                      className="w-full bg-copy hover:bg-copy-deep text-white font-medium py-2.5 text-xs transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      <span>Continue to payment</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-hold bg-hold-wash border border-hold/25 p-3 flex items-center space-x-2">
                    <Info className="w-4 h-4 text-hold shrink-0" />
                    <span>Please select at least one fee category above to reveal the amount entry box.</span>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: QR CODE DISPLAY & UTR TRANSACTION ID ENTRY */}
            {payStep === 2 && (
              <form onSubmit={handleSubmitPayment} className="space-y-4">
                <div className="bg-paper border border-rule p-4 text-center space-y-3">
                  <div className="text-xs font-medium text-ink">Scan QR Code to Pay Fee via UPI</div>
                  <div className="flex justify-center py-2">
                    {/* Visual Payment QR Code Placeholder */}
                    <div className="w-40 h-40 bg-sheet border-2 border-ink p-2 flex flex-col items-center justify-center text-center space-y-1">
                      <QrCode className="w-24 h-24 text-ink" />
                      <span className="text-[10px] font-mono font-medium text-copy">UPI ID: school@upi</span>
                    </div>
                  </div>
                  <div className="text-xs text-ink-soft font-semibold">
                    Amount to Pay: <strong className="text-copy font-semibold text-sm">Rs. {parseFloat(payAmount || '0').toLocaleString('en-IN')}</strong> ({selectedCategoryList.join(', ')})
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-ink">
                    Enter Transaction ID / UTR No. *
                  </label>
                  <input
                    type="text"
                    required
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder="e.g. 123456789012"
                    className="w-full px-4 py-2.5 border border-rule bg-sheet font-mono text-sm font-medium text-ink focus:ring-2 focus:ring-copy focus:outline-none"
                  />
                  <p className="text-[10px] text-ink-soft">
                    The Done button will be enabled only after you enter the Transaction ID / UTR No.
                  </p>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setPayStep(1)}
                    className="bg-manila/50 hover:bg-manila text-ink text-xs font-medium px-4 py-2.5"
                  >
                    ← Back
                  </button>

                  {/* DONE / SUBMIT BUTTON: ENABLED ONLY IF UTR IS ENTERED */}
                  <button
                    type="submit"
                    disabled={!utrNumber.trim() || submittingPayment}
                    className="flex-1 bg-ink hover:bg-copy-deep text-white font-medium py-2.5 text-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {submittingPayment ? (
                      <span>Submitting Invoice...</span>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 text-copy" />
                        <span>Generate invoice</span>
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
