'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { courseService } from '@/services/courseService';
import { InstructorCourseItem } from '@/types/course';

const InstructorCoursesPage = () => {
  const [courses, setCourses] = useState<InstructorCourseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await courseService.getInstructorCourses();
      setCourses(data);
    } catch (err) {
      console.error('Failed to load courses', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout allowedRoles={['instructor']}>
      <div className="animate-fadeIn">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">My Courses</h1>
          <p className="text-purple-200/60 mt-1">
            Courses assigned to you — click a course to manage materials, assessments, and grades
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : courses.length === 0 ? (
          <Card>
            <p className="text-purple-200/40 text-center py-8">
              No courses assigned yet. Contact the admin to get courses assigned.
            </p>
          </Card>
        ) : (
          <div className="grid gap-5">
            {courses.map((course) => (
              <Link key={course.id} href={`/instructor/courses/${course.offering_id}`}>
                <Card hover>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{course.title}</h3>
                        <span className="text-xs bg-white/10 text-purple-200/70 px-2 py-0.5 rounded-full font-mono">
                          {course.course_code}
                        </span>
                      </div>
                      <p className="text-sm text-purple-200/60 line-clamp-2 mb-3">{course.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-purple-200/50">
                        <span>Duration: {course.duration || '—'}</span>
                        {course.semester && <span>Semester: {course.semester}</span>}
                        <span>Students Enrolled: {course.enrolled_students}</span>
                      </div>
                    </div>
                    <span className="text-sm text-purple-300">Open →</span>
                  </div>

                  {course.marks_distribution && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-xs text-purple-200/50 mb-2">Marks Distribution</p>
                      <div className="flex flex-wrap gap-3">
                        {Object.entries(course.marks_distribution).map(([key, value]) => (
                          <span key={key} className="text-xs bg-white/5 text-purple-200/60 px-2 py-1 rounded-lg">
                            {key.charAt(0).toUpperCase() + key.slice(1)}: {value}%
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default InstructorCoursesPage;
