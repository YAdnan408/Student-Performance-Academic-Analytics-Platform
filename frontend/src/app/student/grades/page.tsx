'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import PdfPreviewModal from '@/components/reports/PdfPreviewModal';
import { gradesService } from '@/services/gradesService';
import { analyticsService } from '@/services/analyticsService';
import { reportsService, reportFilename } from '@/services/reportsService';
import { StudentGpaAnalytics } from '@/types/analytics';
import { StudentCourseGrade } from '@/types/grades';
import { ReportType } from '@/types/reports';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

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
  const [gpaAnalytics, setGpaAnalytics] = useState<StudentGpaAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<{
    type: ReportType;
    title: string;
    offeringId?: string;
    courseCode?: string;
  } | null>(null);

  const fetchPdf = useCallback(() => {
    if (!preview) return Promise.reject(new Error('No report selected'));
    return reportsService.fetchPdf(preview.type, preview.offeringId);
  }, [preview]);

  useEffect(() => {
    (async () => {
      try {
        const [gradesData, gpaData] = await Promise.all([
          gradesService.getMyGrades(),
          analyticsService.getStudentGpa(),
        ]);
        setGrades(gradesData);
        setGpaAnalytics(gpaData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const trendData = (gpaAnalytics?.trend || [])
    .filter((c) => (c.graded_weight || 0) > 0 && c.grade_points != null)
    .map((c) => ({
      name: c.course_code,
      gp: c.grade_points,
    }));

  return (
    <DashboardLayout allowedRoles={['student']}>
      <div className="animate-fadeIn">
        <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">My Grades</h1>
            <p className="text-purple-200/60 mt-1">Course totals, CGPA, and performance analytics</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPreview({ type: 'performance-summary', title: 'Academic Performance Summary' })}
          >
            Preview Summary PDF
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : (
          <>
            {gpaAnalytics && (gpaAnalytics.cgpa != null || gpaAnalytics.graded_courses > 0) && (
              <div className="space-y-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <p className="text-xs text-purple-200/50">CGPA</p>
                    <p className="text-3xl font-bold text-emerald-400">
                      {gpaAnalytics.cgpa != null ? gpaAnalytics.cgpa.toFixed(2) : '—'}
                    </p>
                    <p className="text-xs text-purple-200/40 mt-1">{gpaAnalytics.graded_courses} graded course(s)</p>
                  </Card>
                  {gpaAnalytics.best_course && (
                    <Card>
                      <p className="text-xs text-emerald-300/70 mb-1">Best performing</p>
                      <p className="text-white font-medium">{gpaAnalytics.best_course.title}</p>
                      <p className="text-sm text-purple-200/50">{gpaAnalytics.best_course.course_code}</p>
                      <Badge variant="success" className="mt-2">
                        {gpaAnalytics.best_course.letter_grade} · {gpaAnalytics.best_course.grade_points.toFixed(1)} GP
                      </Badge>
                    </Card>
                  )}
                  {gpaAnalytics.weakest_course &&
                    gpaAnalytics.best_course?.course_code !== gpaAnalytics.weakest_course.course_code && (
                    <Card>
                      <p className="text-xs text-amber-300/70 mb-1">Needs attention</p>
                      <p className="text-white font-medium">{gpaAnalytics.weakest_course.title}</p>
                      <p className="text-sm text-purple-200/50">{gpaAnalytics.weakest_course.course_code}</p>
                      <Badge variant="warning" className="mt-2">
                        {gpaAnalytics.weakest_course.letter_grade} · {gpaAnalytics.weakest_course.grade_points.toFixed(1)} GP
                      </Badge>
                    </Card>
                  )}
                </div>

                {gpaAnalytics.insights.length > 0 && (
                  <Card className="border-emerald-500/20 bg-emerald-500/5">
                    <h2 className="text-lg font-semibold text-white mb-3">Academic Insights</h2>
                    <ul className="space-y-2">
                      {gpaAnalytics.insights.map((msg, i) => (
                        <li key={i} className="text-sm text-emerald-100/90 flex gap-2">
                          <span className="text-emerald-400">•</span>
                          {msg}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {trendData.length > 0 && (
                  <Card>
                    <h2 className="text-lg font-semibold text-white mb-4">GPA Trend (Grade Points)</h2>
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" tick={{ fill: '#c4b5fd', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 4]} tick={{ fill: '#c4b5fd', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                          labelStyle={{ color: '#fff' }}
                        />
                        <Line type="monotone" dataKey="gp" stroke="#34d399" strokeWidth={2} dot={{ fill: '#34d399' }} name="Grade Points" />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                )}
              </div>
            )}

            {grades.length === 0 ? (
              <Card><p className="text-purple-200/40 text-center py-8">No grades yet. Enroll in courses to see results here.</p></Card>
            ) : (
              <div className="grid gap-5">
                <h2 className="text-lg font-semibold text-white">Course Grades</h2>
                {grades.map((g) => (
                  <Card key={g.offering_id}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <Link href={`/student/my-courses/${g.offering_id}`} className="flex-1">
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
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPreview({
                          type: 'course-performance',
                          title: `Course Performance — ${g.course_code}`,
                          offeringId: g.offering_id,
                          courseCode: g.course_code,
                        })}
                      >
                        PDF
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <PdfPreviewModal
        isOpen={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.title || 'Report Preview'}
        filename={preview ? reportFilename(preview.type, preview.offeringId, preview.courseCode) : 'report.pdf'}
        fetchPdf={fetchPdf}
      />
    </DashboardLayout>
  );
};

export default StudentGradesPage;
