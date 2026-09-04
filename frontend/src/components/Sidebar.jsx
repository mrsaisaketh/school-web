import React from 'react';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Calendar,
  CreditCard,
  Receipt,
  Briefcase,
  FileText,
  Bell,
  ShieldCheck,
  Settings,
  DollarSign,
  Clock,
  CheckSquare,
  BookOpen,
  Award,
} from 'lucide-react';

export default function Sidebar({ role, activeTab, setActiveTab, isClassTeacher = true }) {
  const getNavItems = () => {
    switch (role) {
      case 'SUPER_ADMIN':
        return [
          { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'students', label: 'Students', icon: Users },
          { id: 'staff', label: 'Staff Management', icon: UserCheck },
          { id: 'attendance', label: 'Attendance Records', icon: Calendar },
          { id: 'fees', label: 'Fees & Invoices', icon: CreditCard },
          { id: 'leave', label: 'Leave Requests', icon: Clock },
          { id: 'work', label: 'Daily Work Updates', icon: CheckSquare },
          { id: 'careers', label: 'Careers & Applications', icon: Briefcase },
        ];
      case 'ADMIN':
        return [
          { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'students', label: 'Student Admissions', icon: Users },
          { id: 'staff', label: 'Staff Management', icon: UserCheck },
          { id: 'academic', label: 'Academic Setup', icon: BookOpen },
          { id: 'attendance', label: 'Attendance Records', icon: Calendar },
          { id: 'work', label: 'Daily Work Logs', icon: CheckSquare },
          { id: 'leave', label: 'Leave Approvals', icon: Clock },
        ];
      case 'ACCOUNTS':
        return [
          { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'fee_structures', label: 'Fee Structures', icon: CreditCard },
          { id: 'invoices', label: 'Invoices Issued', icon: Receipt },
          { id: 'payments', label: 'Payment History', icon: DollarSign },
        ];
      case 'STAFF': {
        const staffItems = [
          { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'profile', label: 'My Profile', icon: UserCheck },
          { id: 'students', label: 'Class Students', icon: Users },
        ];
        if (isClassTeacher) {
          staffItems.push({ id: 'attendance', label: 'Mark Class Attendance', icon: Calendar });
        }
        staffItems.push({ id: 'work', label: 'Submit Daily Work', icon: CheckSquare });
        staffItems.push({ id: 'leave', label: 'Leave Requests', icon: Clock });
        return staffItems;
      }
      case 'USER':
        return [
          { id: 'profile', label: 'Student Profile', icon: UserCheck },
          { id: 'attendance', label: 'Attendance Record', icon: Calendar },
          { id: 'fees', label: 'Fee Ledger & Pay', icon: CreditCard },
          { id: 'payments', label: 'Payment History', icon: DollarSign },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="w-56 shrink-0 border-r border-rule bg-sheet">
      <nav className="sticky top-14 p-3">
        <p className="px-2 pb-2 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-faint">
          Registers
        </p>
        <ul className="space-y-px">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  /* The active register is a folder tab: buff fill and an ink
                     edge on the left, so the eye finds it without a shadow. */
                  className={`flex w-full items-center gap-2.5 border-l-2 px-2.5 py-2 text-left text-[0.8125rem] transition-colors ${
                    isActive
                      ? 'border-copy bg-manila/60 font-medium text-ink'
                      : 'border-transparent text-ink-soft hover:bg-manila/30 hover:text-ink'
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-copy' : 'text-ink-faint'}`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
