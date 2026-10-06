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

/**
 * Create Inspection Request - Bank Manager creates inspection job
 * NOTE: client_email is required by backend for sending audit reports
 */
export interface CreateInspectionRequest {
  case_id: string
  exporter_name: string
  client_email: string  // Required: Email to receive audit report
  target_lat: number
  target_long: number
  product_type: string
}

/**
 * Create Inspection Response
 */
export interface CreateInspectionResponse {
  message: string
  case_id: string
}

export interface InitiateSessionResponse {
  allowed: boolean
  reason?: string
  session_id?: string
  distance?: number
  verification_code?: string
  exporter_name?: string  // Client name to display during verification
}

/**
 * Inspection interface - matches backend database schema
 * Field names match what Dev A's backend sends from Supabase
 */
export interface Inspection {
  case_id: string
  created_at: string
  status: string  // 'pending' | 'processing' | 'completed' | 'failed'
  gps_lat?: number         // User's actual GPS location
  gps_long?: number
  target_lat?: number      // Target warehouse location (set by admin)
  target_long?: number
  product_type?: string    // "Rice", "Electronics", "General Goods", etc.
  video_url?: string
  report_url?: string
  verification_code?: string
  exporter_name?: string
  client_email?: string    // Email to receive audit report
  ai_result?: {
    verification_status?: string  // 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW'
    liveness_check?: {
      code_spoken_correctly?: boolean
      detected_code_transcript?: string
      voice_liveness_confidence?: string  // 'HIGH' | 'LOW' - backend field name
      voice_confidence?: number  // Alternative field for compatibility
    }
    product_verification?: {
      matches_expected_product?: boolean
      visual_description?: string
      packaging_type?: string
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
      condition?: string  // 'Good' | 'Damaged' | 'Dusty'
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
 * Create auth headers for protected routes
 */
function getAuthHeaders(authToken?: string): Record<string, string> {
  if (authToken) {
    return { 'Authorization': `Bearer ${authToken}` }
  }
  return {}
}

/**
 * Create Inspection (Admin Side - Protected)
 * Bank Manager creates a new inspection job before user can verify.
 * Requires authentication token.
 *
 * Endpoint: POST /create-inspection
 */
export async function createInspection(
  data: CreateInspectionRequest,
  authToken?: string
): Promise<CreateInspectionResponse> {
  try {
    const response = await api.post<CreateInspectionResponse>(
      '/create-inspection',
      data,
      { headers: getAuthHeaders(authToken) }
    )
    return response.data
  } catch (error) {
    handleAPIError(error)
  }
}

/**
 * Initiate Session (User Side)
 * Sends GPS coordinates to backend for validation.
 * NOTE: Requires case_id to exist (created via /create-inspection first)
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
 * Get All Inspections (Admin Dashboard - Protected)
 * Fetches all inspection records for the admin dashboard.
 * Requires authentication token.
 *
 * Endpoint: GET /admin/inspections
 */
export async function getInspections(authToken?: string): Promise<Inspection[]> {
  try {
    const response = await api.get<Inspection[]>(
      '/admin/inspections',
      { headers: getAuthHeaders(authToken) }
    )
    return response.data
  } catch (error) {
    console.error('Failed to fetch inspections:', error)
    throw error
  }
}

/**
 * Force Verify (Admin Dashboard - Demo Safety - Protected)
 * Manually override verification for demo purposes.
 * Requires authentication token.
 *
 * Endpoint: POST /admin/force-verify/{session_id}
 */
export async function forceVerify(sessionId: string, authToken?: string): Promise<ForceVerifyResponse> {
  try {
    // Note: session_id is passed in the URL path, not the body
    const response = await api.post<ForceVerifyResponse>(
      `/admin/force-verify/${sessionId}`,
      {},
      { headers: getAuthHeaders(authToken) }
    )
    return response.data
  } catch (error) {
    handleAPIError(error)
  }
}

export default api
