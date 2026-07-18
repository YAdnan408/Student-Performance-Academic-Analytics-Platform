'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
            <p className="text-purple-200/60 mt-1">Your enrolled courses — open one for materials, assessments, and grades</p>
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
              <h3 className="text-lg font-medium text-white mb-2">No Courses Yet</h3>
              <p className="text-sm text-purple-200/40 mb-6">You haven&apos;t enrolled in any courses yet.</p>
              <Button onClick={() => router.push('/student/courses')}>Browse Available Courses</Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((item) => (
              <Link key={item.enrollment_id} href={`/student/my-courses/${item.offering_id}`}>
                <Card hover>
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
                        <div className="text-xs text-purple-200/50">{item.instructor_name}</div>
                      )}
                      <div className="text-xs text-purple-300">Open course →</div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MyCoursesPage;
