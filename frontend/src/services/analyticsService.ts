import api from '@/lib/api';
import {
  CourseGradeAnalytics,
  InstructorDashboardAnalytics,
  InstructorGradeOverview,
  StudentDashboardAnalytics,
  StudentGpaAnalytics,
} from '@/types/analytics';

export const analyticsService = {
  async getStudentDashboard(): Promise<StudentDashboardAnalytics> {
    const { data } = await api.get<StudentDashboardAnalytics>('/analytics/student/dashboard');
    return data;
  },

  async getStudentGpa(): Promise<StudentGpaAnalytics> {
    const { data } = await api.get<StudentGpaAnalytics>('/analytics/student/gpa');
    return data;
  },

  async getInstructorDashboard(): Promise<InstructorDashboardAnalytics> {
    const { data } = await api.get<InstructorDashboardAnalytics>('/analytics/instructor/dashboard');
    return data;
  },

  async getInstructorGradeOverview(): Promise<InstructorGradeOverview> {
    const { data } = await api.get<InstructorGradeOverview>('/analytics/instructor/grades');
    return data;
  },

  async getCourseGradeAnalytics(offeringId: string): Promise<CourseGradeAnalytics> {
    const { data } = await api.get<CourseGradeAnalytics>(`/analytics/instructor/course/${offeringId}/grades`);
    return data;
  },
};
