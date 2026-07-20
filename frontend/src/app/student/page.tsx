'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { RecentActivityList, UpcomingDeadlinesList } from '@/components/dashboard/ActivityPanels';
import { RecommendationsList, RiskPredictionsList } from '@/components/intelligence/InsightPanels';
import { analyticsService } from '@/services/analyticsService';
import { intelligenceService } from '@/services/intelligenceService';
import { StudentDashboardAnalytics } from '@/types/analytics';
import { StudentInsights } from '@/types/intelligence';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState<StudentDashboardAnalytics | null>(null);
  const [insights, setInsights] = useState<StudentInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const [dash, intel] = await Promise.all([
      analyticsService.getStudentDashboard(),
      intelligenceService.getStudentInsights().catch(() => null),
    ]);
    setData(dash);
    setInsights(intel);
  };

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleRefreshInsights = async () => {
    try {
      setRefreshing(true);
      const intel = await intelligenceService.refreshStudentInsights();
      setInsights(intel);
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  const stats = [
    {
      label: 'Enrolled Courses',
      value: data ? String(data.gpa.total_courses) : '—',
      color: 'from-purple-500 to-blue-600',
    },
    {
      label: 'Current GPA',
      value: data?.gpa.cgpa != null ? data.gpa.cgpa.toFixed(2) : '—',
      color: 'from-emerald-500 to-teal-600',
    },
    {
      label: 'Attendance',
      value: data ? `${data.attendance.overall_attendance_percentage}%` : '—',
      color: 'from-amber-500 to-orange-600',
    },
    {
      label: 'High Risk Courses',
      value: insights ? String(insights.summary?.high_risk ?? 0) : '—',
      color: 'from-rose-500 to-pink-600',
    },
  ];

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['student']}>
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={['student']}>
      <div className="animate-fadeIn">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Student Dashboard</h1>
          <p className="text-purple-200/60 mt-1">Welcome back, {user?.email}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {stats.map((stat, i) => (
            <Card key={i}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                  <span className="text-white font-bold text-lg">{stat.value}</span>
                </div>
                <div>
                  <p className="text-sm text-purple-200/60">{stat.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Performance Risk</h2>
              <Button size="sm" variant="ghost" loading={refreshing} onClick={handleRefreshInsights}>
                Refresh
              </Button>
            </div>
            <RiskPredictionsList items={insights?.predictions || []} />
          </Card>
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4">Recommendations</h2>
            <RecommendationsList items={insights?.recommendations || []} />
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
            <RecentActivityList items={data?.recent_activity || []} />
          </Card>
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4">Upcoming Deadlines</h2>
            <UpcomingDeadlinesList items={data?.upcoming_deadlines || []} />
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
