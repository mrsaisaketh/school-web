import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import { School, Shield, ArrowRight, Lock, UserCheck, Mail } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') || 'SUPER_ADMIN';

  const [email, setEmail] = useState('superadmin@school.com');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState(initialRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRoleSelect = (r) => {
    setRole(r);
    switch (r) {
      case 'SUPER_ADMIN':
        setEmail('superadmin@school.com');
        setPassword('password123');
        break;
      case 'ADMIN':
        setEmail('admin@school.com');
        setPassword('password123');
        break;
      case 'ACCOUNTS':
        setEmail('accounts@school.com');
        setPassword('password123');
        break;
      case 'STAFF':
        setEmail('staff@school.com');
        setPassword('password123');
        break;
      case 'USER':
        setEmail('STU_1001');
        setPassword('15/08/2010');
        break;
      default:
        setEmail('');
        setPassword('');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok && data.user) {
        localStorage.setItem('erp_user', JSON.stringify(data.user));
        switch (data.user.role) {
          case 'SUPER_ADMIN':
            navigate('/dashboard/super-admin');
            break;
          case 'ADMIN':
            navigate('/dashboard/admin');
            break;
          case 'ACCOUNTS':
            navigate('/dashboard/accounts');
            break;
          case 'STAFF':
            navigate('/dashboard/staff');
            break;
          case 'USER':
            navigate('/dashboard/user');
            break;
          default:
            navigate('/login');
        }
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setLoading(false);
      setError('Connection error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b192c] text-white flex flex-col font-sans">
      <Header userRole="GUEST" />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="bg-[#0b192c] text-teal-300 p-3.5 rounded-2xl w-14 h-14 mx-auto flex items-center justify-center border border-[#1e3e62] shadow-xl">
              <School className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">St. Xavier ERP Portal</h1>
            <p className="text-xs text-teal-200/80">Select a role or sign in with your portal credentials</p>
          </div>

          {/* Quick Role Selection Tabs */}
          <div className="bg-[#0b192c] p-1.5 rounded-xl border border-[#1e3e62] grid grid-cols-5 gap-1 shadow-inner">
            {[
              { id: 'SUPER_ADMIN', label: 'Super' },
              { id: 'ADMIN', label: 'Admin' },
              { id: 'ACCOUNTS', label: 'Accounts' },
              { id: 'STAFF', label: 'Staff' },
              { id: 'USER', label: 'Student' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleRoleSelect(item.id)}
                className={`py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  role === item.id
                    ? 'bg-[#0d9488] text-white shadow-md font-extrabold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="bg-white text-slate-900 border border-slate-200 p-6 rounded-2xl shadow-2xl backdrop-blur-md space-y-6">
            <div className="flex items-center space-x-2 text-xs font-semibold text-[#0d9488] bg-teal-50 border border-teal-200 px-3.5 py-2 rounded-xl">
              <Shield className="w-4 h-4 shrink-0 text-[#0d9488]" />
              <span>Target Role: <strong className="font-bold text-[#0b192c]">{role.replace('_', ' ')}</strong> Access</span>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0b192c] mb-1">
                  {role === 'USER' ? 'Student Code / ID' : 'Email Address'}
                </label>
                <div className="relative">
                  {role === 'USER' ? (
                    <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  ) : (
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  )}
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={role === 'USER' ? 'e.g. STU_1001' : 'user@school.com'}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488] focus:outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0b192c] mb-1">
                  {role === 'USER' ? 'Password (DOB: DD/MM/YYYY)' : 'Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={role === 'USER' ? 'DD/MM/YYYY e.g. 15/08/2010' : '••••••••'}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488] focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0d9488] hover:bg-[#0f766e] text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-teal-900/20 flex items-center justify-center space-x-2 cursor-pointer mt-2"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Enter {role.replace('_', ' ')} Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
