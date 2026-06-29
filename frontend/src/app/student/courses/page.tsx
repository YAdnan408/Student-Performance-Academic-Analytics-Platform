'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { courseService } from '@/services/courseService';
import { Course } from '@/types/course';

const CourseListingPage = () => {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await courseService.listCourses();
      setCourses(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const filtered = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.course_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout allowedRoles={['student']}>
      <div className="animate-fadeIn">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Course Enrollment</h1>
          <p className="text-purple-200/60 mt-1">Browse and enroll in available courses</p>
        </div>

        <div className="relative mb-8 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-purple-200/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses by name or code..."
            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-purple-200/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
          />
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
        ) : filtered.length === 0 ? (
          <Card>
            <p className="text-purple-200/40 text-center py-8">
              {search ? 'No courses match your search.' : 'No courses available yet.'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((course) => (
              <Card key={course.id} hover>
                <div className="flex flex-col h-full">
                  <div className="mb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{course.title}</h3>
                        <p className="text-xs text-purple-200/50 font-mono">{course.course_code}</p>
                      </div>
                    </div>
                    <p className="text-sm text-purple-200/60 line-clamp-2">{course.description}</p>
                  </div>

                  <div className="mt-auto space-y-2">
                    {course.instructor_name && (
                      <div className="flex items-center gap-2 text-xs text-purple-200/50">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {course.instructor_name}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-purple-200/50">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {course.duration || 'TBD'}
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-lg font-bold text-white">
                        ৳{course.cost?.toLocaleString() || '—'}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => router.push(`/student/courses/${course.id}`)}
                      >
                        View Details
                      </Button>
                    </div>
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

export default CourseListingPage;
