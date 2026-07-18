'use client';

import { useCallback, useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import PdfPreviewModal from '@/components/reports/PdfPreviewModal';
import { attendanceService } from '@/services/attendanceService';
import { reportsService, reportFilename } from '@/services/reportsService';
import { StudentAttendanceResponse } from '@/types/attendance';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const StudentAttendance = () => {
  const [data, setData] = useState<StudentAttendanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{
    offeringId: string;
    courseCode: string;
    title: string;
  } | null>(null);

  const fetchPdf = useCallback(() => {
    if (!preview) return Promise.reject(new Error('No report selected'));
    return reportsService.fetchPdf('course-attendance', preview.offeringId);
  }, [preview]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await attendanceService.getMyAttendance();
        setData(result);
      } catch {
        setError('Failed to load attendance data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['student']}>
        <Spinner />
      </DashboardLayout>
    );
  }

  const getColorClass = (pct: number) => {
    if (pct >= 80) return 'text-emerald-400';
    if (pct >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  const PIE_COLORS = { present: '#34d399', absent: '#f87171', late: '#fbbf24' };

  const pieData = data
    ? [
        { name: 'Present', value: data.present_count, color: PIE_COLORS.present },
        { name: 'Absent', value: data.absent_count, color: PIE_COLORS.absent },
        { name: 'Late', value: data.late_count, color: PIE_COLORS.late },
      ].filter((d) => d.value > 0)
    : [];

  const barData = data?.course_wise.map((c) => ({
    name: c.course_code,
    percentage: c.percentage,
    fill: c.percentage >= 80 ? '#34d399' : c.percentage >= 60 ? '#fbbf24' : '#f87171',
  })) || [];

  const lineData = data?.monthly_trend.map((m) => ({
    month: m.month,
    percentage: m.percentage,
  })) || [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-white/10 rounded-xl px-4 py-3 shadow-xl">
          <p className="text-white text-sm font-medium">{label}</p>
          <p className="text-purple-200 text-xs">{payload[0].value}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout allowedRoles={['student']}>
      <div className="animate-fadeIn">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">My Attendance</h1>
          <p className="text-purple-200/60 mt-1">Track your attendance across all courses</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">
            {error}
          </div>
        )}

        {data && (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <Card>
                <div className="text-center">
                  <p className="text-sm text-purple-200/60 mb-1">Overall Attendance</p>
                  <p className={`text-4xl font-bold ${getColorClass(data.overall_percentage)}`}>
                    {data.overall_percentage}%
                  </p>
                </div>
              </Card>
              <Card>
                <div className="text-center">
                  <p className="text-sm text-purple-200/60 mb-1">Total Classes</p>
                  <p className="text-4xl font-bold text-white">{data.total_classes}</p>
                </div>
              </Card>
              <Card>
                <div className="text-center">
                  <p className="text-sm text-purple-200/60 mb-1">Present</p>
                  <p className="text-4xl font-bold text-emerald-400">{data.present_count}</p>
                </div>
              </Card>
              <Card>
                <div className="text-center">
                  <p className="text-sm text-purple-200/60 mb-1">Absent</p>
                  <p className="text-4xl font-bold text-red-400">{data.absent_count}</p>
                </div>
              </Card>
            </div>

            {/* Course-wise Detail Stats */}
            {data.course_wise.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">Course-wise Details</h2>
                <div className="space-y-3">
                  {data.course_wise.map((course) => (
                    <Card key={course.course_id}>
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1">
                          <h3 className="text-white font-medium">{course.course_title}</h3>
                          <p className="text-sm text-purple-200/40">{course.course_code}</p>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-center">
                            <p className="text-purple-200/60">Classes</p>
                            <p className="text-white font-semibold">{course.total_classes}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-emerald-400/60">P</p>
                            <p className="text-emerald-400 font-semibold">{course.present}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-red-400/60">A</p>
                            <p className="text-red-400 font-semibold">{course.absent}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-amber-400/60">L</p>
                            <p className="text-amber-400 font-semibold">{course.late}</p>
                          </div>
                          <div className="text-center min-w-[60px]">
                            <p className={`text-lg font-bold ${getColorClass(course.percentage)}`}>
                              {course.percentage}%
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPreview({
                              offeringId: course.offering_id,
                              courseCode: course.course_code,
                              title: `Course Attendance — ${course.course_code}`,
                            })}
                          >
                            PDF
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 w-full bg-slate-700/50 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${course.percentage >= 80 ? 'bg-emerald-500' : course.percentage >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(course.percentage, 100)}%` }}
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Pie Chart - P/A/L Split */}
              <Card>
                <h2 className="text-lg font-semibold text-white mb-4">Attendance Distribution</h2>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={4}>
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend formatter={(value) => <span className="text-purple-200 text-sm">{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-purple-200/40 text-sm text-center py-12">No attendance data yet.</p>
                )}
              </Card>

              {/* Bar Chart - Course-wise */}
              <Card>
                <h2 className="text-lg font-semibold text-white mb-4">Course-wise Attendance %</h2>
                {barData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={barData} barCategoryGap="25%">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fill: '#c4b5fd', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#c4b5fd', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="percentage" radius={[6, 6, 0, 0]}>
                        {barData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-purple-200/40 text-sm text-center py-12">No courses enrolled yet.</p>
                )}
              </Card>
            </div>

            {/* Monthly Trend - Line Chart */}
            {lineData.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">Monthly Attendance Trend</h2>
                <Card>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={lineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" tick={{ fill: '#c4b5fd', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#c4b5fd', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="percentage" stroke="#a78bfa" strokeWidth={3} dot={{ fill: '#a78bfa', strokeWidth: 2, r: 5 }} activeDot={{ r: 7 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            )}
          </>
        )}
      </div>

      <PdfPreviewModal
        isOpen={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.title || 'Report Preview'}
        filename={preview ? reportFilename('course-attendance', preview.offeringId, preview.courseCode) : 'report.pdf'}
        fetchPdf={fetchPdf}
      />
    </DashboardLayout>
  );
};

export default StudentAttendance;
