import api from '@/lib/api';
import {
  InstructorCourseRisk,
  StudentInsights,
  TrainResult,
} from '@/types/intelligence';

export const intelligenceService = {
  async getStudentInsights(): Promise<StudentInsights> {
    const { data } = await api.get<StudentInsights>('/intelligence/student/insights');
    return data;
  },

  async refreshStudentInsights(): Promise<StudentInsights> {
    const { data } = await api.post<StudentInsights>('/intelligence/student/refresh');
    return data;
  },

  async getCourseRisk(offeringId: string): Promise<InstructorCourseRisk> {
    const { data } = await api.get<InstructorCourseRisk>(`/intelligence/instructor/courses/${offeringId}/risk`);
    return data;
  },

  async refreshCourseRisk(offeringId: string): Promise<InstructorCourseRisk> {
    const { data } = await api.post<InstructorCourseRisk>(`/intelligence/instructor/courses/${offeringId}/refresh`);
    return data;
  },

  async trainModels(): Promise<TrainResult> {
    const { data } = await api.post<TrainResult>('/intelligence/train');
    return data;
  },
};
