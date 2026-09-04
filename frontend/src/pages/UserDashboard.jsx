import React, { useEffect, useState } from 'react';
import { api, getUser } from '../lib/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import {
  UserCheck,
  Calendar,
  CreditCard,
  DollarSign,
  CheckCircle,
  QrCode,
  ArrowRight,
  Info,
  FileText,
  Download,
  Receipt,
  Award,
  AlertCircle,
} from 'lucide-react';

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState('profile');
  const [currentUser, setCurrentUser] = useState(null);

  // Student Data State
  const [studentRecord, setStudentRecord] = useState(null);
  const [attendances, setAttendances] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [paymentsHistory, setPaymentsHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- MONTHLY ATTENDANCE SELECTOR STATE ---
  const [selectedMonth, setSelectedMonth] = useState('Sep 2026');

  // --- FEE PAYMENT FLOW STATE ---
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState({
    'Tuition Fee': true,
    'Transport Fee': false,
    'Books Fee': false,
    'Other Fee': false,
  });
  const [payAmount, setPayAmount] = useState('15000');
  const [payStep, setPayStep] = useState(1);
  const [utrNumber, setUtrNumber] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // --- APPROVED INVOICE COPY MODAL STATE ---
  const [selectedInvoiceForCopy, setSelectedInvoiceForCopy] = useState(null);

  useEffect(() => {
    const saved = getUser();
    if (saved) setCurrentUser(saved);
  }, []);

  const loadStudentData = () => {
    if (!currentUser) return;
    setLoading(true);

    const query = currentUser.studentId
      ? `studentCode=${currentUser.studentId}`
      : `email=${encodeURIComponent(currentUser.email)}`;

    api(`/api/students/me?${query}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.student) {
          setStudentRecord(data.student);
          // Fetch student attendance
          api(`/api/attendance?studentId=${data.student.id}`)
            .then((r) => r.json())
            .then((attRes) => {
              if (attRes.attendances) setAttendances(attRes.attendances);
            })
            .catch(() => {});

          // Fetch student invoices & payments
          api(`/api/invoices?studentId=${data.student.id}`)
            .then((r) => r.json())
            .then((invRes) => {
              if (invRes.invoices) setInvoices(invRes.invoices);
              if (invRes.paymentsHistory) setPaymentsHistory(invRes.paymentsHistory);
            })
            .catch(() => {});
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (currentUser) {
      loadStudentData();
    }
  }, [currentUser]);

  // Format DOB in DD/MM/YYYY
  const dobFormatted = studentRecord?.dob
    ? new Date(studentRecord.dob).toLocaleDateString('en-GB')
    : '15/08/2010';

  // Compute Monthly Attendance Filter
  const monthlyMap = {};
  attendances.forEach((rec) => {
    const monthKey = new Date(rec.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = [];
    }
    monthlyMap[monthKey].push(rec);
  });

  const monthOptions = Object.keys(monthlyMap).length > 0 ? Object.keys(monthlyMap) : ['Sep 2026'];
  const currentMonthRecords = monthlyMap[selectedMonth] || attendances;

  const totalMonthlyDays = currentMonthRecords.length || 26;
  const presentMonthlyDays = currentMonthRecords.filter((a) => a.status === 'PRESENT').length;
  const absentMonthlyDays = currentMonthRecords.filter((a) => a.status === 'ABSENT').length;
  const lateMonthlyDays = currentMonthRecords.filter((a) => a.status === 'LATE').length;
  const monthlyPercentage =
    totalMonthlyDays > 0 ? Math.round(((presentMonthlyDays + lateMonthlyDays * 0.5) / totalMonthlyDays) * 100) : 100;

  // Student Fee Ledger Calculations
  const totalFeeToPay = 50000;
  const totalPaidAmount = invoices
    .filter((i) => i.status === 'PAID')
    .reduce((sum, i) => sum + (i.paidAmount || 0), 0);
  const pendingInvoicesAmount = invoices
    .filter((i) => i.status === 'PENDING_APPROVAL')
    .reduce((sum, i) => sum + (i.totalAmount || 0), 0);
  const balanceAmount = Math.max(0, totalFeeToPay - totalPaidAmount);

  // Toggle Fee Category Checkboxes
  const handleCategoryToggle = (categoryKey) => {
    setSelectedCategories((prev) => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  const selectedCategoryList = Object.keys(selectedCategories).filter((k) => selectedCategories[k]);
  const hasSelectedCategory = selectedCategoryList.length > 0;

  // Open Pay Modal
  const handleOpenPay = () => {
    setPayAmount(String(balanceAmount > 0 ? balanceAmount : 15000));
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
    if (!studentRecord) return;

    try {
      setSubmittingPayment(true);
      const res = await api('/api/invoices/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentRecord.id,
          feeCategories: selectedCategoryList,
          amount: payAmount,
          utrNumber: utrNumber.trim(),
          paymentMethod: 'UPI',
          userRole: 'USER',
          profileId: currentUser?.id,
        }),
      });
      const data = await res.json();
      setSubmittingPayment(false);

      if (data.success) {
        alert(
          `Fee payment of Rs. ${parseFloat(payAmount).toLocaleString('en-IN')} (UTR: ${utrNumber}) submitted successfully!\n\nInvoice ${data.invoice.invoiceNumber} is sent for Approval Request. Once approved by Accounts, your balance will update automatically.`
        );
        setIsPayOpen(false);
        loadStudentData();
      } else {
        alert(data.error || 'Failed to submit fee payment.');
      }
    } catch (err) {
      setSubmittingPayment(false);
      alert('Error submitting payment.');
    }
  };

  const approvedInvoices = invoices.filter((i) => i.status === 'PAID');

  return (
    <div className="min-h-screen bg-paper flex flex-col font-sans">
      <Header userRole="USER" userName={currentUser?.fullName || 'Enrolled Student'} />

      <div className="flex flex-1">
        <Sidebar role="USER" activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-8 overflow-y-auto space-y-8">
          {/* TAB 1: STUDENT PROFILE (PROFILE DATA FROM ADMIN PANEL) */}
          {activeTab === 'profile' && (
            <div className="bg-sheet p-6 border border-rule space-y-6">
              <div className="border-b border-rule-soft pb-4">
                <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                  <UserCheck className="w-5 h-5 text-copy" />
                  <span>My record</span>
                </h2>
                <p className="text-xs text-ink-soft">
                  Your record as the office holds it. Ask the registrar to correct anything wrong.
                </p>
              </div>

              {/* Student Details Showcase */}
              <div className="bg-paper border border-rule p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-ink text-white p-6">
                  <div>
                    <span className="text-copy text-xs font-mono font-medium uppercase tracking-wider">
                      Student ID: {studentRecord?.studentCode || currentUser?.studentId || 'STU_1001'}
                    </span>
                    <h3 className="text-xl font-semibold text-white mt-1">
                      {studentRecord?.profile?.fullName || currentUser?.fullName}
                    </h3>
                    <p className="text-xs text-ink-faint mt-1">
                      Class: <strong>{studentRecord?.enrollments?.[0]?.class?.name || 'Class 10'}-{studentRecord?.enrollments?.[0]?.section?.name || 'A'}</strong> • Roll No: #{studentRecord?.rollNumber || '101'}
                    </p>
                  </div>

                  <div className="bg-ink p-4 border border-copy/30 text-right">
                    <div className="text-[10px] text-white/60 font-medium uppercase">Date of birth</div>
                    <div className="text-lg font-mono font-semibold text-copy mt-0.5">
                      {dobFormatted}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                  <div className="bg-sheet p-4 border border-rule space-y-1">
                    <span className="text-[11px] font-medium text-ink-soft uppercase">Student Code / ID</span>
                    <div className="text-sm font-mono font-medium text-copy">
                      {studentRecord?.studentCode || 'STU_1001'}
                    </div>
                  </div>

                  <div className="bg-sheet p-4 border border-rule space-y-1">
                    <span className="text-[11px] font-medium text-ink-soft uppercase">Roll Number</span>
                    <div className="text-sm font-medium text-ink">#{studentRecord?.rollNumber || '101'}</div>
                  </div>

                  <div className="bg-sheet p-4 border border-rule space-y-1">
                    <span className="text-[11px] font-medium text-ink-soft uppercase">Class & Section</span>
                    <div className="text-sm font-medium text-ink">
                      {studentRecord?.enrollments?.[0]?.class?.name || 'Class 10'}-Section {studentRecord?.enrollments?.[0]?.section?.name || 'A'}
                    </div>
                  </div>

                  <div className="bg-sheet p-4 border border-rule space-y-1">
                    <span className="text-[11px] font-medium text-ink-soft uppercase">Date of Birth (DOB)</span>
                    <div className="text-sm font-mono font-medium text-ink">{dobFormatted}</div>
                  </div>

                  <div className="bg-sheet p-4 border border-rule space-y-1">
                    <span className="text-[11px] font-medium text-ink-soft uppercase">Parent / Guardian Name</span>
                    <div className="text-sm font-medium text-ink">
                      {studentRecord?.parents?.[0]?.parent?.fullName || 'Suresh Sharma'}
                    </div>
                  </div>

                  <div className="bg-sheet p-4 border border-rule space-y-1">
                    <span className="text-[11px] font-medium text-ink-soft uppercase">Parent Mobile Number</span>
                    <div className="text-sm font-mono font-medium text-copy">
                      {studentRecord?.parents?.[0]?.parent?.phone || studentRecord?.profile?.phone || '+91 98765 43210'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ATTENDANCE RECORD (ENTIRE ATTENDANCE THROUGHOUT THE MONTH ONLY) */}
          {activeTab === 'attendance' && (
            <div className="bg-sheet p-6 border border-rule space-y-6">
              <div className="border-b border-rule-soft pb-4 flex justify-between items-center">
                <div>
                  <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-copy" />
                    <span>Attendance by month</span>
                  </h2>
                  <p className="text-xs text-ink-soft">
                    Entire attendance breakdown throughout the month
                  </p>
                </div>

                {/* Month Selector Dropdown */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-ink">Select Month:</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3.5 py-1.5 border border-rule text-xs font-medium bg-paper text-ink cursor-pointer"
                  >
                    {monthOptions.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Monthly Attendance Summary Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-paper border border-rule p-4">
                  <div className="text-xs font-medium text-ink uppercase">Monthly Working Days</div>
                  <div className="text-2xl font-semibold text-ink mt-1">{totalMonthlyDays} Days</div>
                  <div className="text-[10px] text-ink-soft mt-1">For {selectedMonth}</div>
                </div>

                <div className="bg-copy-wash border border-copy/25 p-4">
                  <div className="text-xs font-medium text-copy-deep uppercase">Days Present</div>
                  <div className="text-2xl font-semibold text-copy mt-1">{presentMonthlyDays} Days</div>
                  <div className="text-[10px] text-ink-soft mt-1">Attended sessions</div>
                </div>

                <div className="bg-due-wash border border-due/25 p-4">
                  <div className="text-xs font-medium text-due uppercase">Days Absent</div>
                  <div className="text-2xl font-semibold text-due mt-1">{absentMonthlyDays} Days</div>
                  <div className="text-[10px] text-ink-soft mt-1">Unexcused leaves</div>
                </div>

                <div className="bg-hold-wash border border-hold/25 p-4">
                  <div className="text-xs font-medium text-hold uppercase">Monthly Attendance %</div>
                  <div className="text-2xl font-semibold text-hold mt-1">{monthlyPercentage}%</div>
                  <div className="text-[10px] text-ink-soft mt-1">Overall monthly score</div>
                </div>
              </div>

              {/* Monthly Daily Attendance Calendar Table */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-ink uppercase tracking-wider">
                  Daily Attendance Log for {selectedMonth}
                </h3>
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
                      {currentMonthRecords.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-ink-faint text-xs">
                            No attendance records for {selectedMonth}.
                          </td>
                        </tr>
                      ) : (
                        currentMonthRecords.map((rec) => (
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
                            <td className="text-xs text-ink-soft">{rec.markedBy || 'Class Teacher'}</td>
                            <td className="text-xs text-ink-soft">{rec.remarks || 'Regular Session'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FEE LEDGER & PAY (SAME WORK PROCESS AS ACCOUNTS FEE STRUCTURE) */}
          {activeTab === 'fees' && (
            <div className="bg-sheet p-6 border border-rule space-y-6">
              <div className="border-b border-rule-soft pb-4 flex justify-between items-center">
                <div>
                  <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                    <CreditCard className="w-5 h-5 text-copy" />
                    <span>Student Fee Ledger & Online Fee Payment</span>
                  </h2>
                  <p className="text-xs text-ink-soft">
                    Select fee categories, enter payment amount, scan UPI QR code & submit Transaction UTR for approval
                  </p>
                </div>

                <button
                  onClick={handleOpenPay}
                  className="bg-copy hover:bg-copy-deep text-white font-medium px-5 py-2 text-xs transition-all cursor-pointer flex items-center space-x-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Pay fees</span>
                </button>
              </div>

              {/* Fee Ledger Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-paper border border-rule p-4">
                  <div className="text-xs font-medium text-ink uppercase">Total Academic Fee</div>
                  <div className="text-2xl font-semibold text-ink mt-1">
                    Rs. {totalFeeToPay.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-ink-soft mt-1">Academic Session 2026-27</div>
                </div>

                <div className="bg-copy-wash border border-copy/25 p-4">
                  <div className="text-xs font-medium text-copy-deep uppercase">Approved Amount Paid</div>
                  <div className="text-2xl font-semibold text-copy mt-1">
                    Rs. {totalPaidAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-ink-soft mt-1">Receipts verified</div>
                </div>

                <div className="bg-hold-wash border border-hold/25 p-4">
                  <div className="text-xs font-medium text-hold uppercase">Pending Approval</div>
                  <div className="text-2xl font-semibold text-hold mt-1">
                    Rs. {pendingInvoicesAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-ink-soft mt-1">Under Accounts verification</div>
                </div>

                <div className="bg-due-wash border border-due/25 p-4">
                  <div className="text-xs font-medium text-due uppercase">Remaining Balance</div>
                  <div className="text-2xl font-semibold text-due mt-1">
                    Rs. {balanceAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-ink-soft mt-1">Outstanding balance to pay</div>
                </div>
              </div>

              {/* Invoices List for Student */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-ink uppercase tracking-wider">Fee Invoices & Ledger Breakdown</h3>
                <div className="register-scroll">
                  <table className="register">
                    <thead>
                      <tr>
                        <th>Invoice No</th>
                        <th>Fee Category</th>
                        <th>Total Amount</th>
                        <th>Paid Amount</th>
                        <th>Transaction UTR</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rule-soft font-medium text-ink">
                      {invoices.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-ink-faint text-xs">
                            No fee invoices created yet. Click "Pay fees" to make your first payment.
                          </td>
                        </tr>
                      ) : (
                        invoices.map((inv) => {
                          const tx = inv.payments?.[0]?.transactionNumber || inv.payments?.[0]?.providerTxId || 'N/A';
                          return (
                            <tr key={inv.id} className="hover:bg-manila/25">
                              <td className="font-mono text-xs font-medium text-copy">{inv.invoiceNumber}</td>
                              <td className="text-xs text-ink font-medium">{inv.feeCategory}</td>
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
            </div>
          )}

          {/* TAB 4: PAYMENT HISTORY (APPROVED INVOICES COPY SHOWCASE) */}
          {activeTab === 'payments' && (
            <div className="bg-sheet p-6 border border-rule space-y-6">
              <div className="border-b border-rule-soft pb-4">
                <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-copy" />
                  <span>Paid invoices</span>
                </h2>
                <p className="text-xs text-ink-soft">
                  Approved invoice receipts and verified payment records for download & inspection
                </p>
              </div>

              <div className="register-scroll">
                <table className="register">
                  <thead>
                    <tr>
                      <th>Invoice No</th>
                      <th>Fee Category</th>
                      <th>Amount Paid</th>
                      <th>Transaction UTR No</th>
                      <th>Approved Date</th>
                      <th>Status</th>
                      <th className="num">Approved Invoice Copy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule-soft font-medium text-ink">
                    {approvedInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-ink-faint text-xs">
                          No approved fee invoices available yet. Invoices will appear here once approved by Accounts.
                        </td>
                      </tr>
                    ) : (
                      approvedInvoices.map((inv) => {
                        const tx = inv.payments?.[0]?.transactionNumber || inv.payments?.[0]?.providerTxId || 'N/A';
                        return (
                          <tr key={inv.id} className="hover:bg-manila/25">
                            <td className="font-mono text-xs font-medium text-copy">{inv.invoiceNumber}</td>
                            <td className="text-xs text-ink font-medium">{inv.feeCategory}</td>
                            <td className="text-xs font-medium text-copy">
                              Rs. {inv.paidAmount.toLocaleString('en-IN')}
                            </td>
                            <td className="font-mono text-xs text-ink">{tx}</td>
                            <td className="text-xs text-ink-soft">
                              {new Date(inv.createdAt).toLocaleDateString('en-GB')}
                            </td>
                            <td>
                              <span className="bg-paid-wash text-paid mark">
                                APPROVED & VERIFIED
                              </span>
                            </td>
                            <td className="text-right">
                              <button
                                onClick={() => setSelectedInvoiceForCopy(inv)}
                                className="bg-copy-wash hover:bg-copy-wash text-copy px-3 py-1.5 text-xs font-medium cursor-pointer transition-all flex items-center space-x-1 ml-auto"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>View Invoice Copy</span>
                              </button>
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
        </main>
      </div>

      {/* FEE PAYMENT MODAL (ACCOUNTS SAME PROCESS) */}
      {isPayOpen && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-sheet w-full max-w-lg border border-rule overflow-hidden space-y-5 p-6">
            <div className="flex justify-between items-center border-b border-rule-soft pb-3">
              <div>
                <h3 className="text-base font-medium text-ink">Student Online Fee Payment</h3>
                <p className="text-xs text-ink-soft">
                  {studentRecord?.profile?.fullName || currentUser?.fullName} ({studentRecord?.studentCode || 'STU_1001'})
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

                {/* Amount text box appears ONLY after selecting at least one category */}
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
                        <span>Submit payment</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* APPROVED INVOICE COPY MODAL */}
      {selectedInvoiceForCopy && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-sheet w-full max-w-xl border border-rule overflow-hidden space-y-5 p-8 text-ink">
            {/* School Receipt Header */}
            <div className="border-b border-rule pb-4 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold text-ink">St. Xavier International School</h3>
                <p className="text-xs text-ink-soft mt-0.5">Official Fee Payment Receipt & Approved Invoice Copy</p>
                <div className="text-[10px] font-mono text-ink-faint mt-1">Affiliation No: 1104892 • CBSE Board</div>
              </div>

              <div className="text-right">
                <span className="bg-copy-wash text-copy-deep font-semibold text-xs px-3 py-1 uppercase border border-copy/40 inline-block">
                  ✓ APPROVED & VERIFIED
                </span>
                <div className="text-xs font-mono font-medium text-copy mt-2">
                  Invoice #: {selectedInvoiceForCopy.invoiceNumber}
                </div>
              </div>
            </div>

            {/* Student & Payment Info Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-paper p-4 border border-rule">
              <div>
                <span className="text-ink-soft font-medium block">Student Full Name:</span>
                <strong className="text-sm font-medium text-ink">
                  {selectedInvoiceForCopy.student?.profile?.fullName || currentUser?.fullName}
                </strong>
              </div>

              <div>
                <span className="text-ink-soft font-medium block">Student ID / Code:</span>
                <strong className="text-sm font-mono font-medium text-copy">
                  {selectedInvoiceForCopy.student?.studentCode || currentUser?.studentId || 'STU_1001'}
                </strong>
              </div>

              <div>
                <span className="text-ink-soft font-medium block">Class & Section:</span>
                <strong className="text-sm font-medium text-ink">
                  {selectedInvoiceForCopy.student?.enrollments?.[0]?.class?.name || 'Class 10'}-{selectedInvoiceForCopy.student?.enrollments?.[0]?.section?.name || 'A'}
                </strong>
              </div>

              <div>
                <span className="text-ink-soft font-medium block">Roll Number:</span>
                <strong className="text-sm font-medium text-ink">
                  #{selectedInvoiceForCopy.student?.rollNumber || '101'}
                </strong>
              </div>

              <div>
                <span className="text-ink-soft font-medium block">Transaction UTR No:</span>
                <strong className="text-sm font-mono font-medium text-ink">
                  {selectedInvoiceForCopy.payments?.[0]?.transactionNumber || '123456789012'}
                </strong>
              </div>

              <div>
                <span className="text-ink-soft font-medium block">Approved Date:</span>
                <strong className="text-sm font-mono font-medium text-ink">
                  {new Date(selectedInvoiceForCopy.createdAt).toLocaleDateString('en-GB')}
                </strong>
              </div>
            </div>

            {/* Fee Items Table */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-ink uppercase tracking-wider">Fee Receipt Breakdown</div>
              <div className="border border-rule overflow-hidden">
                <table className="register">
                  <thead className="bg-ink text-white uppercase text-[10px]">
                    <tr>
                      <th>Fee Category Description</th>
                      <th className="num">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule-soft">
                    <tr>
                      <td className="font-medium text-ink">{selectedInvoiceForCopy.feeCategory}</td>
                      <td className="text-right font-medium text-copy">
                        Rs. {selectedInvoiceForCopy.paidAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                    <tr className="bg-paper font-medium">
                      <td className="text-ink">Total Amount Paid & Cleared</td>
                      <td className="text-right text-copy-deep text-sm">
                        Rs. {selectedInvoiceForCopy.paidAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[10px] text-ink-faint italic">
                Computer-generated approved receipt copy. Valid without signature.
              </span>
              <button
                onClick={() => setSelectedInvoiceForCopy(null)}
                className="bg-ink hover:bg-copy-deep text-white font-medium px-5 py-2 text-xs cursor-pointer"
              >
                Close Receipt Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
