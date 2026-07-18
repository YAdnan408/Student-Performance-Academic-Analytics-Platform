'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import PdfPreviewModal from '@/components/reports/PdfPreviewModal';
import { courseService } from '@/services/courseService';
import { reportsService, reportFilename } from '@/services/reportsService';
import { InstructorCourseItem } from '@/types/course';
import { ReportType } from '@/types/reports';

type PreviewState = {
  type: ReportType;
  title: string;
  offeringId: string;
  courseCode: string;
};

const InstructorReportsPage = () => {
  const [courses, setCourses] = useState<InstructorCourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  useEffect(() => {
    courseService.getInstructorCourses()
      .then(setCourses)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fetchPdf = useCallback(() => {
    if (!preview) return Promise.reject(new Error('No report selected'));
    return reportsService.fetchPdf(preview.type, preview.offeringId);
  }, [preview]);

  return (
    <DashboardLayout allowedRoles={['instructor']}>
      <div className="animate-fadeIn">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Reports</h1>
          <p className="text-purple-200/60 mt-1">Preview and download class grade and attendance reports</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : (
          <Card>
            {courses.length === 0 ? (
              <p className="text-purple-200/40 text-sm py-4">No assigned courses yet.</p>
            ) : (
              <div className="space-y-4">
                {courses.map((course) => (
                  <div
                    key={course.offering_id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-3 border-b border-white/5 last:border-0"
                  >
                    <div>
                      <p className="text-white font-medium">{course.title}</p>
                      <p className="text-xs text-purple-200/40 font-mono">{course.course_code}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setPreview({
                          type: 'class-grades',
                          title: `Class Grades — ${course.course_code}`,
                          offeringId: course.offering_id,
                          courseCode: course.course_code,
                        })}
                      >
                        Grade Report PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPreview({
                          type: 'class-attendance',
                          title: `Class Attendance — ${course.course_code}`,
                          offeringId: course.offering_id,
                          courseCode: course.course_code,
                        })}
                      >
                        Attendance Report PDF
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
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

export default InstructorReportsPage;
