import api from '@/lib/api';
import { AdminUser, AdminInstructor, AdminCourse, CourseCreateData, CourseUpdateData } from '@/types/admin';

export const adminService = {
  async listCourses(): Promise<AdminCourse[]> {
    const response = await api.get<AdminCourse[]>('/admin/courses');
    return response.data;
  },

  async createCourse(data: CourseCreateData): Promise<{ id: string; message: string }> {
    const response = await api.post<{ id: string; message: string }>('/admin/courses', data);
    return response.data;
  },

  async updateCourse(courseId: string, data: CourseUpdateData): Promise<{ id: string; message: string }> {
    const response = await api.put<{ id: string; message: string }>(`/admin/courses/${courseId}`, data);
    return response.data;
  },

  async deleteCourse(courseId: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/admin/courses/${courseId}`);
    return response.data;
  },

  async renewCourse(courseId: string): Promise<{ id: string; title: string; status: string; message: string }> {
    const response = await api.post<{ id: string; title: string; status: string; message: string }>(`/admin/courses/${courseId}/renew`);
    return response.data;
  },

  async listArchivedCourses(): Promise<AdminCourse[]> {
    const response = await api.get<AdminCourse[]>('/admin/courses/archived');
    return response.data;
  },

  async listInstructors(): Promise<AdminInstructor[]> {
    const response = await api.get<AdminInstructor[]>('/admin/instructors');
    return response.data;
  },

  async assignInstructor(courseId: string, instructorId: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/admin/assign-instructor', {
      course_id: courseId,
      instructor_id: instructorId,
    });
    return response.data;
  },

  async listUsers(): Promise<AdminUser[]> {
    const response = await api.get<AdminUser[]>('/admin/users');
    return response.data;
  },

  async deleteUser(userId: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/admin/users/${userId}`);
    return response.data;
  },
};
