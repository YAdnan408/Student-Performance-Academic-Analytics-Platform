'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

const UnauthorizedPage = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="relative w-full max-w-md px-4 py-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 mb-6">
          <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-7.364A9 9 0 1112 3a9 9 0 017.364 4.636z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-purple-200/70 mb-2">
          You do not have permission to view this page.
        </p>
        <p className="text-purple-200/50 text-sm mb-8">
          Your current role is <span className="text-purple-300 font-medium capitalize">{user?.role || 'unknown'}</span>.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href={user?.role === 'instructor' ? '/instructor' : '/student'}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl transition-all duration-200"
          >
            Go to Dashboard
          </Link>
          <button
            onClick={logout}
            className="px-6 py-2.5 text-sm font-medium text-red-300/70 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-200 border border-red-500/20"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
