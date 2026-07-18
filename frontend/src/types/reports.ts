export type StudentReportType =
  | 'course-performance'
  | 'course-attendance'
  | 'performance-summary';

export type InstructorReportType =
  | 'class-grades'
  | 'class-attendance';

export type ReportType = StudentReportType | InstructorReportType;

export interface ReportOption {
  id: ReportType;
  label: string;
  description: string;
  requiresCourse?: boolean;
}

export const STUDENT_REPORT_OPTIONS: ReportOption[] = [
  {
    id: 'performance-summary',
    label: 'Academic Performance Summary',
    description: 'CGPA, all course grades, overall attendance, and insights',
    requiresCourse: false,
  },
  {
    id: 'course-performance',
    label: 'Course Performance Report',
    description: 'Grades, component breakdown, and attendance for one course',
    requiresCourse: true,
  },
  {
    id: 'course-attendance',
    label: 'Course Attendance Report',
    description: 'Attendance summary and date-wise log for one course',
    requiresCourse: true,
  },
];

export const INSTRUCTOR_REPORT_OPTIONS: ReportOption[] = [
  {
    id: 'class-grades',
    label: 'Class Grade Report',
    description: 'Full gradebook, class average, distribution, and at-risk students',
    requiresCourse: true,
  },
  {
    id: 'class-attendance',
    label: 'Class Attendance Report',
    description: 'Per-student attendance summary for the course',
    requiresCourse: true,
  },
];
