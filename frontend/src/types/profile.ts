export interface StudentProfile {
  id: string;
  user_id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  address: string | null;
  profile_photo: string | null;
  email: string;
  created_at: string;
  updated_at: string | null;
}

export interface InstructorProfile {
  id: string;
  user_id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  designation: string | null;
  phone: string | null;
  address: string | null;
  profile_photo: string | null;
  email: string;
  created_at: string;
  updated_at: string | null;
}

export interface StudentProfileUpdate {
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  student_id?: string;
}

export interface InstructorProfileUpdate {
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  employee_id?: string;
  designation?: string;
}
