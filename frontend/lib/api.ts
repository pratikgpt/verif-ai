import axios, { AxiosError } from 'axios'

/**
 * API Configuration - PRODUCTION
 *
 * Backend deployed on Render: https://verifai-lrw5.onrender.com
 *
 * NOTE: Render free tier has "cold starts" - first request after
 * inactivity can take 30-60 seconds. We handle this with longer timeouts.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://verifai-lrw5.onrender.com'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 second timeout for Render cold starts
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Initiate Session Response
 */
export interface InitiateSessionResponse {
  allowed: boolean
  reason?: string
  session_id?: string
  distance?: number
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

/**
 * Extract error message from various response formats
 */
function extractErrorMessage(data: unknown): string {
  if (typeof data === 'string') {
    return data
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>

    // FastAPI validation errors return { detail: [{type, loc, msg, input}] }
    if (Array.isArray(obj.detail)) {
      const firstError = obj.detail[0] as { msg?: string } | undefined
      if (firstError?.msg) return firstError.msg
      return 'Validation error'
    }

    // FastAPI returns { detail: "message" }
    if (typeof obj.detail === 'string') return obj.detail
    // Some APIs return { message: "message" }
    if (typeof obj.message === 'string') return obj.message
    // Some return { error: "message" }
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

    // Network error (no response)
    if (!axiosError.response) {
      if (axiosError.code === 'ECONNABORTED') {
        throw new APIError(
          'Server is waking up. Please wait a moment and try again.',
          undefined,
          false,
          true // Cold start
        )
      }
      throw new APIError(
        'Unable to connect to server. Please check your internet connection.',
        undefined,
        true
      )
    }

    // Server responded with error
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

  // Handle non-axios errors
  if (error instanceof Error) {
    throw new APIError(error.message)
  }

  throw new APIError('An unexpected error occurred')
}

/**
 * Initiate Session
 *
 * Sends GPS coordinates to backend for validation.
 * Backend checks if user is within acceptable distance of warehouse.
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
      case_id: sessionId,  // Backend expects case_id, not session_id
      lat: latitude,
      long: longitude,
      accuracy: accuracy,
    })

    return response.data
  } catch (error) {
    handleAPIError(error)
  }
}
