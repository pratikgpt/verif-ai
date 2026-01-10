import axios, { AxiosError } from 'axios'

/**
 * API Configuration - PRODUCTION
 *
 * Backend deployed on Render: https://verifai-lrw5.onrender.com
 * NOTE: Render free tier has "cold starts" (30-60s delay).
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://verifai-lrw5.onrender.com'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 second timeout for Render cold starts
  headers: {
    'Content-Type': 'application/json',
  },
})

// --- Interfaces ---

export interface InitiateSessionResponse {
  allowed: boolean
  reason?: string
  session_id?: string
  distance?: number
  verification_code?: string
}

/**
 * Inspection interface - matches backend database schema
 * Field names match what Dev A's backend sends from Supabase
 */
export interface Inspection {
  case_id: string
  created_at: string
  status: string  // 'pending' | 'processing' | 'completed'
  gps_lat: number
  gps_long: number
  video_url?: string
  report_url?: string
  verification_code?: string
  exporter_name?: string
  ai_result?: {
    verification_status?: string  // 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW'
    liveness_check?: {
      code_spoken_correctly?: boolean
      detected_code_transcript?: string
      voice_liveness_confidence?: string  // 'HIGH' | 'LOW' - backend field name
      voice_confidence?: number  // Alternative field for compatibility
    }
    risk_assessment?: {
      overall_confidence_score?: number  // Backend uses this field name
      confidence_score?: number  // Alternative field for compatibility
      fraud_flags_detected?: string[]  // Backend uses this field name
      fraud_flags?: string[]  // Alternative field for compatibility
    }
    stock_assessment?: {
      is_warehouse_environment?: boolean  // Backend uses this field name
      warehouse_environment?: boolean  // Alternative field for compatibility
      inventory_visible?: boolean
      inventory_description?: string
      commercial_volume_detected?: boolean  // Backend uses this field name
      commercial_volume?: string  // Alternative field for compatibility
    }
    auditor_reasoning?: string
  }
}

/**
 * Force Verify Response
 */
export interface ForceVerifyResponse {
  status: string
  message: string
  report_url?: string
}

/**
 * Custom error class for API errors
 */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isNetworkError: boolean = false,
    public isColdStart: boolean = false
  ) {
    super(message)
    this.name = 'APIError'
  }
}

// --- Helper Functions ---

/**
 * Extract error message from various response formats
 */
function extractErrorMessage(data: unknown): string {
  if (typeof data === 'string') return data
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>

    if (Array.isArray(obj.detail)) {
      const firstError = obj.detail[0] as { msg?: string } | undefined
      if (firstError?.msg) return firstError.msg
      return 'Validation error'
    }

    if (typeof obj.detail === 'string') return obj.detail
    if (typeof obj.message === 'string') return obj.message
    if (typeof obj.error === 'string') return obj.error
  }
  return 'Something went wrong'
}

/**
 * Handle API errors with user-friendly messages
 */
function handleAPIError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError

    if (!axiosError.response) {
      if (axiosError.code === 'ECONNABORTED') {
        throw new APIError(
          'Server is waking up. Please wait a moment and try again.',
          undefined,
          false,
          true
        )
      }
      throw new APIError(
        'Unable to connect to server. Please check your internet connection.',
        undefined,
        true
      )
    }

    const status = axiosError.response.status
    const data = axiosError.response.data

    if (status === 503 || status === 502) {
      throw new APIError(
        'Server is starting up. Please wait 30 seconds and try again.',
        status,
        false,
        true
      )
    }

    throw new APIError(extractErrorMessage(data), status)
  }

  if (error instanceof Error) {
    throw new APIError(error.message)
  }

  throw new APIError('An unexpected error occurred')
}

// --- API Methods ---

/**
 * Initiate Session (User Side)
 * Sends GPS coordinates to backend for validation.
 *
 * Endpoint: POST /initiate-session
 */
export async function initiateSession(
  sessionId: string,
  latitude: number,
  longitude: number,
  accuracy: number
): Promise<InitiateSessionResponse> {
  try {
    const response = await api.post<InitiateSessionResponse>('/initiate-session', {
      case_id: sessionId,
      lat: latitude,
      long: longitude,
      accuracy: accuracy,
    })
    return response.data
  } catch (error) {
    handleAPIError(error)
  }
}

/**
 * Get All Inspections (Admin Dashboard)
 * Fetches all inspection records for the admin dashboard.
 *
 * Endpoint: GET /admin/inspections
 */
export async function getInspections(): Promise<Inspection[]> {
  try {
    const response = await api.get<Inspection[]>('/admin/inspections')
    return response.data
  } catch (error) {
    console.error('Failed to fetch inspections:', error)
    throw error
  }
}

/**
 * Force Verify (Admin Dashboard - Demo Safety)
 * Manually override verification for demo purposes.
 *
 * Endpoint: POST /admin/force-verify/{session_id}
 */
export async function forceVerify(sessionId: string): Promise<ForceVerifyResponse> {
  try {
    // Note: session_id is passed in the URL path, not the body
    const response = await api.post<ForceVerifyResponse>(`/admin/force-verify/${sessionId}`)
    return response.data
  } catch (error) {
    handleAPIError(error)
  }
}

export default api
