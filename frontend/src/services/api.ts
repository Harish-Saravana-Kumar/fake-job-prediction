import type {
  ApiStatusResponse,
  PredictRequest,
  PredictResponse,
  ValidationResponse,
  ValidationRulesResponse,
  ExplainResponse,
  MetricsResponse,
} from '../types/api'

/**
 * ═══════════════════════════════════════════════════════════
 * API ENDPOINTS REFERENCE
 * ═══════════════════════════════════════════════════════════
 *
 * GET    /api/status                 - Status check
 *
 * POST   /api/analyze                - BERT inference only
 *
 * POST   /api/explain                - Explainability data
 *
 * POST   /api/predict                - Complete prediction
 *
 * POST   /api/suggest                - Generate suggestions
 *
 * POST   /api/validate               - Validate input
 *
 * ═══════════════════════════════════════════════════════════
 */

const DEFAULT_BASE_URL = 'http://localhost:5000/api'
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? DEFAULT_BASE_URL

export class ApiError extends Error {
  public readonly status: number
  public readonly details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.status = status
    this.details = details
  }
}

const headers = {
  'Content-Type': 'application/json',
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options?.headers ?? {}),
    },
  })

  const data = (await response.json().catch(() => ({}))) as T & { success?: boolean; error?: string }

  if (!response.ok || data?.success === false) {
    const message = data?.error ?? `Request to ${path} failed with status ${response.status}`
    throw new ApiError(message, response.status, data)
  }

  return data as T
}

export function getApiStatus(): Promise<ApiStatusResponse> {
  return request<ApiStatusResponse>('/status')
}

export function getValidationRules(): Promise<ValidationRulesResponse> {
  return request<ValidationRulesResponse>('/rules')
}

export function validateJobPosting(
  payload: {
    title: string
    company: string
    description: string
  },
  options?: RequestInit,
): Promise<ValidationResponse> {
  return request<ValidationResponse>('/validate', {
    method: 'POST',
    body: JSON.stringify(payload),
    ...options,
  })
}

export function predictJobPosting(
  payload: PredictRequest,
  options?: RequestInit,
): Promise<PredictResponse> {
  return request<PredictResponse>('/predict', {
    method: 'POST',
    body: JSON.stringify(payload),
    ...options,
  })
}

export function getExplainability(
  payload: {
    text: string
    isFake: boolean
    indicators: Array<{ category: string; matched_phrases: string[] }>
    fakeProbability?: number
    realProbability?: number
  },
  options?: RequestInit,
): Promise<ExplainResponse> {
  return request<ExplainResponse>('/explain', {
    method: 'POST',
    body: JSON.stringify(payload),
    ...options,
  })
}

export function getMetrics(): Promise<MetricsResponse> {
  return request<MetricsResponse>('/metrics')
}
