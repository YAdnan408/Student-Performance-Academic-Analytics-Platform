export interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  course_title: string;
  course_code: string;
}

export interface CourseAttendanceStats {
  course_id: string;
  course_title: string;
  course_code: string;
  offering_id: string;
  total_classes: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;
  percentage: number;
}

export interface StudentAttendanceResponse {
  overall_percentage: number;
  total_classes: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  course_wise: CourseAttendanceStats[];
  monthly_trend: MonthlyTrend[];
  recent_records: AttendanceRecord[];
}

export interface StudentAttendanceDetail {
  course_id: string;
  course_title: string;
  course_code: string;
  enrollment_id: string;
  total_classes: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
  records: {
    id: string;
    date: string;
    status: string;
  }[];
}

export interface CourseAttendanceStudent {
  enrollment_id: string;
  student_id: string;
  student_name: string;
  student_code: string | null;
  total_classes: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
}

export interface CourseAttendanceResponse {
  course_id: string;
  course_title: string;
  course_code: string;
  offering_id: string;
  total_students: number;
  class_average_percentage: number;
  total_classes_recorded: number;
  students: CourseAttendanceStudent[];
}

export interface DateAttendanceStudent {
  enrollment_id: string;
  student_id: string | null;
  student_name: string;
  student_code: string | null;
  status: string | null;
}

export interface DateAttendanceResponse {
  offering_id: string;
  date: string;
  has_existing: boolean;
  students: DateAttendanceStudent[];
}

export interface BulkAttendanceResult {
  total: number;
  marked: number;
  skipped: number;
  errors: { enrollment_id: string; error: string }[];
}

export interface StudentAnalyticsOverview {
  total_courses: number;
  overall_attendance_percentage: number;
  total_classes: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  course_breakdown: {
    course_id: string;
    course_title: string;
    course_code: string;
    attendance_percentage: number;
    total_classes: number;
    present: number;
    absent: number;
    late: number;
  }[];
}

export interface InstructorAnalyticsOverview {
  total_courses: number;
  total_students: number;
  course_stats: {
    offering_id: string;
    course_title: string;
    course_code: string;
    enrolled_students: number;
    attendance_percentage: number;
    total_attendance_records: number;
    students_at_risk: number;
  }[];
}

export interface WeeklyTrend {
  week: string;
  percentage: number;
}

export interface WeeklyTrendResponse {
  offering_id: string;
  weekly_trend: WeeklyTrend[];
}
