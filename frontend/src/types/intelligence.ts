export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskExplanation {
  source: string;
  top_factors: Array<{ factor: string; detail: string; weight: number }>;
  model_scores?: Record<string, number>;
}

export interface RiskPrediction {
  id: string;
  student_id: string;
  offering_id: string | null;
  course_code?: string | null;
  course_title?: string | null;
  risk_score: number;
  risk_level: RiskLevel;
  model_version: string;
  features_snapshot?: Record<string, number> | null;
  explanation?: RiskExplanation | null;
  created_at: string | null;
  student_code?: string | null;
  student_name?: string | null;
}

export interface RecommendationItem {
  id?: string;
  type: string;
  title?: string | null;
  message: string;
  priority: 'low' | 'medium' | 'high';
  source: string;
  course_code?: string | null;
  course_offering_id?: string | null;
  is_active?: boolean;
  created_at?: string | null;
}

export interface StudentInsights {
  predictions: RiskPrediction[];
  recommendations: RecommendationItem[];
  summary: {
    total_courses: number;
    high_risk: number;
    medium_risk: number;
    low_risk: number;
  };
  ml_model_ready?: boolean;
  refreshed?: number;
}

export interface InstructorCourseRisk {
  offering_id: string;
  predictions: RiskPrediction[];
  distribution: { low: number; medium: number; high: number };
  ml_model_ready?: boolean;
  refreshed?: number;
}

export interface TrainResult {
  model_version: string;
  trained_samples: number;
  metrics: Record<string, unknown>;
  feature_importances: Record<string, number>;
  models_trained: string[];
}
