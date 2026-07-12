import api from '@/lib/api';
import { Course, CourseDetail, EnrollResponse, MyCourseItem, InstructorCourseItem } from '@/types/course';

export const courseService = {
  async listCourses(): Promise<Course[]> {
    const response = await api.get<Course[]>('/academic/courses');
    return response.data;
  },

  async getCourseDetail(courseId: string): Promise<CourseDetail> {
    const response = await api.get<CourseDetail>(`/academic/courses/${courseId}`);
    return response.data;
  },

  async enroll(courseId: string, paymentMethod: string): Promise<EnrollResponse> {
    const response = await api.post<EnrollResponse>('/academic/enroll', {
      course_id: courseId,
      payment_method: paymentMethod,
    });
    return response.data;
  },

  async checkScheduleClash(courseId: string): Promise<{ has_clash: boolean; conflicting_course?: string; conflicting_course_code?: string; days?: string; time_slot?: string }> {
    const response = await api.post<{ has_clash: boolean; conflicting_course?: string; conflicting_course_code?: string; days?: string; time_slot?: string }>('/academic/check-clash', { course_id: courseId });
    return response.data;
  },

  async getMyCourses(): Promise<MyCourseItem[]> {
    const response = await api.get<MyCourseItem[]>('/academic/my-courses');
    return response.data;
  },

  async getInstructorCourses(): Promise<InstructorCourseItem[]> {
    const response = await api.get<InstructorCourseItem[]>('/academic/instructor/my-courses');
    return response.data;
  },
};
