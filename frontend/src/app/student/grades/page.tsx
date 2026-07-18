'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { gradesService } from '@/services/gradesService';
import { StudentCourseGrade } from '@/types/grades';

const TYPE_LABELS: Record<string, string> = {
  quiz: 'Quiz',
  assignment: 'Assignment',
  midterm: 'Mid',
  final: 'Final',
  lab: 'Lab',
  attendance: 'Attendance',
};

const StudentGradesPage = () => {
  const [grades, setGrades] = useState<StudentCourseGrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setGrades(await gradesService.getMyGrades());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardLayout allowedRoles={['student']}>
      <div className="animate-fadeIn">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">My Grades</h1>
          <p className="text-purple-200/60 mt-1">Course totals and letter grades across your enrollments</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : grades.length === 0 ? (
          <Card><p className="text-purple-200/40 text-center py-8">No grades yet. Enroll in courses to see results here.</p></Card>
        ) : (
          <div className="grid gap-5">
            {grades.map((g) => (
              <Link key={g.offering_id} href={`/student/my-courses/${g.offering_id}`}>
                <Card hover>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-white">{g.title}</h3>
                        <span className="text-xs font-mono text-purple-200/50">{g.course_code}</span>
                      </div>
                      {g.instructor_name && <p className="text-xs text-purple-200/40">{g.instructor_name}</p>}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {Object.entries(g.components || {}).map(([type, c]) => (
                          <span key={type} className="text-xs bg-white/5 text-purple-200/60 px-2 py-1 rounded-lg">
                            {TYPE_LABELS[type] || type}: {c.contribution == null ? '—' : `${c.contribution}/${c.weight}`}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-white">{g.total_marks}</p>
                      <p className="text-xs text-purple-200/40 mt-1">
                        {g.is_complete ? 'Final' : `Provisional · ${g.graded_weight}/${g.total_weight} graded`}
                      </p>
                      <div className="flex items-center justify-end gap-2 mt-1">
                        {g.letter_grade ? <Badge variant={g.is_complete ? 'success' : 'warning'}>{g.letter_grade}</Badge> : <span className="text-xs text-purple-200/40">No grade</span>}
                        {g.is_complete && g.grade_points != null && <span className="text-sm text-purple-200/60">{g.grade_points.toFixed(1)} GP</span>}
                      </div>
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

export default StudentGradesPage;
