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
    <aside className="w-64 bg-[#0b192c] text-slate-300 min-h-[calc(100vh-4rem)] border-r border-[#1e3e62] flex flex-col justify-between p-4 shrink-0 shadow-lg">
      <div className="space-y-1">
        <div className="px-3 py-2 text-xs font-bold text-teal-300/80 uppercase tracking-wider">
          {role.replace('_', ' ')} Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#1e3e62] text-white border border-teal-500/40 font-semibold shadow-md'
                  : 'hover:bg-[#1e3e62]/50 hover:text-white text-slate-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-teal-300' : 'text-teal-400/70'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
