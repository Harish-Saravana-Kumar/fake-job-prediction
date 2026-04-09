export type ConfidenceBand = 'High' | 'Medium' | 'Low'

export interface ValidationRules {
  maxDescriptionLength: number
  maxTitleLength: number
  maxCompanyLength: number
  minAnalyzeChars: number
}

export interface ApiStatusResponse {
  success: boolean
  status: 'ready' | 'model_not_loaded'
  modelLoaded: boolean
  modelPath: string
  endpoints: Record<string, string>
  metrics?: {
    totalPredictions: number
    totalValidations: number
    avgPredictionLatencyMs: number
    avgValidationLatencyMs: number
    fakeCount: number
    realCount: number
    avgConfidence: number
    errorCount: number
    uptimeSeconds: number
    health: string
  }
}

export interface ValidationResponse {
  success: boolean
  valid: boolean
  errors: string[]
  warnings: string[]
  textLength: number
}

export interface PredictRequest {
  title: string
  company: string
  text: string
}

export interface IndicatorDetail {
  category: string
  matched_phrases: string[]
  risk_level?: string
  explanation?: string
}

export interface ReviewSignals {
  fakeTerms: string[]
  goodTerms: string[]
}

export interface WhyFlagged {
  summary: string
  reason: string
  indicatorCount: number
  indicatorDetails: IndicatorDetail[]
  reviewSignals: ReviewSignals
}

export interface PredictResponse {
  success: boolean
  prediction: number
  isFake: boolean
  prediction_label: 'Fake Posting' | 'Real Posting'
  fakeProbability: number
  realProbability: number
  confidence: number
  confidenceBand: ConfidenceBand
  reviewNeeded: boolean
  textLength: number
  suggestions: string[]
  indicators: string[]
  whyFlagged: WhyFlagged
}

export interface ValidationRulesResponse {
  success: boolean
  rules: ValidationRules
}

// Explainability types
export interface AttentionWeights {
  tokens: string[]
  attention_weights: number[]
  top_tokens: Array<[string, number]>
  attention_score: number
}

export interface FeatureImportance {
  feature: string
  impact_direction: 'increases_risk' | 'decreases_risk' | 'neutral'
  impact_score: number
  matched_phrases: string[]
}

export interface ExplainResponse {
  success: boolean
  attention_weights: AttentionWeights
  feature_importance: {
    feature_importance: FeatureImportance[]
    base_score: number
    final_score: number
    explanation_text: string
    feature_count: number
  }
  explanation: string
}

// Metrics types
export interface MetricsSnapshot {
  totalPredictions: number
  totalValidations: number
  avgPredictionLatencyMs: number
  avgValidationLatencyMs: number
  fakeCount: number
  realCount: number
  avgConfidence: number
  errorCount: number
  uptimeSeconds: number
  lastUpdated: string
}

export interface HealthStatus {
  status: 'healthy' | 'degraded'
  predictions_per_minute: number
  error_rate: number
  avg_latency_ms: number
  fake_detection_rate: number
  errors_last_10: string[]
}

export interface MetricsResponse {
  success: boolean
  snapshot: MetricsSnapshot
  health: HealthStatus
  timestamp: HealthStatus
}

