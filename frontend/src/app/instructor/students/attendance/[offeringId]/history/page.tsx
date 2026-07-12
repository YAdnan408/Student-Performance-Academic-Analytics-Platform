'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { courseService } from '@/services/courseService';
import { attendanceService } from '@/services/attendanceService';
import { CourseAttendanceResponse, WeeklyTrendResponse } from '@/types/attendance';
import { InstructorCourseItem } from '@/types/course';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';

const AttendanceHistory = () => {
  const params = useParams();
  const offeringId = params.offeringId as string;

  const [course, setCourse] = useState<InstructorCourseItem | null>(null);
  const [attendanceData, setAttendanceData] = useState<CourseAttendanceResponse | null>(null);
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrendResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const courses = await courseService.getInstructorCourses();
        const found = courses.find((c: InstructorCourseItem) => c.offering_id === offeringId);
        setCourse(found || null);

        const [attendance, trend] = await Promise.all([
          attendanceService.getCourseAttendanceForInstructor(offeringId),
          attendanceService.getCourseWeeklyTrend(offeringId),
        ]);
        setAttendanceData(attendance);
        setWeeklyTrend(trend);
      } catch {
        console.error('Failed to load attendance history');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [offeringId]);

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['instructor']}>
        <Spinner />
      </DashboardLayout>
    );
  }

  const getColorClass = (pct: number) => {
    if (pct >= 80) return 'text-emerald-400';
    if (pct >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  const filteredStudents = attendanceData?.students.filter((s) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'good') return s.percentage >= 75;
    if (statusFilter === 'at-risk') return s.percentage < 75;
    return true;
  }) || [];

  const histogramBuckets = [
    { range: '0–20%', min: 0, max: 20 },
    { range: '20–40%', min: 20, max: 40 },
    { range: '40–60%', min: 40, max: 60 },
    { range: '60–80%', min: 60, max: 80 },
    { range: '80–100%', min: 80, max: 100 },
  ];

  const histogramData = histogramBuckets.map((bucket) => {
    const count = attendanceData?.students.filter(
      (s) => s.percentage >= bucket.min && s.percentage < bucket.max
    ).length || 0;
    return { name: bucket.range, count, fill: bucket.max <= 60 ? '#f87171' : bucket.max <= 80 ? '#fbbf24' : '#34d399' };
  });

  const weeklyLineData = weeklyTrend?.weekly_trend.map((w) => ({
    week: w.week,
    percentage: w.percentage,
  })) || [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-white/10 rounded-xl px-4 py-3 shadow-xl">
          <p className="text-white text-sm font-medium">{label}</p>
          <p className="text-purple-200 text-xs">{payload[0].value}{payload[0].name === 'count' ? ' students' : '%'}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout allowedRoles={['instructor']}>
      <div className="animate-fadeIn">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Attendance History — {course?.title || 'Course'}
          </h1>
          <p className="text-purple-200/60 mt-1">{course?.course_code}</p>
        </div>

        {attendanceData && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <Card>
                <div className="text-center">
                  <p className="text-sm text-purple-200/60 mb-1">Class Average</p>
                  <p className={`text-3xl font-bold ${getColorClass(attendanceData.class_average_percentage)}`}>
                    {attendanceData.class_average_percentage}%
                  </p>
                </div>
              </Card>
              <Card>
                <div className="text-center">
                  <p className="text-sm text-purple-200/60 mb-1">Total Students</p>
                  <p className="text-3xl font-bold text-white">{attendanceData.total_students}</p>
                </div>
              </Card>
              <Card>
                <div className="text-center">
                  <p className="text-sm text-purple-200/60 mb-1">Classes Recorded</p>
                  <p className="text-3xl font-bold text-white">{attendanceData.total_classes_recorded}</p>
                </div>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Histogram */}
              <Card>
                <h2 className="text-lg font-semibold text-white mb-4">Attendance Distribution</h2>
                {histogramData.some((d) => d.count > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={histogramData} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fill: '#c4b5fd', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#c4b5fd', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {histogramData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-purple-200/40 text-sm text-center py-12">No data available.</p>
                )}
              </Card>

              {/* Weekly Trend */}
              <Card>
                <h2 className="text-lg font-semibold text-white mb-4">Weekly Attendance Trend</h2>
                {weeklyLineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={weeklyLineData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="week" tick={{ fill: '#c4b5fd', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#c4b5fd', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="percentage" stroke="#a78bfa" strokeWidth={3} dot={{ fill: '#a78bfa', strokeWidth: 2, r: 5 }} activeDot={{ r: 7 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-purple-200/40 text-sm text-center py-12">No trend data yet.</p>
                )}
              </Card>
            </div>

            {/* Student Breakdown with Filter */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Per-Student Attendance</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-purple-200/60">Filter:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-800/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/50"
                >
                  <option value="all">All Students</option>
                  <option value="good">Good Standing (≥75%)</option>
                  <option value="at-risk">At Risk (&lt;75%)</option>
                </select>
              </div>
            </div>
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-2 text-purple-200/60 font-medium">#</th>
                      <th className="text-left py-3 px-2 text-purple-200/60 font-medium">Student Name</th>
                      <th className="text-left py-3 px-2 text-purple-200/60 font-medium">Student ID</th>
                      <th className="text-center py-3 px-2 text-purple-200/60 font-medium">Classes</th>
                      <th className="text-center py-3 px-2 text-emerald-400/60 font-medium">P</th>
                      <th className="text-center py-3 px-2 text-red-400/60 font-medium">A</th>
                      <th className="text-center py-3 px-2 text-amber-400/60 font-medium">L</th>
                      <th className="text-center py-3 px-2 text-purple-200/60 font-medium">%</th>
                      <th className="text-left py-3 px-2 text-purple-200/60 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, index) => (
                      <tr key={student.enrollment_id} className="border-b border-white/5 last:border-0">
                        <td className="py-3 px-2 text-purple-200/40">{index + 1}</td>
                        <td className="py-3 px-2 text-white font-medium">{student.student_name}</td>
                        <td className="py-3 px-2 text-purple-200/60">{student.student_code || '—'}</td>
                        <td className="py-3 px-2 text-center text-white">{student.total_classes}</td>
                        <td className="py-3 px-2 text-center text-emerald-400">{student.present}</td>
                        <td className="py-3 px-2 text-center text-red-400">{student.absent}</td>
                        <td className="py-3 px-2 text-center text-amber-400">{student.late}</td>
                        <td className={`py-3 px-2 text-center font-semibold ${getColorClass(student.percentage)}`}>
                          {student.percentage}%
                        </td>
                        <td className="py-3 px-2">
                          {student.percentage < 75 ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                              At Risk
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Good
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredStudents.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-purple-200/40">
                          No students match the selected filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AttendanceHistory;
