import api from '@/lib/api';
import { StudentProfile, InstructorProfile, StudentProfileUpdate, InstructorProfileUpdate } from '@/types/profile';

export const profileService = {
  async getStudentProfile(): Promise<StudentProfile> {
    const response = await api.get<StudentProfile>('/profile/student');
    return response.data;
  },

  async getInstructorProfile(): Promise<InstructorProfile> {
    const response = await api.get<InstructorProfile>('/profile/instructor');
    return response.data;
  },

  async updateStudentProfile(data: StudentProfileUpdate): Promise<StudentProfile> {
    const response = await api.put<StudentProfile>('/profile/student', data);
    return response.data;
  },

  async updateInstructorProfile(data: InstructorProfileUpdate): Promise<InstructorProfile> {
    const response = await api.put<InstructorProfile>('/profile/instructor', data);
    return response.data;
  },

  async uploadProfilePhoto(file: File): Promise<{ photo_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<{ photo_url: string }>('/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
