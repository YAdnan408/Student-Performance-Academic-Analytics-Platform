'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { courseService } from '@/services/courseService';
import { CourseDetail } from '@/types/course';

const CourseDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.courseId) {
      loadCourse();
    }
  }, [params.courseId]);

  const loadCourse = async () => {
    try {
      setLoading(true);
      const data = await courseService.getCourseDetail(params.courseId as string);
      setCourse(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['student']}>
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !course) {
    return (
      <DashboardLayout allowedRoles={['student']}>
        <Card>
          <p className="text-red-400 text-center py-8">{error || 'Course not found'}</p>
          <div className="text-center">
            <Button variant="outline" onClick={() => router.push('/student/courses')}>Back to Courses</Button>
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  const md = course.marks_distribution;
  const totalPercentage = md
    ? (md.mid || 0) + (md.final || 0) + (md.quiz || 0) + (md.assignments || 0) + (md.lab || 0) + (md.attendance || 0)
    : 0;

  const marksFields = [
    { key: 'mid', label: 'Mid', color: 'from-purple-500 to-purple-600', value: md?.mid },
    { key: 'final', label: 'Final', color: 'from-blue-500 to-blue-600', value: md?.final },
    { key: 'quiz', label: 'Quiz', color: 'from-emerald-500 to-teal-600', value: md?.quiz },
    { key: 'assignments', label: 'Assignments', color: 'from-amber-500 to-orange-600', value: md?.assignments },
    { key: 'lab', label: 'Lab', color: 'from-rose-500 to-pink-600', value: md?.lab },
    { key: 'attendance', label: 'Attendance', color: 'from-cyan-500 to-sky-600', value: md?.attendance },
  ];

  return (
    <DashboardLayout allowedRoles={['student']}>
      <div className="animate-fadeIn max-w-4xl mx-auto">
        <button
          onClick={() => router.push('/student/courses')}
          className="flex items-center gap-2 text-sm text-purple-200/50 hover:text-purple-200 mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Courses
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-white">{course.title}</h1>
                  <p className="text-sm text-purple-200/50 font-mono mt-1">{course.course_code}</p>
                </div>
                <Badge variant="info">{course.credit_hours} Credit Hours</Badge>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-purple-200 mb-2">Course Description</h3>
                <p className="text-sm text-purple-200/70 leading-relaxed">{course.description}</p>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-white mb-4">Course Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-purple-200/50">Course Instructor</p>
                    <p className="text-sm font-medium text-white">
                      {course.instructor?.name || 'Not assigned yet'}
                    </p>
                    {course.instructor?.designation && (
                      <p className="text-xs text-purple-200/40">{course.instructor.designation}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-purple-200/50">Duration</p>
                    <p className="text-sm font-medium text-white">{course.duration || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-purple-200/50">Course Period</p>
                    <p className="text-sm font-medium text-white">
                      {course.start_date && course.end_date
                        ? `${new Date(course.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date(course.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : 'TBD'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-purple-200/50">Department</p>
                    <p className="text-sm font-medium text-white">{course.department || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </Card>

            {md && (
              <Card>
                <h3 className="text-lg font-semibold text-white mb-4">Marks Distribution</h3>
                <div className="space-y-3">
                  {marksFields.map((field) => {
                    if (field.value === undefined || field.value === null) return null;
                    return (
                      <div key={field.key}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-purple-200/80">{field.label}</span>
                          <span className="text-white font-semibold">{field.value}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${field.color} transition-all duration-500`}
                            style={{ width: `${(field.value / totalPercentage) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-end pt-2 text-xs text-purple-200/40">
                    Total: {totalPercentage}%
                  </div>
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <h3 className="text-lg font-semibold text-white mb-4">Enrollment</h3>
              <div className="text-center mb-6">
                <p className="text-3xl font-bold text-white mb-1">৳{course.cost?.toLocaleString() || '—'}</p>
                <p className="text-xs text-purple-200/50">Course Fee</p>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={() => router.push(`/student/courses/${course.id}/enroll`)}
              >
                Enroll Now
              </Button>
              <p className="text-xs text-purple-200/40 text-center mt-3">
                Secure payment via Stripe, Banking, or Mobile Wallet
              </p>
            </Card>

            {course.instructor?.name && (
              <Card>
                <h3 className="text-sm font-semibold text-purple-200 mb-3"> Instructor</h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                    {course.instructor.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{course.instructor.name}</p>
                    <p className="text-xs text-purple-200/50">{course.instructor.designation || 'Instructor'}</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CourseDetailPage;
