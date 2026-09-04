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
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Header userRole="USER" userName={currentUser?.fullName || 'Enrolled Student'} />

      <div className="flex flex-1">
        <Sidebar role="USER" activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-8 overflow-y-auto space-y-8">
          {/* TAB 1: STUDENT PROFILE (PROFILE DATA FROM ADMIN PANEL) */}
          {activeTab === 'profile' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-[#0b192c] flex items-center space-x-2">
                  <UserCheck className="w-5 h-5 text-[#0d9488]" />
                  <span>Enrolled Student Profile & Academic Credentials</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Student details as registered during admission in the Admin Panel
                </p>
              </div>

              {/* Student Details Showcase */}
              <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0b192c] text-white p-6 rounded-2xl">
                  <div>
                    <span className="text-teal-400 text-xs font-mono font-bold uppercase tracking-wider">
                      Student ID: {studentRecord?.studentCode || currentUser?.studentId || 'STU_1001'}
                    </span>
                    <h3 className="text-xl font-extrabold text-white mt-1">
                      {studentRecord?.profile?.fullName || currentUser?.fullName}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1">
                      Class: <strong>{studentRecord?.enrollments?.[0]?.class?.name || 'Class 10'}-{studentRecord?.enrollments?.[0]?.section?.name || 'A'}</strong> • Roll No: #{studentRecord?.rollNumber || '101'}
                    </p>
                  </div>

                  <div className="bg-[#1e3e62] p-4 rounded-xl border border-teal-500/30 text-right">
                    <div className="text-[10px] text-teal-200 font-bold uppercase">Date of Birth (Login Password)</div>
                    <div className="text-lg font-mono font-extrabold text-teal-300 mt-0.5">
                      {dobFormatted}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Student Code / ID</span>
                    <div className="text-sm font-mono font-bold text-[#0d9488]">
                      {studentRecord?.studentCode || 'STU_1001'}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Roll Number</span>
                    <div className="text-sm font-bold text-[#0b192c]">#{studentRecord?.rollNumber || '101'}</div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Class & Section</span>
                    <div className="text-sm font-bold text-[#0b192c]">
                      {studentRecord?.enrollments?.[0]?.class?.name || 'Class 10'}-Section {studentRecord?.enrollments?.[0]?.section?.name || 'A'}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Date of Birth (DOB)</span>
                    <div className="text-sm font-mono font-bold text-slate-800">{dobFormatted}</div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Parent / Guardian Name</span>
                    <div className="text-sm font-bold text-[#0b192c]">
                      {studentRecord?.parents?.[0]?.parent?.fullName || 'Suresh Sharma'}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Parent Mobile Number</span>
                    <div className="text-sm font-mono font-bold text-[#0d9488]">
                      {studentRecord?.parents?.[0]?.parent?.phone || studentRecord?.profile?.phone || '+91 98765 43210'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ATTENDANCE RECORD (ENTIRE ATTENDANCE THROUGHOUT THE MONTH ONLY) */}
          {activeTab === 'attendance' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-[#0b192c] flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-[#0d9488]" />
                    <span>Monthly Attendance Record</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Entire attendance breakdown throughout the month
                  </p>
                </div>

                {/* Month Selector Dropdown */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-700">Select Month:</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50 text-[#0b192c] cursor-pointer"
                  >
                    {monthOptions.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Monthly Attendance Summary Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                  <div className="text-xs font-bold text-slate-700 uppercase">Monthly Working Days</div>
                  <div className="text-2xl font-extrabold text-[#0b192c] mt-1">{totalMonthlyDays} Days</div>
                  <div className="text-[10px] text-slate-500 mt-1">For {selectedMonth}</div>
                </div>

                <div className="bg-teal-50 border border-teal-200 p-4 rounded-2xl">
                  <div className="text-xs font-bold text-teal-800 uppercase">Days Present</div>
                  <div className="text-2xl font-extrabold text-[#0d9488] mt-1">{presentMonthlyDays} Days</div>
                  <div className="text-[10px] text-slate-500 mt-1">Attended sessions</div>
                </div>

                <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl">
                  <div className="text-xs font-bold text-rose-800 uppercase">Days Absent</div>
                  <div className="text-2xl font-extrabold text-rose-600 mt-1">{absentMonthlyDays} Days</div>
                  <div className="text-[10px] text-slate-500 mt-1">Unexcused leaves</div>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
                  <div className="text-xs font-bold text-amber-800 uppercase">Monthly Attendance %</div>
                  <div className="text-2xl font-extrabold text-amber-600 mt-1">{monthlyPercentage}%</div>
                  <div className="text-[10px] text-slate-500 mt-1">Overall monthly score</div>
                </div>
              </div>

              {/* Monthly Daily Attendance Calendar Table */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#0b192c] uppercase tracking-wider">
                  Daily Attendance Log for {selectedMonth}
                </h3>
                <div className="table-responsive">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#0b192c] text-white text-xs uppercase tracking-wider">
                        <th className="p-3.5 rounded-l-xl">Date</th>
                        <th className="p-3.5">Class & Section</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Marked By</th>
                        <th className="p-3.5 rounded-r-xl">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {currentMonthRecords.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">
                            No attendance records for {selectedMonth}.
                          </td>
                        </tr>
                      ) : (
                        currentMonthRecords.map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-50">
                            <td className="p-3.5 font-mono text-xs font-bold text-slate-800">
                              {new Date(rec.date).toLocaleDateString('en-GB')}
                            </td>
                            <td className="p-3.5 text-xs text-slate-600">
                              {rec.class?.name || 'Class 10'}-{rec.section?.name || 'A'}
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                                  rec.status === 'PRESENT'
                                    ? 'bg-teal-100 text-teal-800'
                                    : rec.status === 'ABSENT'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {rec.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-xs text-slate-500">{rec.markedBy || 'Class Teacher'}</td>
                            <td className="p-3.5 text-xs text-slate-600">{rec.remarks || 'Regular Session'}</td>
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-[#0b192c] flex items-center space-x-2">
                    <CreditCard className="w-5 h-5 text-[#0d9488]" />
                    <span>Student Fee Ledger & Online Fee Payment</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Select fee categories, enter payment amount, scan UPI QR code & submit Transaction UTR for approval
                  </p>
                </div>

                <button
                  onClick={handleOpenPay}
                  className="bg-[#0d9488] hover:bg-[#0f766e] text-white font-bold px-5 py-2 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center space-x-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Pay Fee Online</span>
                </button>
              </div>

              {/* Fee Ledger Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                  <div className="text-xs font-bold text-slate-700 uppercase">Total Academic Fee</div>
                  <div className="text-2xl font-extrabold text-[#0b192c] mt-1">
                    Rs. {totalFeeToPay.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Academic Session 2026-27</div>
                </div>

                <div className="bg-teal-50 border border-teal-200 p-4 rounded-2xl">
                  <div className="text-xs font-bold text-teal-800 uppercase">Approved Amount Paid</div>
                  <div className="text-2xl font-extrabold text-[#0d9488] mt-1">
                    Rs. {totalPaidAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Receipts verified</div>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
                  <div className="text-xs font-bold text-amber-800 uppercase">Pending Approval</div>
                  <div className="text-2xl font-extrabold text-amber-600 mt-1">
                    Rs. {pendingInvoicesAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Under Accounts verification</div>
                </div>

                <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl">
                  <div className="text-xs font-bold text-rose-800 uppercase">Remaining Balance</div>
                  <div className="text-2xl font-extrabold text-rose-600 mt-1">
                    Rs. {balanceAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Outstanding balance to pay</div>
                </div>
              </div>

              {/* Invoices List for Student */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#0b192c] uppercase tracking-wider">Fee Invoices & Ledger Breakdown</h3>
                <div className="table-responsive">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#0b192c] text-white text-xs uppercase tracking-wider">
                        <th className="p-3.5 rounded-l-xl">Invoice No</th>
                        <th className="p-3.5">Fee Category</th>
                        <th className="p-3.5">Total Amount</th>
                        <th className="p-3.5">Paid Amount</th>
                        <th className="p-3.5">Transaction UTR</th>
                        <th className="p-3.5 rounded-r-xl">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {invoices.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                            No fee invoices created yet. Click "Pay Fee Online" to make your first payment.
                          </td>
                        </tr>
                      ) : (
                        invoices.map((inv) => {
                          const tx = inv.payments?.[0]?.transactionNumber || inv.payments?.[0]?.providerTxId || 'N/A';
                          return (
                            <tr key={inv.id} className="hover:bg-slate-50">
                              <td className="p-3.5 font-mono text-xs font-bold text-[#0d9488]">{inv.invoiceNumber}</td>
                              <td className="p-3.5 text-xs text-slate-700 font-bold">{inv.feeCategory}</td>
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
            </div>
          )}

          {/* TAB 4: PAYMENT HISTORY (APPROVED INVOICES COPY SHOWCASE) */}
          {activeTab === 'payments' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-[#0b192c] flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-[#0d9488]" />
                  <span>Approved Fee Invoices & Payment History</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Approved invoice receipts and verified payment records for download & inspection
                </p>
              </div>

              <div className="table-responsive">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#0b192c] text-white text-xs uppercase tracking-wider">
                      <th className="p-3.5 rounded-l-xl">Invoice No</th>
                      <th className="p-3.5">Fee Category</th>
                      <th className="p-3.5">Amount Paid</th>
                      <th className="p-3.5">Transaction UTR No</th>
                      <th className="p-3.5">Approved Date</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right rounded-r-xl">Approved Invoice Copy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {approvedInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                          No approved fee invoices available yet. Invoices will appear here once approved by Accounts.
                        </td>
                      </tr>
                    ) : (
                      approvedInvoices.map((inv) => {
                        const tx = inv.payments?.[0]?.transactionNumber || inv.payments?.[0]?.providerTxId || 'N/A';
                        return (
                          <tr key={inv.id} className="hover:bg-slate-50">
                            <td className="p-3.5 font-mono text-xs font-bold text-[#0d9488]">{inv.invoiceNumber}</td>
                            <td className="p-3.5 text-xs text-slate-700 font-bold">{inv.feeCategory}</td>
                            <td className="p-3.5 text-xs font-bold text-[#0d9488]">
                              Rs. {inv.paidAmount.toLocaleString('en-IN')}
                            </td>
                            <td className="p-3.5 font-mono text-xs text-slate-700">{tx}</td>
                            <td className="p-3.5 text-xs text-slate-500">
                              {new Date(inv.createdAt).toLocaleDateString('en-GB')}
                            </td>
                            <td className="p-3.5">
                              <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                                APPROVED & VERIFIED
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => setSelectedInvoiceForCopy(inv)}
                                className="bg-teal-50 hover:bg-teal-100 text-[#0d9488] px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center space-x-1 ml-auto"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden space-y-5 p-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#0b192c]">Student Online Fee Payment</h3>
                <p className="text-xs text-slate-500">
                  {studentRecord?.profile?.fullName || currentUser?.fullName} ({studentRecord?.studentCode || 'STU_1001'})
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

                {/* Amount text box appears ONLY after selecting at least one category */}
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
                        <span>Done (Submit Fee Payment)</span>
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden space-y-5 p-8 text-slate-800">
            {/* School Receipt Header */}
            <div className="border-b border-slate-200 pb-4 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-extrabold text-[#0b192c]">St. Xavier International School</h3>
                <p className="text-xs text-slate-500 mt-0.5">Official Fee Payment Receipt & Approved Invoice Copy</p>
                <div className="text-[10px] font-mono text-slate-400 mt-1">Affiliation No: 1104892 • CBSE Board</div>
              </div>

              <div className="text-right">
                <span className="bg-teal-100 text-teal-900 font-extrabold text-xs px-3 py-1 rounded-full uppercase border border-teal-300 inline-block">
                  ✓ APPROVED & VERIFIED
                </span>
                <div className="text-xs font-mono font-bold text-[#0d9488] mt-2">
                  Invoice #: {selectedInvoiceForCopy.invoiceNumber}
                </div>
              </div>
            </div>

            {/* Student & Payment Info Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-slate-500 font-medium block">Student Full Name:</span>
                <strong className="text-sm font-bold text-[#0b192c]">
                  {selectedInvoiceForCopy.student?.profile?.fullName || currentUser?.fullName}
                </strong>
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Student ID / Code:</span>
                <strong className="text-sm font-mono font-bold text-[#0d9488]">
                  {selectedInvoiceForCopy.student?.studentCode || currentUser?.studentId || 'STU_1001'}
                </strong>
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Class & Section:</span>
                <strong className="text-sm font-bold text-slate-800">
                  {selectedInvoiceForCopy.student?.enrollments?.[0]?.class?.name || 'Class 10'}-{selectedInvoiceForCopy.student?.enrollments?.[0]?.section?.name || 'A'}
                </strong>
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Roll Number:</span>
                <strong className="text-sm font-bold text-slate-800">
                  #{selectedInvoiceForCopy.student?.rollNumber || '101'}
                </strong>
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Transaction UTR No:</span>
                <strong className="text-sm font-mono font-bold text-slate-800">
                  {selectedInvoiceForCopy.payments?.[0]?.transactionNumber || '123456789012'}
                </strong>
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Approved Date:</span>
                <strong className="text-sm font-mono font-bold text-slate-800">
                  {new Date(selectedInvoiceForCopy.createdAt).toLocaleDateString('en-GB')}
                </strong>
              </div>
            </div>

            {/* Fee Items Table */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#0b192c] uppercase tracking-wider">Fee Receipt Breakdown</div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0b192c] text-white uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Fee Category Description</th>
                      <th className="p-3 text-right">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3 font-bold text-slate-800">{selectedInvoiceForCopy.feeCategory}</td>
                      <td className="p-3 text-right font-bold text-[#0d9488]">
                        Rs. {selectedInvoiceForCopy.paidAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                    <tr className="bg-slate-50 font-bold">
                      <td className="p-3 text-[#0b192c]">Total Amount Paid & Cleared</td>
                      <td className="p-3 text-right text-teal-800 text-sm">
                        Rs. {selectedInvoiceForCopy.paidAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[10px] text-slate-400 italic">
                Computer-generated approved receipt copy. Valid without signature.
              </span>
              <button
                onClick={() => setSelectedInvoiceForCopy(null)}
                className="bg-[#0b192c] hover:bg-[#1e3e62] text-white font-bold px-5 py-2 rounded-xl text-xs cursor-pointer shadow-md"
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
