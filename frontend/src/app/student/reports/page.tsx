'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import PdfPreviewModal from '@/components/reports/PdfPreviewModal';
import { courseService } from '@/services/courseService';
import { reportsService, reportFilename } from '@/services/reportsService';
import { MyCourseItem } from '@/types/course';
import { ReportType, STUDENT_REPORT_OPTIONS } from '@/types/reports';

type PreviewState = {
  type: ReportType;
  title: string;
  offeringId?: string;
  courseCode?: string;
};

const StudentReportsPage = () => {
  const [courses, setCourses] = useState<MyCourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  useEffect(() => {
    courseService.getMyCourses()
      .then(setCourses)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const openPreview = (type: ReportType, title: string, offeringId?: string, courseCode?: string) => {
    setPreview({ type, title, offeringId, courseCode });
  };

  const fetchPdf = useCallback(() => {
    if (!preview) return Promise.reject(new Error('No report selected'));
    return reportsService.fetchPdf(preview.type, preview.offeringId);
  }, [preview]);

  const summaryOption = STUDENT_REPORT_OPTIONS.find((o) => o.id === 'performance-summary')!;

  return (
    <DashboardLayout allowedRoles={['student']}>
      <div className="animate-fadeIn">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Reports</h1>
          <p className="text-purple-200/60 mt-1">Preview and download academic reports as PDF</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : (
          <div className="space-y-6">
            <Card>
              <h2 className="text-lg font-semibold text-white mb-1">{summaryOption.label}</h2>
              <p className="text-sm text-purple-200/50 mb-4">{summaryOption.description}</p>
              <Button
                onClick={() => openPreview('performance-summary', summaryOption.label)}
              >
                Preview PDF
              </Button>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-white mb-4">Course Reports</h2>
              {courses.length === 0 ? (
                <p className="text-purple-200/40 text-sm">No enrolled courses yet.</p>
              ) : (
                <div className="space-y-4">
                  {courses.map((course) => (
                    <div
                      key={course.offering_id}
                      className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-3 border-b border-white/5 last:border-0"
                    >
                      <div>
                        <p className="text-white font-medium">{course.course.title}</p>
                        <p className="text-xs text-purple-200/40 font-mono">{course.course.course_code}</p>
                        {course.instructor_name && (
                          <p className="text-xs text-purple-200/40 mt-1">{course.instructor_name}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openPreview(
                            'course-performance',
                            `Course Performance — ${course.course.course_code}`,
                            course.offering_id,
                            course.course.course_code,
                          )}
                        >
                          Performance PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPreview(
                            'course-attendance',
                            `Course Attendance — ${course.course.course_code}`,
                            course.offering_id,
                            course.course.course_code,
                          )}
                        >
                          Attendance PDF
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
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

export default StudentReportsPage;
