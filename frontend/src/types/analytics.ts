export interface StudentGpaAnalytics {
  cgpa: number | null;
  graded_courses: number;
  total_courses: number;
  trend: Array<{
    offering_id: string;
    course_code: string;
    title: string;
    total_marks: number;
    grade_points: number | null;
    letter_grade: string | null;
    is_complete: boolean;
    graded_weight: number;
    total_weight: number;
  }>;
  best_course: { course_code: string; title: string; grade_points: number; letter_grade: string } | null;
  weakest_course: { course_code: string; title: string; grade_points: number; letter_grade: string } | null;
  insights: string[];
}

export interface StudentDashboardAnalytics {
  attendance: import('@/types/attendance').StudentAnalyticsOverview;
  gpa: StudentGpaAnalytics;
  heatmap: { heatmap: Record<string, string>; total_records: number };
}

export interface InstructorGradeCourseStat {
  offering_id: string;
  course_code: string;
  course_title: string;
  enrolled_students: number;
  class_average: number | null;
  students_graded: number;
  students_at_risk: number;
  below_60_percent: number;
}

export interface InstructorGradeOverview {
  total_courses: number;
  course_stats: InstructorGradeCourseStat[];
}

export interface InstructorDashboardAnalytics {
  attendance: import('@/types/attendance').InstructorAnalyticsOverview;
  grades: InstructorGradeOverview;
}

export interface CourseGradeAnalytics {
  offering_id: string;
  course_code: string;
  course_title: string;
  class_average: number | null;
  students_graded: number;
  total_students: number;
  distribution: Array<{ range: string; count: number }>;
  top_students: Array<{ student_id: string; student_name: string; total_marks: number; letter_grade: string | null }>;
  bottom_students: Array<{ student_id: string; student_name: string; total_marks: number; letter_grade: string | null }>;
  at_risk_students: Array<{ student_id: string; student_name: string; total_marks: number; letter_grade: string | null; grade_points: number | null }>;
  assessment_averages: Array<{
    assessment_id: string;
    csv_column: string;
    title: string;
    type: string;
    average_marks: number | null;
    average_percentage: number | null;
    graded_count: number;
  }>;
  insight: string | null;
}
