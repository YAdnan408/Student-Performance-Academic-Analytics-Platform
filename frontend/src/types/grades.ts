export type AssessmentType = 'quiz' | 'assignment' | 'midterm' | 'final' | 'lab' | 'attendance';
export type MaterialType = 'file' | 'video' | 'link';

export interface Assessment {
  id: string;
  course_offering_id: string;
  title: string;
  type: AssessmentType;
  csv_column?: string;
  total_marks: number;
  weightage: number | null;
  due_date: string | null;
  sequence_number: number;
  form_url: string | null;
  file_url: string | null;
  window_start: string | null;
  window_end: string | null;
  is_published: boolean;
  description: string | null;
  created_at: string | null;
}

export interface GradingPolicy {
  component_type: AssessmentType;
  dist_key: string | null;
  weight: number;
  planned_count: number;
  drop_lowest: number;
  is_singleton: boolean;
}

export interface OfferingHub {
  offering_id: string;
  course_id: string;
  course_code: string;
  title: string;
  description: string;
  marks_distribution: Record<string, number> | null;
  class_schedule: Record<string, string> | null;
  enrolled_students: number;
  active_components: Record<string, number>;
}

export interface GradeStudentRow {
  student_uuid: string;
  student_id: string;
  student_name: string;
  marks_obtained: number | null;
  grade_id: string | null;
}

export interface AssessmentGradesResponse {
  assessment: Assessment;
  students: GradeStudentRow[];
}

export interface ComponentResult {
  weight: number;
  drop_lowest: number;
  assessments: Array<{
    assessment_id: string;
    title: string;
    sequence_number: number;
    exam_max: number;
    marks_obtained: number | null;
    percentage: number | null;
  }>;
  component_percentage: number | null;
  contribution: number | null;
}

export interface ComputedGrade {
  components: Record<string, ComponentResult>;
  total_marks: number;
  scaled_total: number | null;
  graded_weight: number;
  total_weight: number;
  is_complete: boolean;
  letter_grade: string | null;
  grade_points: number | null;
}

export interface GradebookColumn {
  id: string;
  title: string;
  type: AssessmentType;
  csv_column: string;
  total_marks: number;
  sequence_number: number;
}

export interface GradebookStudent extends ComputedGrade {
  student_uuid: string;
  student_id: string;
  student_name: string;
}

export interface GradebookResponse {
  offering_id: string;
  course_code: string;
  title: string;
  marks_distribution: Record<string, number> | null;
  active_components: Record<string, number>;
  policies: Record<string, { planned_count: number; drop_lowest: number }>;
  assessments_by_type: Record<string, Array<{ id: string; title: string; total_marks: number; sequence_number: number; csv_column?: string; type?: string }>>;
  columns: GradebookColumn[];
  component_order: string[];
  csv_columns: string[];
  students: GradebookStudent[];
}

export interface StudentCourseGrade extends ComputedGrade {
  offering_id: string;
  course_id: string;
  course_code: string;
  title: string;
  instructor_name: string | null;
  marks_distribution: Record<string, number> | null;
}

export interface CourseMaterial {
  id: string;
  course_offering_id: string;
  title: string;
  description: string | null;
  material_type: MaterialType;
  file_url: string | null;
  external_url: string | null;
  file_name: string | null;
  sort_order: number;
  created_at: string | null;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string | null;
}

export interface CreateAssessmentPayload {
  title: string;
  type: AssessmentType;
  total_marks: number;
  due_date?: string | null;
  sequence_number?: number | null;
  form_url?: string | null;
  description?: string | null;
  window_start?: string | null;
  window_end?: string | null;
  is_published?: boolean;
}

export interface ImportResult {
  created: number;
  updated: number;
  errors: Array<Record<string, string>>;
}
