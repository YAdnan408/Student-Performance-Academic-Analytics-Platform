'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { courseService } from '@/services/courseService';
import { InstructorCourseItem } from '@/types/course';

const InstructorAssessmentsPage = () => {
  const [courses, setCourses] = useState<InstructorCourseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setCourses(await courseService.getInstructorCourses());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardLayout allowedRoles={['instructor']}>
      <div className="animate-fadeIn">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Assessments</h1>
          <p className="text-purple-200/60 mt-1">Select a course to manage assessments, the exam portal, and grade imports</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : courses.length === 0 ? (
          <Card><p className="text-purple-200/40 text-center py-8">No assigned courses.</p></Card>
        ) : (
          <div className="grid gap-4">
            {courses.map((c) => (
              <Link key={c.offering_id} href={`/instructor/courses/${c.offering_id}`}>
                <Card hover>
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-white font-semibold">{c.title}</h3>
                      <p className="text-xs text-purple-200/50 font-mono">{c.course_code}</p>
                    </div>
                    <span className="text-purple-300 text-sm">Manage →</span>
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

export default InstructorAssessmentsPage;
