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
  refresh_token: string;
  token_type: string;
  role: UserRole;
  id: string;
  email: string;
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
  designation?: string;
}
