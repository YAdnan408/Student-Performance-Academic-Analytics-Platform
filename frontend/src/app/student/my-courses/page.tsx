'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { courseService } from '@/services/courseService';
import { MyCourseItem } from '@/types/course';

const MyCoursesPage = () => {
  const router = useRouter();
  const [courses, setCourses] = useState<MyCourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await courseService.getMyCourses();
      setCourses(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout allowedRoles={['student']}>
      <div className="animate-fadeIn">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">My Courses</h1>
            <p className="text-purple-200/60 mt-1">Your enrolled courses</p>
          </div>
          <Button onClick={() => router.push('/student/courses')}>
            Browse Courses
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <Card>
            <p className="text-red-400 text-center py-8">{error}</p>
            <div className="text-center">
              <Button variant="outline" onClick={loadCourses}>Try Again</Button>
            </div>
          </Card>
        ) : courses.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-200/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No Courses Yet</h3>
              <p className="text-sm text-purple-200/40 mb-6">You haven&apos;t enrolled in any courses yet.</p>
              <Button onClick={() => router.push('/student/courses')}>Browse Available Courses</Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((item) => (
              <Card key={item.enrollment_id} hover>
                <div className="flex flex-col h-full">
                  <div className="mb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{item.course.title}</h3>
                        <p className="text-xs text-purple-200/50 font-mono">{item.course.course_code}</p>
                      </div>
                      <Badge variant="success">Active</Badge>
                    </div>
                    <p className="text-sm text-purple-200/60 line-clamp-2">{item.course.description}</p>
                  </div>

                  <div className="mt-auto space-y-2">
                    {item.instructor_name && (
                      <div className="flex items-center gap-2 text-xs text-purple-200/50">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {item.instructor_name}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-purple-200/50">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {item.course.start_date && item.course.end_date
                        ? `${new Date(item.course.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(item.course.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : item.course.duration || 'TBD'}
                    </div>
                    {item.enrolled_at && (
                      <div className="flex items-center gap-2 text-xs text-purple-200/40">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Enrolled {new Date(item.enrolled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MyCoursesPage;
