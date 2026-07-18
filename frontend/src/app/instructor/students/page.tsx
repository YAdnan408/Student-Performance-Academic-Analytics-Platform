'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { courseService } from '@/services/courseService';
import { attendanceService } from '@/services/attendanceService';
import { analyticsService } from '@/services/analyticsService';
import { InstructorCourseItem } from '@/types/course';
import { InstructorAnalyticsOverview } from '@/types/attendance';
import { InstructorGradeOverview } from '@/types/analytics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const InstructorStudents = () => {
  const router = useRouter();
  const [courses, setCourses] = useState<InstructorCourseItem[]>([]);
  const [analytics, setAnalytics] = useState<InstructorAnalyticsOverview | null>(null);
  const [gradeAnalytics, setGradeAnalytics] = useState<InstructorGradeOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesResult, analyticsResult, gradesResult] = await Promise.all([
          courseService.getInstructorCourses(),
          attendanceService.getInstructorAnalyticsOverview(),
          analyticsService.getInstructorGradeOverview(),
        ]);
        setCourses(coursesResult);
        setAnalytics(analyticsResult);
        setGradeAnalytics(gradesResult);
      } catch {
        console.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-white/10 rounded-xl px-4 py-3 shadow-xl">
          <p className="text-white text-sm font-medium">{label}</p>
          <p className="text-purple-200 text-xs">{payload[0].value}% attendance</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['instructor']}>
        <Spinner />
      </DashboardLayout>
    );
  }

  const courseBarData = analytics?.course_stats.map((c) => ({
    name: c.course_code,
    percentage: c.attendance_percentage,
    fill: c.attendance_percentage >= 80 ? '#34d399' : c.attendance_percentage >= 60 ? '#fbbf24' : '#f87171',
  })) || [];

  const gradeBarData = gradeAnalytics?.course_stats.map((c) => ({
    name: c.course_code,
    average: c.class_average ?? 0,
    atRisk: c.students_at_risk,
    fill: (c.class_average ?? 0) >= 70 ? '#34d399' : (c.class_average ?? 0) >= 60 ? '#fbbf24' : '#f87171',
  })) || [];

  const GradeTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-white/10 rounded-xl px-4 py-3 shadow-xl">
          <p className="text-white text-sm font-medium">{label}</p>
          <p className="text-purple-200 text-xs">{payload[0].value}% class average</p>
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout allowedRoles={['instructor']}>
      <div className="animate-fadeIn">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Students</h1>
          <p className="text-purple-200/60 mt-1">Attendance and grade analytics for your courses</p>
        </div>

        {gradeBarData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <h2 className="text-lg font-semibold text-white mb-4">Course Comparison — Class Average %</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={gradeBarData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: '#c4b5fd', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#c4b5fd', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<GradeTooltip />} />
                  <Bar dataKey="average" radius={[6, 6, 0, 0]}>
                    {gradeBarData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <h2 className="text-lg font-semibold text-white mb-4">Grade Analytics by Course</h2>
              <div className="space-y-3">
                {gradeAnalytics?.course_stats.map((course) => (
                  <div key={course.offering_id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-white text-sm font-medium">{course.course_title}</p>
                      <p className="text-purple-200/40 text-xs">{course.course_code} — {course.students_graded}/{course.enrolled_students} graded</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-300">{course.class_average ?? '—'}%</p>
                      {course.students_at_risk > 0 && (
                        <p className="text-xs text-red-400">{course.students_at_risk} at risk (grades)</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Attendance charts */}
        {courseBarData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <h2 className="text-lg font-semibold text-white mb-4">Course Comparison — Attendance %</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={courseBarData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: '#c4b5fd', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#c4b5fd', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="percentage" radius={[6, 6, 0, 0]}>
                    {courseBarData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-white mb-4">Course Details</h2>
              <div className="space-y-3">
                {analytics?.course_stats.map((course) => (
                  <div key={course.offering_id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-white text-sm font-medium">{course.course_title}</p>
                      <p className="text-purple-200/40 text-xs">{course.course_code} — {course.enrolled_students} students</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${course.attendance_percentage >= 80 ? 'text-emerald-400' : course.attendance_percentage >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                        {course.attendance_percentage}%
                      </p>
                      {course.students_at_risk > 0 && (
                        <p className="text-xs text-red-400">{course.students_at_risk} at risk</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Course Cards */}
        <h2 className="text-xl font-semibold text-white mb-4">Your Courses</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {courses.map((course) => (
            <Card key={course.offering_id}>
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{course.title}</h3>
                  <p className="text-sm text-purple-200/40">{course.course_code}</p>
                  {course.start_date && course.end_date && (
                    <p className="text-sm text-purple-200/50 mt-1">
                      {course.start_date} — {course.end_date}
                    </p>
                  )}
                  <p className="text-sm text-purple-200/60 mt-1">
                    {course.enrolled_students} enrolled student{course.enrolled_students !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => router.push(`/instructor/courses/${course.offering_id}`)}
                    className="flex-1 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/30 rounded-xl text-sm font-medium transition-all duration-200"
                  >
                    Grades & Analytics
                  </button>
                  <button
                    onClick={() => router.push(`/instructor/students/attendance/${course.offering_id}`)}
                    className="flex-1 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 rounded-xl text-sm font-medium transition-all duration-200"
                  >
                    Mark Attendance
                  </button>
                  <button
                    onClick={() => router.push(`/instructor/students/attendance/${course.offering_id}/history`)}
                    className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-purple-200/70 border border-white/10 rounded-xl text-sm font-medium transition-all duration-200"
                  >
                    View History
                  </button>
                </div>
              </div>
            </Card>
          ))}
          {courses.length === 0 && (
            <div className="col-span-2">
              <p className="text-purple-200/40 text-sm">No courses assigned to you yet.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InstructorStudents;
