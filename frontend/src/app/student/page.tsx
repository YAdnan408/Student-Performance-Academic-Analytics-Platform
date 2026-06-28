'use client';

import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';

const StudentDashboard = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout allowedRoles={['student']}>
      <div className="animate-fadeIn">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Student Dashboard</h1>
          <p className="text-purple-200/60 mt-1">Welcome back, {user?.email}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[
            { label: 'Enrolled Courses', value: '—', color: 'from-purple-500 to-blue-600' },
            { label: 'Current GPA', value: '—', color: 'from-emerald-500 to-teal-600' },
            { label: 'Attendance', value: '—', color: 'from-amber-500 to-orange-600' },
            { label: 'Pending Tasks', value: '—', color: 'from-rose-500 to-pink-600' },
          ].map((stat, i) => (
            <Card key={i}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                  <span className="text-white font-bold text-lg">{stat.value === '—' ? '—' : stat.value}</span>
                </div>
                <div>
                  <p className="text-sm text-purple-200/60">{stat.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
            <p className="text-purple-200/40 text-sm">No recent activity to display.</p>
          </Card>
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4">Upcoming Deadlines</h2>
            <p className="text-purple-200/40 text-sm">No upcoming deadlines.</p>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
