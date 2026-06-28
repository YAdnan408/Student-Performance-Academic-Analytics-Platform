'use client';

import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Footer from './Footer';
import ProtectedRoute from '@/components/ProtectedRoute';
import { UserRole } from '@/types/auth';

interface DashboardLayoutProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, allowedRoles }) => {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        <Sidebar />
        <div className="lg:pl-64 flex flex-col min-h-screen">
          <Topbar />
          <main className="flex-1 p-4 lg:p-8">
            {children}
          </main>
          <Footer />
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default DashboardLayout;
