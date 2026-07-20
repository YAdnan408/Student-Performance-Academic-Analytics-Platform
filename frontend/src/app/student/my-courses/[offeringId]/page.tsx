'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { formatBdDateTime } from '@/lib/datetime';
import { gradesService } from '@/services/gradesService';
import { Assessment, CourseMaterial, OfferingHub, StudentCourseGrade } from '@/types/grades';
import CourseChat from '@/components/chat/CourseChat';

type Tab = 'materials' | 'assessments' | 'grades' | 'chat';

const TYPE_LABELS: Record<string, string> = {
  quiz: 'Quiz',
  assignment: 'Assignment',
  midterm: 'Mid',
  final: 'Final',
  lab: 'Lab',
  attendance: 'Attendance',
};

const StudentCourseHubPage = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const offeringId = params.offeringId as string;

  const initialTab = (searchParams.get('tab') as Tab | null);
  const [tab, setTab] = useState<Tab>(
    initialTab && ['materials', 'assessments', 'grades', 'chat'].includes(initialTab)
      ? initialTab
      : 'materials',
  );
  const [hub, setHub] = useState<OfferingHub | null>(null);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [grades, setGrades] = useState<StudentCourseGrade | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = searchParams.get('tab') as Tab | null;
    if (t && ['materials', 'assessments', 'grades', 'chat'].includes(t)) {
      setTab(t);
    }
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [h, m, a, g] = await Promise.all([
        gradesService.getHub(offeringId),
        gradesService.listMaterials(offeringId),
        gradesService.listAssessments(offeringId),
        gradesService.getMyOfferingGrades(offeringId),
      ]);
      setHub(h);
      setMaterials(m);
      setAssessments(a);
      setGrades(g);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [offeringId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['student']}>
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      </DashboardLayout>
    );
  }

  if (!hub) {
    return (
      <DashboardLayout allowedRoles={['student']}>
        <Card><p className="text-red-400 text-center py-8">Course not found or you are not enrolled.</p></Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={['student']}>
      <div className="animate-fadeIn space-y-6">
        <div>
          <button onClick={() => router.push('/student/my-courses')} className="text-sm text-purple-300 hover:text-white mb-2">
            ← Back to my courses
          </button>
          <h1 className="text-3xl font-bold text-white">{hub.title}</h1>
          <p className="text-purple-200/60 mt-1 font-mono text-sm">{hub.course_code}</p>
        </div>

        <div className="flex gap-1 p-1 bg-white/5 rounded-2xl border border-white/10 w-fit flex-wrap">
          {([
            { id: 'materials' as Tab, label: 'Materials' },
            { id: 'assessments' as Tab, label: 'Assessments' },
            { id: 'grades' as Tab, label: 'Grades' },
            { id: 'chat' as Tab, label: 'Chat' },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t.id ? 'bg-purple-500/30 text-purple-100' : 'text-purple-200/50 hover:text-purple-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'materials' && (
          <div className="space-y-4">
            {materials.length === 0 ? (
              <Card><p className="text-purple-200/40 text-center py-8">No course materials yet.</p></Card>
            ) : (
              materials.map((m) => (
                <Card key={m.id}>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-medium">{m.title}</h3>
                    <Badge variant="info">{m.material_type}</Badge>
                  </div>
                  {m.description && <p className="text-sm text-purple-200/60 mb-2">{m.description}</p>}
                  <div className="flex gap-3 text-sm">
                    {m.file_url && (
                      <a href={gradesService.fileUrl(m.file_url) || '#'} target="_blank" rel="noreferrer" className="text-purple-300 hover:underline">
                        {m.file_name || 'Download'}
                      </a>
                    )}
                    {m.external_url && (
                      <a href={m.external_url} target="_blank" rel="noreferrer" className="text-purple-300 hover:underline">Open link</a>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === 'assessments' && (
          <div className="space-y-4">
            {assessments.length === 0 ? (
              <Card><p className="text-purple-200/40 text-center py-8">No published assessments yet.</p></Card>
            ) : (
              assessments.map((a) => (
                <Card key={a.id}>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold">{a.title}</h3>
                    <Badge variant="info">{TYPE_LABELS[a.type] || a.type}</Badge>
                  </div>
                  <p className="text-xs text-purple-200/50 mb-2">
                    Out of {a.total_marks}
                    {a.due_date ? ` · Due ${a.due_date}` : ''}
                  </p>
                  {a.description && <p className="text-sm text-purple-200/60 mb-3">{a.description}</p>}
                  {a.window_start && a.window_end && (
                    <p className="text-xs text-purple-200/50 mb-3">
                      Exam window: {formatBdDateTime(a.window_start)} → {formatBdDateTime(a.window_end)}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {a.file_url && (
                      <a href={gradesService.fileUrl(a.file_url) || '#'} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline">Question Paper</Button>
                      </a>
                    )}
                    {a.form_url && (
                      <a href={a.form_url} target="_blank" rel="noreferrer">
                        <Button size="sm">Submit via Google Form</Button>
                      </a>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === 'grades' && grades && (
          <Card>
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">{grades.is_complete ? 'Course Total' : 'Current Total (Provisional)'}</h2>
                <p className="text-xs text-purple-200/50">
                  {grades.is_complete
                    ? 'All components graded'
                    : `${grades.graded_weight} / ${grades.total_weight} weight graded so far`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-white">{grades.total_marks}</p>
                <div className="flex items-center justify-end gap-2 mt-1">
                  {grades.letter_grade && (
                    <Badge variant={grades.is_complete ? 'success' : 'warning'}>{grades.letter_grade}</Badge>
                  )}
                  {grades.is_complete && grades.grade_points != null && (
                    <span className="text-sm text-purple-200/60">{grades.grade_points.toFixed(1)} GP</span>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {Object.entries(grades.components || {}).map(([type, c]) => (
                <div key={type} className="p-4 bg-white/5 rounded-xl">
                  <div className="flex justify-between mb-2">
                    <p className="text-white font-medium">{TYPE_LABELS[type] || type}</p>
                    <p className="text-sm text-purple-200/60">
                      {c.contribution == null ? '—' : c.contribution} / {c.weight}
                      {c.drop_lowest > 0 ? ` · drop lowest ${c.drop_lowest}` : ''}
                    </p>
                  </div>
                  <div className="space-y-1">
                    {c.assessments.map((a) => (
                      <div key={a.assessment_id} className="flex justify-between text-xs text-purple-200/50">
                        <span>{a.title}</span>
                        <span>
                          {a.marks_obtained == null ? 'Not graded' : `${a.marks_obtained}/${a.exam_max} (${a.percentage}%)`}
                        </span>
                      </div>
                    ))}
                    {c.assessments.length === 0 && (
                      <p className="text-xs text-purple-200/30">No assessments created yet</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {tab === 'chat' && <CourseChat offeringId={offeringId} />}
      </div>
    </DashboardLayout>
  );
};

export default StudentCourseHubPage;
