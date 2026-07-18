import api from '@/lib/api';
import { InstructorReportType, ReportType, StudentReportType } from '@/types/reports';

const STUDENT_PATHS: Record<StudentReportType, (offeringId?: string) => string> = {
  'course-performance': (id) => `/reports/student/courses/${id}/performance`,
  'course-attendance': (id) => `/reports/student/courses/${id}/attendance`,
  'performance-summary': () => '/reports/student/performance-summary',
};

const INSTRUCTOR_PATHS: Record<InstructorReportType, (offeringId: string) => string> = {
  'class-grades': (id) => `/reports/instructor/courses/${id}/grades`,
  'class-attendance': (id) => `/reports/instructor/courses/${id}/attendance`,
};

function resolvePath(type: ReportType, offeringId?: string): string {
  if (type === 'performance-summary') {
    return STUDENT_PATHS['performance-summary']();
  }
  if (type === 'course-performance' || type === 'course-attendance') {
    if (!offeringId) throw new Error('Course is required for this report');
    return STUDENT_PATHS[type](offeringId);
  }
  if (!offeringId) throw new Error('Course is required for this report');
  return INSTRUCTOR_PATHS[type](offeringId);
}

export function reportFilename(type: ReportType, offeringId?: string, courseCode?: string): string {
  const slug = courseCode?.replace(/\s+/g, '-') || offeringId || 'report';
  switch (type) {
    case 'performance-summary':
      return 'academic-performance-summary.pdf';
    case 'course-performance':
      return `${slug}-performance.pdf`;
    case 'course-attendance':
      return `${slug}-attendance.pdf`;
    case 'class-grades':
      return `${slug}-class-grades.pdf`;
    case 'class-attendance':
      return `${slug}-class-attendance.pdf`;
    default:
      return 'report.pdf';
  }
}

export const reportsService = {
  async fetchPdf(type: ReportType, offeringId?: string): Promise<Blob> {
    const path = resolvePath(type, offeringId);
    const { data } = await api.get<Blob>(path, { responseType: 'blob' });
    if (data.type?.includes('application/json')) {
      const text = await data.text();
      try {
        const json = JSON.parse(text) as { detail?: string | Array<{ msg?: string }> };
        const detail = json.detail;
        const message = typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map((d) => d.msg).filter(Boolean).join(', ')
            : 'Failed to generate report';
        throw new Error(message);
      } catch (err) {
        if (err instanceof Error && err.message !== 'Failed to generate report') throw err;
        throw new Error('Failed to generate report');
      }
    }
    return data;
  },
};
