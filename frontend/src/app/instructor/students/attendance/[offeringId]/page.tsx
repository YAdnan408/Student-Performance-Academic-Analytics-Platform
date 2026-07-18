'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import AlertBanner from '@/components/ui/AlertBanner';
import Spinner from '@/components/ui/Spinner';
import { courseService } from '@/services/courseService';
import { attendanceService } from '@/services/attendanceService';
import { DateAttendanceResponse } from '@/types/attendance';
import { InstructorCourseItem } from '@/types/course';

const MarkAttendance = () => {
  const params = useParams();
  const offeringId = params.offeringId as string;

  const [course, setCourse] = useState<InstructorCourseItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateData, setDateData] = useState<DateAttendanceResponse | null>(null);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const courses = await courseService.getInstructorCourses();
        const found = courses.find((c) => c.offering_id === offeringId);
        setCourse(found || null);
      } catch {
        setMessage({ type: 'error', text: 'Failed to load course data' });
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [offeringId]);

  const fetchDateRecords = useCallback(async () => {
    try {
      const result = await attendanceService.getCourseAttendanceForDate(offeringId, date);
      setDateData(result);
      const initial: Record<string, string> = {};
      result.students.forEach((s) => {
        initial[s.enrollment_id] = s.status || 'present';
      });
      setStatuses(initial);
    } catch {
      setDateData(null);
    }
  }, [offeringId, date]);

  useEffect(() => {
    if (!loading) {
      fetchDateRecords();
    }
  }, [fetchDateRecords, loading]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDate(e.target.value);
    setMessage(null);
  };

  const handleMarkAll = (status: string) => {
    if (!dateData) return;
    const newStatuses: Record<string, string> = {};
    dateData.students.forEach((s) => {
      newStatuses[s.enrollment_id] = status;
    });
    setStatuses(newStatuses);
  };

  const handleSave = async () => {
    if (!dateData) return;
    setSaving(true);
    setMessage(null);
    try {
      const records = Object.entries(statuses).map(([enrollment_id, status]) => ({
        enrollment_id,
        status,
      }));
      const result = await attendanceService.bulkMarkAttendance(offeringId, date, records);
      setMessage({
        type: 'success',
        text: `Attendance saved: ${result.marked} updated, ${result.errors.length} errors`,
      });
      await fetchDateRecords();
    } catch {
      setMessage({ type: 'error', text: 'Failed to save attendance' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['instructor']}>
        <Spinner />
      </DashboardLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300';
      case 'absent': return 'bg-red-500/20 border-red-500/30 text-red-300';
      case 'late': return 'bg-amber-500/20 border-amber-500/30 text-amber-300';
      default: return 'bg-slate-700/50 border-white/10 text-purple-200/60';
    }
  };

  return (
    <DashboardLayout allowedRoles={['instructor']}>
      <div className="animate-fadeIn">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Mark Attendance — {course?.title || 'Course'}
          </h1>
          <p className="text-purple-200/60 mt-1">{course?.course_code}</p>
          {course?.class_schedule && (
            <div className="flex items-center gap-4 mt-2 text-sm text-purple-200/50">
              {course.class_schedule.days && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {course.class_schedule.days}
                </span>
              )}
              {course.class_schedule.time_slot && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {course.class_schedule.time_slot}
                </span>
              )}
            </div>
          )}
        </div>

        {message && (
          <AlertBanner type={message.type} className="mb-6">
            {message.text}
          </AlertBanner>
        )}

        {dateData && (
          <>
            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center">
              <div>
                <label className="block text-sm text-purple-200/60 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={handleDateChange}
                  className="px-4 py-2 bg-slate-800/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  <span className="text-sm text-purple-200/60 self-end mb-1">Quick fill:</span>
                  <button
                    onClick={() => handleMarkAll('present')}
                    className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-medium transition-all"
                  >
                    All Present
                  </button>
                  <button
                    onClick={() => handleMarkAll('absent')}
                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-xl text-xs font-medium transition-all"
                  >
                    All Absent
                  </button>
                  <button
                    onClick={() => handleMarkAll('late')}
                    className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-medium transition-all"
                  >
                    All Late
                  </button>
                </div>
              </div>
            </div>

            {/* Mode Indicator */}
            <div className="mb-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                dateData.has_existing
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dateData.has_existing ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                {dateData.has_existing ? 'Editing existing records' : 'Marking new attendance'}
              </span>
            </div>

            {/* Student Roster */}
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-2 text-purple-200/60 font-medium">#</th>
                      <th className="text-left py-3 px-2 text-purple-200/60 font-medium">Student Name</th>
                      <th className="text-left py-3 px-2 text-purple-200/60 font-medium">Student ID</th>
                      <th className="text-left py-3 px-2 text-purple-200/60 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dateData.students.map((student, index) => (
                      <tr key={student.enrollment_id} className="border-b border-white/5 last:border-0">
                        <td className="py-3 px-2 text-purple-200/40">{index + 1}</td>
                        <td className="py-3 px-2 text-white font-medium">{student.student_name}</td>
                        <td className="py-3 px-2 text-purple-200/60">{student.student_code || '—'}</td>
                        <td className="py-3 px-2">
                          <select
                            value={statuses[student.enrollment_id] || 'present'}
                            onChange={(e) =>
                              setStatuses((prev) => ({
                                ...prev,
                                [student.enrollment_id]: e.target.value,
                              }))
                            }
                            className={`px-3 py-1.5 rounded-xl border text-sm font-medium focus:outline-none ${getStatusColor(statuses[student.enrollment_id] || 'present')}`}
                          >
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="late">Late</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                    {dateData.students.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-purple-200/40">
                          No students enrolled in this course.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Save/Update Button */}
            {dateData.students.length > 0 && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white font-medium rounded-xl transition-all duration-200 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : dateData.has_existing ? 'Update Attendance' : 'Save Attendance'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MarkAttendance;
