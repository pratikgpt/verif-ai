'use client'

import { useState, useCallback, useRef } from 'react'
import axios, { AxiosProgressEvent, CancelTokenSource } from 'axios'

/**
 * Upload States:
 * - idle: Ready to upload
 * - uploading: Upload in progress
 * - success: Upload completed
 * - error: Upload failed (show retry button)
 */
export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

export interface UseUploadReturn {
  status: UploadStatus
  progress: number
  error: string | null
  videoUrl: string | null
  reportId: string | null
  upload: (blob: Blob, sessionId: string, livenessCode: string) => Promise<void>
  retry: () => void
  cancel: () => void
  reset: () => void
}

/**
 * Production API URL
 */
const API_BASE_URL = 'https://verifai-lrw5.onrender.com'

/**
 * useUpload Hook - PRODUCTION
 *
 * Uploads video to Render backend with:
 * - Real progress tracking
 * - Retry mechanism for bad 4G
 * - Cancel support
 * - Extended timeout for slow networks
 */
export function useUpload(): UseUploadReturn {
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)

  // Store blob, sessionId, and livenessCode for retry
  const blobRef = useRef<Blob | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const livenessCodeRef = useRef<string | null>(null)
  const cancelTokenRef = useRef<CancelTokenSource | null>(null)

  /**
   * Upload video to backend with liveness code
   */
  const upload = useCallback(async (blob: Blob, sessionId: string, livenessCode: string) => {
    // Store for retry
    blobRef.current = blob
    sessionIdRef.current = sessionId
    livenessCodeRef.current = livenessCode

    setStatus('uploading')
    setProgress(0)
    setError(null)

    // Create cancel token
    cancelTokenRef.current = axios.CancelToken.source()

    try {
      // Convert Blob to File with proper name
      const file = new File([blob], `${sessionId}.webm`, {
        type: 'video/webm',
      })

      // Create FormData with liveness code
      const formData = new FormData()
      formData.append('file', file)  // Backend expects 'file', not 'video'
      formData.append('liveness_code', livenessCode)  // Send liveness code for backend verification

      // Upload to production backend
      const response = await axios.post(
        `${API_BASE_URL}/upload-video/${sessionId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          cancelToken: cancelTokenRef.current.token,
          timeout: 180000, // 3 minute timeout for video uploads on slow 4G
          onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              )
              setProgress(percent)
            }
          },
        }
      )

      setVideoUrl(response.data.video_url)
      setReportId(response.data.report_id || null)
      setStatus('success')
    } catch (err) {
      if (axios.isCancel(err)) {
        setError('Upload cancelled')
      } else if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNABORTED') {
          setError('Upload timed out. Please check your connection and retry.')
        } else if (!err.response) {
          setError('Network error. Please check your connection and retry.')
        } else if (err.response.status === 502 || err.response.status === 503) {
          setError('Server is waking up. Please wait 30 seconds and retry.')
        } else {
          const message = err.response.data?.detail || err.response.data?.message || 'Upload failed'
          setError(message)
        }
      } else {
        setError('Upload failed. Please try again.')
      }
      setStatus('error')
    }
  }, [])

  /**
   * Retry failed upload
   */
  const retry = useCallback(() => {
    if (blobRef.current && sessionIdRef.current && livenessCodeRef.current) {
      upload(blobRef.current, sessionIdRef.current, livenessCodeRef.current)
    }
  }, [upload])

  /**
   * Cancel ongoing upload
   */
  const cancel = useCallback(() => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel('Upload cancelled by user')
    }
    setStatus('idle')
    setProgress(0)
  }, [])

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setStatus('idle')
    setProgress(0)
    setError(null)
    setVideoUrl(null)
    setReportId(null)
    blobRef.current = null
    sessionIdRef.current = null
    livenessCodeRef.current = null
  }, [])

  return {
    status,
    progress,
    error,
    videoUrl,
    reportId,
    upload,
    retry,
    cancel,
    reset,
  }
}
