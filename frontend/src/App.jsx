import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Careers from './pages/Careers';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AccountsDashboard from './pages/AccountsDashboard';
import StaffDashboard from './pages/StaffDashboard';
import UserDashboard from './pages/UserDashboard';
import { getToken, getUser } from './lib/api';

// Keeps the wrong dashboard from rendering for the wrong user. This is a UX
// guard only — every route the pages call is enforced server-side as well.
function Protected({ role, children }) {
  const user = getUser();
  if (!getToken() || !user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/careers" element={<Careers />} />
        <Route
          path="/dashboard/super-admin"
          element={<Protected role="SUPER_ADMIN"><SuperAdminDashboard /></Protected>}
        />
        <Route
          path="/dashboard/admin"
          element={<Protected role="ADMIN"><AdminDashboard /></Protected>}
        />
        <Route
          path="/dashboard/accounts"
          element={<Protected role="ACCOUNTS"><AccountsDashboard /></Protected>}
        />
        <Route
          path="/dashboard/staff"
          element={<Protected role="STAFF"><StaffDashboard /></Protected>}
        />
        <Route
          path="/dashboard/user"
          element={<Protected role="USER"><UserDashboard /></Protected>}
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
