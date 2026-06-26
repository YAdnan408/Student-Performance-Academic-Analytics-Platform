export type UserRole = 'student' | 'instructor' | 'admin';

export interface UserResponse {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
  student_id?: string;
  employee_id?: string;
  department_code?: string;
  degree_level?: string;
  program_id?: string;
  enrolled_semester?: string;
  current_semester?: string;
  designation?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Program {
  id: string;
  name: string;
  department_id: string;
  degree_level: string;
}
