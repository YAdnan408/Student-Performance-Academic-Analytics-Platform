export interface MarksDistribution {
  mid: number;
  final: number;
  quiz: number;
  assignments: number;
  lab: number;
  attendance: number;
}

export type EnrollmentStatus = 'open' | 'upcoming' | 'closed';

export interface Course {
  id: string;
  course_code: string;
  title: string;
  description: string;
  cost: number;
  duration: string;
  start_date: string | null;
  end_date: string | null;
  enrollment_opens_at?: string | null;
  enrollment_closes_at?: string | null;
  enrollment_open?: boolean;
  enrollment_status?: EnrollmentStatus;
  marks_distribution: MarksDistribution | null;
  class_schedule: Record<string, string> | null;
  instructor_name: string | null;
}

export interface InstructorInfo {
  name: string | null;
  designation: string | null;
  employee_id: string | null;
}

export interface CourseDetail extends Course {
  instructor: InstructorInfo | null;
  is_enrolled: boolean;
  status: string;
}

export interface EnrollResponse {
  enrollment_id: string;
  payment_id: string;
  transaction_id: string;
  amount: number;
  method: string;
  status: string;
  course_title: string;
}

export interface MyCourseItem {
  enrollment_id: string;
  enrolled_at: string | null;
  offering_id: string;
  course: {
    id: string;
    course_code: string;
    title: string;
    description: string;
    cost: number;
    duration: string;
    start_date: string | null;
    end_date: string | null;
    status: string;
    class_schedule: Record<string, string> | null;
    marks_distribution?: MarksDistribution | null;
  };
  instructor_name: string | null;
}

export interface InstructorCourseItem {
  id: string;
  offering_id: string;
  course_code: string;
  title: string;
  description: string;
  cost: number;
  duration: string;
  start_date: string | null;
  end_date: string | null;
  marks_distribution: MarksDistribution | null;
  class_schedule: Record<string, string> | null;
  semester: string | null;
  enrolled_students: number;
}
