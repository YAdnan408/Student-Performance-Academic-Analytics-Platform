import api from '@/lib/api';
import {
  StudentAttendanceResponse,
  StudentAttendanceDetail,
  CourseAttendanceResponse,
  DateAttendanceResponse,
  BulkAttendanceResult,
  StudentAnalyticsOverview,
  InstructorAnalyticsOverview,
  WeeklyTrendResponse,
} from '@/types/attendance';

export const attendanceService = {
  async getMyAttendance(): Promise<StudentAttendanceResponse> {
    const response = await api.get<StudentAttendanceResponse>('/academic/attendance/my');
    return response.data;
  },

  async getCourseAttendanceForStudent(offeringId: string): Promise<StudentAttendanceDetail> {
    const response = await api.get<StudentAttendanceDetail>(`/academic/attendance/course/${offeringId}/student`);
    return response.data;
  },

  async getCourseAttendanceForDate(offeringId: string, date: string): Promise<DateAttendanceResponse> {
    const response = await api.get<DateAttendanceResponse>(`/academic/attendance/course/${offeringId}/date/${date}`);
    return response.data;
  },

  async getCourseAttendanceForInstructor(offeringId: string): Promise<CourseAttendanceResponse> {
    const response = await api.get<CourseAttendanceResponse>(`/academic/attendance/course/${offeringId}`);
    return response.data;
  },

  async markAttendance(enrollmentId: string, date: string, status: string) {
    const response = await api.post('/academic/attendance/mark', {
      enrollment_id: enrollmentId,
      date,
      status,
    });
    return response.data;
  },

  async bulkMarkAttendance(offeringId: string, date: string, records: { enrollment_id: string; status: string }[]): Promise<BulkAttendanceResult> {
    const response = await api.post<BulkAttendanceResult>('/academic/attendance/bulk', {
      offering_id: offeringId,
      date,
      records: records.map(r => ({ enrollment_id: r.enrollment_id, status: r.status })),
    });
    return response.data;
  },

  async editAttendance(attendanceId: string, status: string) {
    const response = await api.put('/academic/attendance/edit', {
      attendance_id: attendanceId,
      status,
    });
    return response.data;
  },

  async getStudentAnalyticsOverview(): Promise<StudentAnalyticsOverview> {
    const response = await api.get<StudentAnalyticsOverview>('/analytics/student/overview');
    return response.data;
  },

  async getStudentAttendanceHeatmap() {
    const response = await api.get('/analytics/student/attendance-heatmap');
    return response.data;
  },

  async getInstructorAnalyticsOverview(): Promise<InstructorAnalyticsOverview> {
    const response = await api.get<InstructorAnalyticsOverview>('/analytics/instructor/overview');
    return response.data;
  },

  async getCourseWeeklyTrend(offeringId: string): Promise<WeeklyTrendResponse> {
    const response = await api.get<WeeklyTrendResponse>(`/analytics/instructor/course/${offeringId}/weekly-trend`);
    return response.data;
  },
};
