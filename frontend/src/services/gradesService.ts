import api from '@/lib/api';
import {
  Assessment,
  AssessmentGradesResponse,
  CreateAssessmentPayload,
  CourseMaterial,
  GradebookResponse,
  GradingPolicy,
  ImportResult,
  OfferingHub,
  StudentCourseGrade,
  AppNotification,
} from '@/types/grades';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export const gradesService = {
  async getHub(offeringId: string): Promise<OfferingHub> {
    const { data } = await api.get<OfferingHub>(`/academic/offerings/${offeringId}/hub`);
    return data;
  },

  async getPolicies(offeringId: string): Promise<GradingPolicy[]> {
    const { data } = await api.get<GradingPolicy[]>(`/academic/offerings/${offeringId}/grading-policies`);
    return data;
  },

  async savePolicies(offeringId: string, policies: Array<{ component_type: string; planned_count: number; drop_lowest: number }>) {
    const { data } = await api.put(`/academic/offerings/${offeringId}/grading-policies`, { policies });
    return data;
  },

  async listAssessments(offeringId: string): Promise<Assessment[]> {
    const { data } = await api.get<Assessment[]>(`/academic/offerings/${offeringId}/assessments`);
    return data;
  },

  async createAssessment(offeringId: string, payload: CreateAssessmentPayload): Promise<Assessment> {
    const { data } = await api.post<Assessment>(`/academic/offerings/${offeringId}/assessments`, payload);
    return data;
  },

  async updateAssessment(assessmentId: string, payload: Partial<CreateAssessmentPayload>): Promise<Assessment> {
    const { data } = await api.put<Assessment>(`/academic/assessments/${assessmentId}`, payload);
    return data;
  },

  async deleteAssessment(assessmentId: string) {
    const { data } = await api.delete(`/academic/assessments/${assessmentId}`);
    return data;
  },

  async uploadAssessmentFile(assessmentId: string, file: File): Promise<Assessment> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<Assessment>(`/academic/assessments/${assessmentId}/file`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async getAssessmentGrades(assessmentId: string): Promise<AssessmentGradesResponse> {
    const { data } = await api.get<AssessmentGradesResponse>(`/academic/assessments/${assessmentId}/grades`);
    return data;
  },

  async saveAssessmentGrades(assessmentId: string, grades: Array<{ student_id: string; marks_obtained: number | null }>, notify = false): Promise<ImportResult> {
    const { data } = await api.put<ImportResult>(`/academic/assessments/${assessmentId}/grades`, { grades }, { params: { notify } });
    return data;
  },

  async saveMultiGrades(offeringId: string, rows: Array<{ student_id: string; marks: Record<string, number | null> }>, notify = false): Promise<ImportResult> {
    const { data } = await api.put<ImportResult>(`/academic/offerings/${offeringId}/grades/multi`, { rows }, { params: { notify } });
    return data;
  },

  async clearAllGrades(offeringId: string): Promise<{ deleted: number }> {
    const { data } = await api.delete<{ deleted: number }>(`/academic/offerings/${offeringId}/grades`);
    return data;
  },

  async importSingleCsv(assessmentId: string, file: File, notify = false): Promise<ImportResult> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<ImportResult>(`/academic/assessments/${assessmentId}/grades/import`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: { notify },
    });
    return data;
  },

  async importMultiCsv(offeringId: string, file: File, notify = false): Promise<ImportResult> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<ImportResult>(`/academic/offerings/${offeringId}/grades/import`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: { notify },
    });
    return data;
  },

  async downloadSingleTemplate(assessmentId: string) {
    const response = await api.get(`/academic/assessments/${assessmentId}/grades/template`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `grades_${assessmentId}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  async downloadMultiTemplate(offeringId: string) {
    const response = await api.get(`/academic/offerings/${offeringId}/grades/template`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `grades_${offeringId}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  async getGradebook(offeringId: string): Promise<GradebookResponse> {
    const { data } = await api.get<GradebookResponse>(`/academic/offerings/${offeringId}/gradebook`);
    return data;
  },

  async getMyGrades(): Promise<StudentCourseGrade[]> {
    const { data } = await api.get<StudentCourseGrade[]>('/academic/grades/my');
    return data;
  },

  async getMyOfferingGrades(offeringId: string): Promise<StudentCourseGrade> {
    const { data } = await api.get<StudentCourseGrade>(`/academic/offerings/${offeringId}/grades/me`);
    return data;
  },

  async listMaterials(offeringId: string): Promise<CourseMaterial[]> {
    const { data } = await api.get<CourseMaterial[]>(`/academic/offerings/${offeringId}/materials`);
    return data;
  },

  async createMaterial(offeringId: string, form: FormData): Promise<CourseMaterial> {
    const { data } = await api.post<CourseMaterial>(`/academic/offerings/${offeringId}/materials`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async deleteMaterial(materialId: string) {
    const { data } = await api.delete(`/academic/materials/${materialId}`);
    return data;
  },

  async listNotifications(unreadOnly = false): Promise<AppNotification[]> {
    const { data } = await api.get<AppNotification[]>('/academic/notifications', {
      params: { unread_only: unreadOnly },
    });
    return data;
  },

  async markNotificationRead(id: string) {
    const { data } = await api.post(`/academic/notifications/${id}/read`);
    return data;
  },

  fileUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${API_BASE}${path}`;
  },
};
