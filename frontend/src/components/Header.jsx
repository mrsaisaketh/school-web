import React from 'react';
import { useNavigate } from 'react-router-dom';
import { School, User, LogOut } from 'lucide-react';

export default function Header({ userRole, userName }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('erp_user');
    navigate('/login');
  };

  return (
    <header className="bg-[#0b192c] text-white border-b border-[#1e3e62] px-6 py-3.5 flex items-center justify-between shadow-md">
      <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/login')}>
        <div className="bg-[#0d9488] text-white p-2 rounded-xl shadow-lg">
          <School className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-base font-extrabold tracking-tight text-white">St. Xavier ERP Portal</h1>
          <p className="text-[10px] text-teal-300 font-semibold tracking-wide uppercase">Enterprise School Platform</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {userRole && userRole !== 'GUEST' ? (
          <div className="flex items-center space-x-3 bg-[#1e3e62] px-3.5 py-1.5 rounded-xl border border-teal-500/30">
            <User className="w-4 h-4 text-teal-300" />
            <div className="text-left">
              <div className="text-xs font-bold text-white">{userName || userRole.replace('_', ' ')}</div>
              <div className="text-[10px] text-teal-300 font-medium">{userRole.replace('_', ' ')}</div>
            </div>
            <button
              onClick={handleLogout}
              className="ml-2 text-slate-300 hover:text-rose-400 p-1 transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="bg-[#0d9488] hover:bg-[#0f766e] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-md"
          >
            Portal Sign In
          </button>
        )}
      </div>
    </header>
  );
}
