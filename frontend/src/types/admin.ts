export interface AdminUser {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string | null;
  profile: {
    name: string;
    student_id?: string;
    employee_id?: string;
  } | null;
}

export interface AdminInstructor {
  id: string;
  user_id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  designation: string | null;
  phone: string | null;
  email: string | null;
  active_courses_count: number;
}

export interface AdminCourse {
  id: string;
  course_code: string;
  title: string;
  description: string;
  cost: number;
  duration: string;
  start_date: string | null;
  end_date: string | null;
  marks_distribution: Record<string, number> | null;
  class_schedule: Record<string, string> | null;
  status: string;
  instructor_name: string | null;
}

export interface CourseCreateData {
  course_code: string;
  title: string;
  description: string;
  cost: number;
  duration: string;
  start_date: string;
  end_date: string;
  marks_distribution: {
    mid: number;
    final: number;
    quiz: number;
    assignments: number;
    lab: number;
    attendance: number;
  };
  class_schedule?: {
    days: string;
    time_slot: string;
  };
}
