'use client';

import { useAuth } from '@/context/AuthContext';

const AdminDashboard = () => {
  const { user, loading, logout } = useAuth();

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <button onClick={logout} className="px-4 py-2 bg-white/10 rounded-xl hover:bg-white/20">Logout</button>
        </div>
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8">
          <p className="text-purple-200/70">Welcome, {user.email}</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
