'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import AlertBanner from '@/components/ui/AlertBanner';
import FileInput from '@/components/ui/FileInput';
import { bdDatetimeLocalToIso, formatBdDateTime } from '@/lib/datetime';
import { gradesService } from '@/services/gradesService';
import { analyticsService } from '@/services/analyticsService';
import { CourseGradeAnalytics } from '@/types/analytics';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import {
  Assessment,
  AssessmentType,
  CourseMaterial,
  GradebookResponse,
  GradingPolicy,
  OfferingHub,
} from '@/types/grades';

type Tab = 'policies' | 'assessments' | 'grades' | 'materials';
type StatusMessage = { type: 'success' | 'error'; text: string };

const TYPE_LABELS: Record<string, string> = {
  quiz: 'Quiz',
  assignment: 'Assignment',
  midterm: 'Mid',
  final: 'Final',
  lab: 'Lab',
  attendance: 'Attendance',
};

const InstructorCourseHubPage = () => {
  const params = useParams();
  const router = useRouter();
  const offeringId = params.offeringId as string;

  const [tab, setTab] = useState<Tab>('assessments');
  const [hub, setHub] = useState<OfferingHub | null>(null);
  const [policies, setPolicies] = useState<GradingPolicy[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [gradebook, setGradebook] = useState<GradebookResponse | null>(null);
  const [gradeAnalytics, setGradeAnalytics] = useState<CourseGradeAnalytics | null>(null);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<StatusMessage | null>(null);

  const [showCreateAssessment, setShowCreateAssessment] = useState(false);
  const [gradeModalAssessment, setGradeModalAssessment] = useState<Assessment | null>(null);
  const [gradeRows, setGradeRows] = useState<Array<{ student_id: string; student_name: string; marks_obtained: string }>>([]);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [notifyStudents, setNotifyStudents] = useState(true);
  const [editDraft, setEditDraft] = useState<Record<string, Record<string, string>>>({});
  const [savingGradebook, setSavingGradebook] = useState(false);
  const [showCsvRulesModal, setShowCsvRulesModal] = useState(false);

  const [newAssessment, setNewAssessment] = useState({
    title: '',
    type: 'quiz' as AssessmentType,
    total_marks: 20,
    due_date: '',
    form_url: '',
    description: '',
    window_start: '',
    window_end: '',
    is_published: true,
  });
  const [newAssessmentFile, setNewAssessmentFile] = useState<File | null>(null);

  const [newMaterial, setNewMaterial] = useState({
    title: '',
    description: '',
    material_type: 'file',
    external_url: '',
    file: null as File | null,
  });

  const loadHub = useCallback(async () => {
    const data = await gradesService.getHub(offeringId);
    setHub(data);
  }, [offeringId]);

  const loadPolicies = useCallback(async () => {
    const data = await gradesService.getPolicies(offeringId);
    setPolicies(data);
  }, [offeringId]);

  const loadAssessments = useCallback(async () => {
    const data = await gradesService.listAssessments(offeringId);
    setAssessments(data);
  }, [offeringId]);

  const loadGradebook = useCallback(async () => {
    const data = await gradesService.getGradebook(offeringId);
    setGradebook(data);
    const draft: Record<string, Record<string, string>> = {};
    for (const s of data.students) {
      draft[s.student_id] = {};
      for (const col of data.columns || []) {
        let val = '';
        for (const comp of Object.values(s.components || {})) {
          const found = comp.assessments.find((a) => a.assessment_id === col.id);
          if (found) {
            val = found.marks_obtained == null ? '' : String(found.marks_obtained);
            break;
          }
        }
        draft[s.student_id][col.id] = val;
      }
    }
    setEditDraft(draft);
  }, [offeringId]);

  const loadMaterials = useCallback(async () => {
    const data = await gradesService.listMaterials(offeringId);
    setMaterials(data);
  }, [offeringId]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await loadHub();
        await Promise.all([loadPolicies(), loadAssessments(), loadMaterials()]);
      } catch (err) {
        console.error(err);
        setMessage({ type: 'error', text: 'Failed to load course hub' });
      } finally {
        setLoading(false);
      }
    })();
  }, [loadHub, loadPolicies, loadAssessments, loadMaterials]);

  useEffect(() => {
    if (tab === 'grades') {
      loadGradebook().catch(console.error);
      analyticsService.getCourseGradeAnalytics(offeringId).then(setGradeAnalytics).catch(console.error);
    }
  }, [tab, loadGradebook, offeringId]);

  const savePolicies = async () => {
    try {
      await gradesService.savePolicies(
        offeringId,
        policies.map((p) => ({
          component_type: p.component_type,
          planned_count: p.planned_count,
          drop_lowest: p.drop_lowest,
        })),
      );
      setMessage({ type: 'success', text: 'Grading policies saved' });
      await loadPolicies();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: string } } };
      setMessage({ type: 'error', text: ax.response?.data?.detail || 'Failed to save policies' });
    }
  };

  const createAssessment = async () => {
    try {
      const created = await gradesService.createAssessment(offeringId, {
        title: newAssessment.title,
        type: newAssessment.type,
        total_marks: Number(newAssessment.total_marks),
        due_date: newAssessment.due_date || null,
        form_url: newAssessment.form_url || null,
        description: newAssessment.description || null,
        window_start: bdDatetimeLocalToIso(newAssessment.window_start),
        window_end: bdDatetimeLocalToIso(newAssessment.window_end),
        is_published: newAssessment.is_published,
      });
      if (newAssessmentFile) {
        await gradesService.uploadAssessmentFile(created.id, newAssessmentFile);
      }
      setShowCreateAssessment(false);
      setNewAssessmentFile(null);
      setNewAssessment({
        title: '',
        type: 'quiz',
        total_marks: 20,
        due_date: '',
        form_url: '',
        description: '',
        window_start: '',
        window_end: '',
        is_published: true,
      });
      await loadAssessments();
      setMessage({ type: 'success', text: 'Assessment created' });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: string } } };
      setMessage({ type: 'error', text: ax.response?.data?.detail || 'Failed to create assessment' });
    }
  };

  const openGradeEntry = async (assessment: Assessment) => {
    const data = await gradesService.getAssessmentGrades(assessment.id);
    setGradeModalAssessment(assessment);
    setGradeRows(
      data.students.map((s) => ({
        student_id: s.student_id,
        student_name: s.student_name,
        marks_obtained: s.marks_obtained == null ? '' : String(s.marks_obtained),
      })),
    );
  };

  const saveGrades = async () => {
    if (!gradeModalAssessment) return;
    const result = await gradesService.saveAssessmentGrades(
      gradeModalAssessment.id,
      gradeRows.map((r) => ({
        student_id: r.student_id,
        marks_obtained: r.marks_obtained === '' ? null : Number(r.marks_obtained),
      })),
      notifyStudents,
    );
    setMessage({
      type: 'success',
      text: `Saved grades — created ${result.created}, updated ${result.updated}${result.errors.length ? `, errors ${result.errors.length}` : ''}`,
    });
    setGradeModalAssessment(null);
    if (tab === 'grades') await loadGradebook();
  };

  const saveGradebookEdits = async () => {
    if (!gradebook) return;
    setSavingGradebook(true);
    try {
      const rows = gradebook.students.map((s) => ({
        student_id: s.student_id,
        marks: Object.fromEntries(
          (gradebook.columns || []).map((col) => {
            const raw = editDraft[s.student_id]?.[col.id] ?? '';
            return [col.id, raw === '' ? null : Number(raw)];
          }),
        ),
      }));
      const result = await gradesService.saveMultiGrades(offeringId, rows, notifyStudents);
      setMessage({
        type: 'success',
        text: `Gradebook saved — created ${result.created}, updated ${result.updated}${result.errors.length ? `, errors ${result.errors.length}` : ''}`,
      });
      await loadGradebook();
      analyticsService.getCourseGradeAnalytics(offeringId).then(setGradeAnalytics).catch(console.error);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: string } } };
      setMessage({ type: 'error', text: ax.response?.data?.detail || 'Failed to save gradebook' });
    } finally {
      setSavingGradebook(false);
    }
  };

  const clearAllGrades = async () => {
    if (!confirm('Clear ALL grades for this course? This cannot be undone.')) return;
    const result = await gradesService.clearAllGrades(offeringId);
    setMessage({ type: 'success', text: `Cleared ${result.deleted} grade records` });
    await loadGradebook();
  };

  const handleSingleImport = async (assessmentId: string, file: File) => {
    const result = await gradesService.importSingleCsv(assessmentId, file, notifyStudents);
    setMessage({
      type: 'success',
      text: `Imported — created ${result.created}, updated ${result.updated}${result.errors.length ? `, errors ${result.errors.length}` : ''}`,
    });
    if (tab === 'grades') await loadGradebook();
  };

  const handleMultiImport = async (file: File) => {
    const result = await gradesService.importMultiCsv(offeringId, file, notifyStudents);
    setMessage({
      type: 'success',
      text: `Multi-import — created ${result.created}, updated ${result.updated}${result.errors.length ? `, errors ${result.errors.length}` : ''}`,
    });
    await loadGradebook();
  };

  const createMaterial = async () => {
    const form = new FormData();
    form.append('title', newMaterial.title);
    form.append('material_type', newMaterial.material_type);
    if (newMaterial.description) form.append('description', newMaterial.description);
    if (newMaterial.external_url) form.append('external_url', newMaterial.external_url);
    if (newMaterial.file) form.append('file', newMaterial.file);
    await gradesService.createMaterial(offeringId, form);
    setShowMaterialModal(false);
    setNewMaterial({ title: '', description: '', material_type: 'file', external_url: '', file: null });
    await loadMaterials();
    setMessage({ type: 'success', text: 'Material uploaded' });
  };

  const activeTypes = Object.keys(hub?.active_components || {}) as AssessmentType[];

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['instructor']}>
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      </DashboardLayout>
    );
  }

  if (!hub) {
    return (
      <DashboardLayout allowedRoles={['instructor']}>
        <Card><p className="text-red-400 text-center py-8">Course not found or not assigned to you.</p></Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={['instructor']}>
      <div className="animate-fadeIn space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <button onClick={() => router.push('/instructor/courses')} className="text-sm text-purple-300 hover:text-white mb-2">
              ← Back to courses
            </button>
            <h1 className="text-3xl font-bold text-white">{hub.title}</h1>
            <p className="text-purple-200/60 mt-1 font-mono text-sm">{hub.course_code} · {hub.enrolled_students} students</p>
          </div>
        </div>

        {message && (
          <AlertBanner type={message.type} onDismiss={() => setMessage(null)}>
            {message.text}
          </AlertBanner>
        )}

        <div className="flex gap-1 p-1 bg-white/5 rounded-2xl border border-white/10 w-fit flex-wrap">
          {([
            { id: 'policies' as Tab, label: 'Grading Policy' },
            { id: 'assessments' as Tab, label: 'Assessments' },
            { id: 'grades' as Tab, label: 'Grades' },
            { id: 'materials' as Tab, label: 'Materials' },
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

        {tab === 'policies' && (
          <Card>
            <h2 className="text-lg font-semibold text-white mb-2">Grading Policy</h2>
            <p className="text-sm text-purple-200/50 mb-6">
              Weights come from course marks distribution. For quizzes, assignments, and labs set how many you will take and how many lowest scores to drop (n−1, n−2…).
              Mid and final are always single assessments. Attendance is graded separately in the gradebook (manual entry or CSV import).
            </p>
            <div className="space-y-4">
              {policies.map((p, idx) => (
                <div key={p.component_type} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end p-3 bg-white/5 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-white">{TYPE_LABELS[p.component_type] || p.component_type}</p>
                    <p className="text-xs text-purple-200/40">Weight: {p.weight}%</p>
                  </div>
                  <Input
                    label="Planned count"
                    type="number"
                    disabled={p.is_singleton}
                    value={String(p.planned_count)}
                    onChange={(e) => {
                      const next = [...policies];
                      next[idx] = { ...p, planned_count: Math.max(1, parseInt(e.target.value) || 1) };
                      setPolicies(next);
                    }}
                  />
                  <Input
                    label="Drop lowest (n−k)"
                    type="number"
                    disabled={p.is_singleton}
                    value={String(p.drop_lowest)}
                    onChange={(e) => {
                      const next = [...policies];
                      next[idx] = { ...p, drop_lowest: Math.max(0, parseInt(e.target.value) || 0) };
                      setPolicies(next);
                    }}
                  />
                  <p className="text-xs text-purple-200/40 pb-2">
                    {p.is_singleton ? 'Fixed: 1 assessment' : `Best ${Math.max(1, p.planned_count - p.drop_lowest)} of ${p.planned_count}`}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <Button onClick={savePolicies}>Save Policies</Button>
            </div>
          </Card>
        )}

        {tab === 'assessments' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Assessments / Exam Portal</h2>
              <Button onClick={() => setShowCreateAssessment(true)}>Create Assessment</Button>
            </div>
            {assessments.length === 0 ? (
              <Card><p className="text-purple-200/40 text-center py-8">No assessments yet. Create mid, final, quizzes, assignments, labs, or attendance.</p></Card>
            ) : (
              assessments.map((a) => (
                <Card key={a.id}>
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold">{a.title}</h3>
                        <Badge variant="info">{TYPE_LABELS[a.type] || a.type}</Badge>
                        {a.is_published ? <Badge variant="success">Published</Badge> : <Badge variant="warning">Draft</Badge>}
                      </div>
                      <p className="text-xs text-purple-200/50 mb-2">
                        Out of {a.total_marks} · Seq #{a.sequence_number}
                        {a.due_date ? ` · Due ${a.due_date}` : ''}
                      </p>
                      {a.description && <p className="text-sm text-purple-200/60 mb-2">{a.description}</p>}
                      <div className="flex flex-wrap gap-3 text-xs text-purple-200/50">
                        {a.form_url && (
                          <a href={a.form_url} target="_blank" rel="noreferrer" className="text-purple-300 hover:underline">Google Form</a>
                        )}
                        {a.file_url && (
                          <a href={gradesService.fileUrl(a.file_url) || '#'} target="_blank" rel="noreferrer" className="text-purple-300 hover:underline">Question/PDF</a>
                        )}
                        {a.window_start && a.window_end && (
                          <span>Window: {formatBdDateTime(a.window_start)} → {formatBdDateTime(a.window_end)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <label className="px-3 py-2 bg-white/10 rounded-xl text-xs cursor-pointer hover:bg-white/20">
                        Upload Questions
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.ppt,.pptx"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            await gradesService.uploadAssessmentFile(a.id, f);
                            await loadAssessments();
                            setMessage({ type: 'success', text: 'File uploaded' });
                          }}
                        />
                      </label>
                      <Button size="sm" variant="outline" onClick={() => openGradeEntry(a)}>Enter Marks</Button>
                      <Button size="sm" variant="outline" onClick={() => gradesService.downloadSingleTemplate(a.id)}>CSV Template</Button>
                      <label className="px-3 py-2 bg-white/10 rounded-xl text-xs cursor-pointer hover:bg-white/20">
                        Import CSV
                        <input
                          type="file"
                          className="hidden"
                          accept=".csv"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (f) await handleSingleImport(a.id, f);
                          }}
                        />
                      </label>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={async () => {
                          if (!confirm('Delete this assessment and its grades?')) return;
                          await gradesService.deleteAssessment(a.id);
                          await loadAssessments();
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === 'grades' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Gradebook</h2>
              <div className="flex flex-wrap gap-2 items-center">
                <label className="flex items-center gap-2 text-xs text-purple-200/70 mr-2">
                  <input type="checkbox" checked={notifyStudents} onChange={(e) => setNotifyStudents(e.target.checked)} />
                  Notify students on save/import
                </label>
                <Button variant="ghost" onClick={() => setShowCsvRulesModal(true)}>
                  CSV Column Rules
                </Button>
                <Button variant="outline" onClick={() => gradesService.downloadMultiTemplate(offeringId)}>
                  Download CSV
                </Button>
                <label className="px-4 py-2 bg-purple-500/30 rounded-xl text-sm cursor-pointer hover:bg-purple-500/40">
                  Import CSV
                  <input type="file" className="hidden" accept=".csv" onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) await handleMultiImport(f);
                    e.target.value = '';
                  }} />
                </label>
                <Button variant="outline" onClick={saveGradebookEdits} loading={savingGradebook}>
                  Save Edits
                </Button>
                <Button variant="danger" onClick={clearAllGrades}>Clear All Grades</Button>
              </div>
            </div>
            <Card>
              <p className="text-xs text-purple-200/50 mb-4">
                Download the CSV template for exact column names for this course. Column names must match exactly — see{' '}
                <button type="button" onClick={() => setShowCsvRulesModal(true)} className="text-purple-300 hover:text-white underline">
                  CSV Column Rules
                </button>
                . Lab and attendance columns appear only when their weight is greater than 0. Import partial marks anytime.
              </p>
              {!gradebook || gradebook.students.length === 0 ? (
                <p className="text-purple-200/40 text-center py-8">No enrolled students or assessments yet. Create assessments first, then download the CSV template.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-max">
                    <thead>
                      <tr className="text-left text-purple-200/50 border-b border-white/10">
                        <th className="py-2 pr-3 sticky left-0 z-10 bg-white/[0.05] backdrop-blur-sm border-r border-white/5">Student</th>
                        <th className="py-2 pr-3 sticky left-24 z-10 bg-white/[0.05] backdrop-blur-sm border-r border-white/5">ID</th>
                        {(gradebook.columns || []).map((col) => (
                          <th key={col.id} className="py-2 px-2 text-center min-w-[72px]" title={col.title}>
                            <div className="font-mono text-purple-300">{col.csv_column}</div>
                            <div className="text-[10px] text-purple-200/40">/{col.total_marks}</div>
                          </th>
                        ))}
                        {(gradebook.component_order || []).map((type) => (
                          <th key={`comp-${type}`} className="py-2 px-2 text-center text-purple-300 bg-white/5">
                            {TYPE_LABELS[type] || type}
                            <div className="text-[10px] font-normal text-purple-200/40">/{gradebook.active_components?.[type] ?? 0}</div>
                          </th>
                        ))}
                        <th className="py-2 px-2" title="Sum of scaled component marks (out of 100)">Total (/100)</th>
                        <th className="py-2 px-2">Letter</th>
                        <th className="py-2 px-2">GP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gradebook.students.map((s) => (
                        <tr key={s.student_uuid} className="border-b border-white/5">
                          <td className="py-1.5 pr-3 text-white sticky left-0 z-10 bg-white/[0.03] backdrop-blur-sm border-r border-white/5">{s.student_name}</td>
                          <td className="py-1.5 pr-3 text-purple-200/60 font-mono sticky left-24 z-10 bg-white/[0.03] backdrop-blur-sm border-r border-white/5">{s.student_id}</td>
                          {(gradebook.columns || []).map((col) => (
                            <td key={col.id} className="py-1 px-1">
                              <input
                                type="number"
                                className="w-16 px-1.5 py-1 bg-white/5 border border-white/10 rounded text-white text-center"
                                value={editDraft[s.student_id]?.[col.id] ?? ''}
                                onChange={(e) => {
                                  setEditDraft((prev) => ({
                                    ...prev,
                                    [s.student_id]: { ...prev[s.student_id], [col.id]: e.target.value },
                                  }));
                                }}
                              />
                            </td>
                          ))}
                          {(gradebook.component_order || []).map((type) => (
                            <td key={`${s.student_uuid}-${type}`} className="py-1.5 px-2 text-center text-purple-200/80 bg-white/[0.02]">
                              {s.components[type]?.contribution == null ? '—' : s.components[type].contribution}
                            </td>
                          ))}
                          <td className="py-1.5 px-2 text-white font-medium">{s.total_marks}</td>
                          <td className="py-1.5 px-2 text-purple-200">{s.letter_grade || '—'}</td>
                          <td className="py-1.5 px-2 text-purple-200/70">{s.grade_points ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {gradeAnalytics && gradeAnalytics.students_graded > 0 && (
              <div className="space-y-4 pt-6 mt-2 border-t border-white/10">
                <h3 className="text-lg font-semibold text-white">Grade Analytics</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Card>
                    <p className="text-xs text-purple-200/50">Class Average</p>
                    <p className="text-3xl font-bold text-white">{gradeAnalytics.class_average ?? '—'}%</p>
                    <p className="text-xs text-purple-200/40 mt-1">{gradeAnalytics.students_graded}/{gradeAnalytics.total_students} graded</p>
                  </Card>
                  <Card>
                    <p className="text-xs text-purple-200/50 mb-2">Grade Distribution</p>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={gradeAnalytics.distribution}>
                        <XAxis dataKey="range" tick={{ fill: '#c4b5fd', fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Bar dataKey="count" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                  <Card>
                    <p className="text-xs text-purple-200/50 mb-2">At-Risk Students</p>
                    {gradeAnalytics.at_risk_students.length === 0 ? (
                      <p className="text-emerald-400 text-sm">None identified</p>
                    ) : (
                      <ul className="text-xs space-y-1 max-h-[100px] overflow-y-auto">
                        {gradeAnalytics.at_risk_students.slice(0, 5).map((s) => (
                          <li key={s.student_id} className="flex justify-between text-purple-200/70">
                            <span>{s.student_name}</span>
                            <span className="text-red-400">{s.total_marks}%</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {gradeAnalytics.insight && (
                      <p className="text-xs text-amber-300/80 mt-2">{gradeAnalytics.insight}</p>
                    )}
                  </Card>
                </div>
                {gradeAnalytics.assessment_averages.some((a) => a.average_percentage != null) && (
                  <Card>
                    <h3 className="text-sm font-semibold text-white mb-3">Assessment Performance (class avg %)</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={gradeAnalytics.assessment_averages.filter((a) => a.average_percentage != null)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="csv_column" tick={{ fill: '#c4b5fd', fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fill: '#c4b5fd', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                        <Line type="monotone" dataKey="average_percentage" stroke="#34d399" strokeWidth={2} dot={{ fill: '#34d399', r: 3 }} name="Avg %" />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'materials' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Course Materials</h2>
              <Button onClick={() => setShowMaterialModal(true)}>Add Material</Button>
            </div>
            {materials.length === 0 ? (
              <Card><p className="text-purple-200/40 text-center py-8">No materials uploaded yet.</p></Card>
            ) : (
              materials.map((m) => (
                <Card key={m.id}>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-medium">{m.title}</h3>
                        <Badge variant="info">{m.material_type}</Badge>
                      </div>
                      {m.description && <p className="text-sm text-purple-200/60 mb-2">{m.description}</p>}
                      <div className="flex gap-3 text-xs">
                        {m.file_url && (
                          <a href={gradesService.fileUrl(m.file_url) || '#'} target="_blank" rel="noreferrer" className="text-purple-300 hover:underline">
                            {m.file_name || 'Download file'}
                          </a>
                        )}
                        {m.external_url && (
                          <a href={m.external_url} target="_blank" rel="noreferrer" className="text-purple-300 hover:underline">Open link</a>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="danger" onClick={async () => {
                      await gradesService.deleteMaterial(m.id);
                      await loadMaterials();
                    }}>Delete</Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      <Modal isOpen={showCreateAssessment} onClose={() => { setShowCreateAssessment(false); setNewAssessmentFile(null); }} title="Create Assessment">
        <div className="space-y-3">
          <Input label="Title" value={newAssessment.title} onChange={(e) => setNewAssessment({ ...newAssessment, title: e.target.value })} />
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-1.5">Type</label>
            <select
              value={newAssessment.type}
              onChange={(e) => setNewAssessment({ ...newAssessment, type: e.target.value as AssessmentType })}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white"
            >
              {activeTypes.map((t) => (
                <option key={t} value={t} className="bg-slate-900">{TYPE_LABELS[t] || t}</option>
              ))}
            </select>
          </div>
          <Input
            label="Exam max marks (what it was taken out of)"
            type="number"
            value={String(newAssessment.total_marks)}
            onChange={(e) => setNewAssessment({ ...newAssessment, total_marks: parseInt(e.target.value) || 0 })}
          />
          <Input label="Due date" type="date" value={newAssessment.due_date} onChange={(e) => setNewAssessment({ ...newAssessment, due_date: e.target.value })} />
          <Input label="Google Form link" value={newAssessment.form_url} onChange={(e) => setNewAssessment({ ...newAssessment, form_url: e.target.value })} />
          <Input
            label="Exam window start (Bangladesh time)"
            type="datetime-local"
            value={newAssessment.window_start}
            onChange={(e) => setNewAssessment({ ...newAssessment, window_start: e.target.value })}
          />
          <Input
            label="Exam window end (Bangladesh time)"
            type="datetime-local"
            value={newAssessment.window_end}
            onChange={(e) => setNewAssessment({ ...newAssessment, window_end: e.target.value })}
          />
          <FileInput
            label="Question paper (PDF/DOCX)"
            accept=".pdf,.doc,.docx"
            value={newAssessmentFile}
            onChange={setNewAssessmentFile}
            buttonText="Choose file"
            hint="Optional. Students can download this from the assessment portal."
          />
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-1.5">Description</label>
            <textarea
              value={newAssessment.description}
              onChange={(e) => setNewAssessment({ ...newAssessment, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-purple-200">
            <input type="checkbox" checked={newAssessment.is_published} onChange={(e) => setNewAssessment({ ...newAssessment, is_published: e.target.checked })} />
            Publish & notify students
          </label>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowCreateAssessment(false)}>Cancel</Button>
            <Button className="flex-1" onClick={createAssessment} disabled={!newAssessment.title}>Create</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!gradeModalAssessment} onClose={() => setGradeModalAssessment(null)} title={`Enter marks — ${gradeModalAssessment?.title || ''}`}>
        <div className="space-y-3">
          <p className="text-xs text-purple-200/50">Max marks: {gradeModalAssessment?.total_marks}. Leave blank if not graded yet.</p>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {gradeRows.map((row, idx) => (
              <div key={row.student_id} className="grid grid-cols-3 gap-2 items-center">
                <div className="col-span-2">
                  <p className="text-sm text-white">{row.student_name}</p>
                  <p className="text-xs text-purple-200/40 font-mono">{row.student_id}</p>
                </div>
                <Input
                  type="number"
                  value={row.marks_obtained}
                  onChange={(e) => {
                    const next = [...gradeRows];
                    next[idx] = { ...row, marks_obtained: e.target.value };
                    setGradeRows(next);
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setGradeModalAssessment(null)}>Cancel</Button>
            <Button className="flex-1" onClick={saveGrades}>Save Marks</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showMaterialModal} onClose={() => setShowMaterialModal(false)} title="Add Course Material">
        <div className="space-y-3">
          <Input label="Title" value={newMaterial.title} onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })} />
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-1.5">Type</label>
            <select
              value={newMaterial.material_type}
              onChange={(e) => setNewMaterial({ ...newMaterial, material_type: e.target.value })}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white"
            >
              <option value="file" className="bg-slate-900">File (PDF/PPTX/DOCX)</option>
              <option value="video" className="bg-slate-900">Video (file or link)</option>
              <option value="link" className="bg-slate-900">External link</option>
            </select>
          </div>
          <Input label="External / video URL" value={newMaterial.external_url} onChange={(e) => setNewMaterial({ ...newMaterial, external_url: e.target.value })} />
          <FileInput
            label="Upload file"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.webm,.png,.jpg,.jpeg"
            value={newMaterial.file}
            onChange={(file) => setNewMaterial({ ...newMaterial, file })}
            buttonText="Choose file"
          />
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-1.5">Description</label>
            <textarea
              value={newMaterial.description}
              onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowMaterialModal(false)}>Cancel</Button>
            <Button className="flex-1" onClick={createMaterial} disabled={!newMaterial.title}>Upload</Button>
          </div>
          <p className="text-xs text-purple-200/40 pt-1">
            Enrolled students are notified automatically when material is uploaded.
          </p>
        </div>
      </Modal>

      <Modal isOpen={showCsvRulesModal} onClose={() => setShowCsvRulesModal(false)} title="CSV Import — Column Name Rules">
        <div className="space-y-4 text-sm text-purple-200/80">
          <p>
            Column headers in your CSV must match these patterns <strong className="text-white">exactly</strong> (case-sensitive).
            Download the template from this gradebook to get the correct columns for this course.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-white/10 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-white/5 text-purple-200/60">
                  <th className="text-left p-2">Column</th>
                  <th className="text-left p-2">Required</th>
                  <th className="text-left p-2">Pattern / Example</th>
                </tr>
              </thead>
              <tbody className="font-mono text-purple-100">
                <tr className="border-t border-white/10"><td className="p-2">student_id</td><td className="p-2 font-sans text-emerald-300">Yes</td><td className="p-2">2021-12345</td></tr>
                <tr className="border-t border-white/10"><td className="p-2">student_name</td><td className="p-2 font-sans text-purple-300/50">No</td><td className="p-2">John Doe (reference only)</td></tr>
                <tr className="border-t border-white/10"><td className="p-2">quiz_1, quiz_2, …</td><td className="p-2 font-sans">If exists</td><td className="p-2">quiz_{'{n}'} → 16</td></tr>
                <tr className="border-t border-white/10"><td className="p-2">assignment_1, …</td><td className="p-2 font-sans">If exists</td><td className="p-2">assignment_{'{n}'} → 18</td></tr>
                <tr className="border-t border-white/10"><td className="p-2">lab_1, lab_2, …</td><td className="p-2 font-sans">If lab weight &gt; 0</td><td className="p-2">lab_{'{n}'} → 15</td></tr>
                <tr className="border-t border-white/10"><td className="p-2">attendance</td><td className="p-2 font-sans">If attendance weight &gt; 0</td><td className="p-2">attendance → 4 (not attendance_1)</td></tr>
                <tr className="border-t border-white/10"><td className="p-2">midterm</td><td className="p-2 font-sans">If mid exists</td><td className="p-2">midterm → 32 (not midterm_1)</td></tr>
                <tr className="border-t border-white/10"><td className="p-2">final</td><td className="p-2 font-sans">If final exists</td><td className="p-2">final → 45 (not final_1)</td></tr>
              </tbody>
            </table>
          </div>

          <ul className="list-disc pl-5 space-y-1 text-xs text-purple-200/60">
            <li>Row 2 in the downloaded template shows assessment titles — it is skipped on import.</li>
            <li>Leave cells blank for assessments not yet graded. Partial imports are supported.</li>
            <li>Values are raw marks only (e.g. 16 out of 20). Totals are computed automatically by the system.</li>
            <li>Single-assessment import uses: <span className="font-mono text-purple-200">student_id, student_name, marks_obtained</span></li>
          </ul>

          {gradebook?.csv_columns && gradebook.csv_columns.length > 0 && (
            <div className="p-3 bg-white/5 rounded-xl">
              <p className="text-xs text-purple-200/50 mb-1">Columns for this course:</p>
              <p className="font-mono text-xs text-purple-200 break-all">{gradebook.csv_columns.join(', ')}</p>
            </div>
          )}

          <Button className="w-full" onClick={() => setShowCsvRulesModal(false)}>Got it</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default InstructorCourseHubPage;
