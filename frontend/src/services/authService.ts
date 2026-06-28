import api from '@/lib/api';
import { LoginRequest, RegisterRequest, AuthResponse, UserResponse } from '@/types/auth';

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  async register(data: RegisterRequest): Promise<UserResponse> {
    const response = await api.post<UserResponse>('/auth/register', data);
    return response.data;
  },

  async getMe(): Promise<UserResponse> {
    const response = await api.get<UserResponse>('/auth/me');
    return response.data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
  },
};
