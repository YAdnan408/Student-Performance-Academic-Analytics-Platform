'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import WeeklySchedule from '@/components/schedule/WeeklySchedule';
import { courseService } from '@/services/courseService';
import { InstructorCourseItem } from '@/types/course';

const InstructorSchedulePage = () => {
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
      console.error('Failed to load schedule', err);
    } finally {
      setLoading(false);
    }
  };

  const scheduleEntries = courses
    .filter((course) => course.class_schedule)
    .map((course) => ({
      course_code: course.course_code,
      title: course.title,
      days: (course.class_schedule as Record<string, string>)?.days || '',
      time_slot: (course.class_schedule as Record<string, string>)?.time_slot || '',
    }));

  return (
    <DashboardLayout allowedRoles={['instructor']}>
      <div className="animate-fadeIn">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Class Schedule</h1>
          <p className="text-purple-200/60 mt-1">Your weekly teaching routine</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : scheduleEntries.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-200/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No Schedule Available</h3>
              <p className="text-sm text-purple-200/40">You don&apos;t have any assigned courses with a class schedule yet.</p>
            </div>
          </Card>
        ) : (
          <WeeklySchedule entries={scheduleEntries} />
        )}
      </div>
    </DashboardLayout>
  );
};

export default InstructorSchedulePage;
