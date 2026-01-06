'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Shield, MapPin, CheckCircle, Loader2, Upload, Video, RefreshCw, Wifi } from 'lucide-react'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useUpload } from '@/hooks/useUpload'
import PermissionScreen from '@/components/GPS/PermissionScreen'
import BlockedScreen from '@/components/GPS/BlockedScreen'
import Camera from '@/components/Camera'
import UploadProgress from '@/components/Upload/UploadProgress'
import { initiateSession, APIError } from '@/lib/api'

/**
 * Verification Flow States - PRODUCTION
 *
 * 1. PERMISSION - Show GPS permission screen
 * 2. VALIDATING - Checking location with backend (handles cold start)
 * 3. BLOCKED    - GPS denied or too far
 * 4. READY      - Location verified, show camera
 * 5. RECORDED   - Video captured, ready for upload
 * 6. UPLOADING  - Upload in progress
 * 7. SUBMITTED  - Upload complete, audit submitted
 */
type FlowState = 'permission' | 'validating' | 'blocked' | 'ready' | 'recorded' | 'uploading' | 'submitted'

type BlockReason = 'denied' | 'too_far' | 'error'

export default function VerifyPage() {
  const params = useParams()
  const sessionId = params.id as string

  const { status: geoStatus, position, error: geoError, requestPermission } = useGeolocation()
  const {
    status: uploadStatus,
    progress: uploadProgress,
    error: uploadError,
    videoUrl,
    reportId,
    upload,
    retry: retryUpload,
    cancel: cancelUpload,
    reset: resetUpload,
  } = useUpload()

  const [flowState, setFlowState] = useState<FlowState>('permission')
  const [blockReason, setBlockReason] = useState<BlockReason>('denied')
  const [blockMessage, setBlockMessage] = useState<string>('')
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [verificationCode, setVerificationCode] = useState<string>('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  // Prevent multiple /initiate-session calls per session
  const validatedSessionRef = useRef<string | null>(null)

  // Handle GPS permission result (validate once per session)
  useEffect(() => {
    if (geoStatus === 'denied') {
      setBlockReason('denied')
      setFlowState('blocked')
    } else if (geoStatus === 'error') {
      setBlockReason('error')
      setBlockMessage(geoError || 'Unknown error')
      setFlowState('blocked')
    } else if (geoStatus === 'granted' && position && validatedSessionRef.current !== sessionId) {
      validatedSessionRef.current = sessionId
      validateLocation()
    }
  }, [geoStatus, position, sessionId])

  // Handle upload status changes
  useEffect(() => {
    if (uploadStatus === 'success') {
      setFlowState('submitted')
    }
  }, [uploadStatus])

  // Validate location with backend
  const validateLocation = async () => {
    if (!position) return

    setFlowState('validating')
    setValidationError(null)
    setIsRetrying(false)

    // Debug logging
    console.log('=== Calling /initiate-session ===')
    console.log('Session ID:', sessionId)
    console.log('Position:', position.latitude, position.longitude)

    try {
      const response = await initiateSession(
        sessionId,
        position.latitude,
        position.longitude,
        position.accuracy
      )

      // Debug logging
      console.log('=== Response from backend ===')
      console.log('Response:', response)
      console.log('Verification code:', response.verification_code)

      if (response.allowed) {
        // Store verification code from backend
        if (response.verification_code) {
          setVerificationCode(response.verification_code)
          console.log('Verification code set to:', response.verification_code)
        }
        setFlowState('ready')
      } else {
        setBlockReason('too_far')
        setBlockMessage(response.reason || 'You are too far from the warehouse location.')
        setFlowState('blocked')
      }
    } catch (err: unknown) {
      // Handle different error types
      let errorMessage = 'Unable to connect to server. Please try again.'

      if (err instanceof APIError) {
        errorMessage = err.message
      } else if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'object' && err !== null) {
        // Handle plain objects with message property
        const errorObj = err as { message?: string; detail?: string }
        errorMessage = errorObj.message || errorObj.detail || errorMessage
      }

      setValidationError(errorMessage)
    }
  }

  // Retry validation
  const handleRetryValidation = () => {
    setIsRetrying(true)
    validateLocation()
  }

  // Handle recording complete (liveness code already from backend)
  const handleRecordingComplete = useCallback((blob: Blob) => {
    setRecordedBlob(blob)
    setFlowState('recorded')
  }, [])

  // Reset to record again (keep liveness code from backend)
  const handleRecordAgain = () => {
    setRecordedBlob(null)
    resetUpload()
    setFlowState('ready')
  }

  // Start upload (with verification code)
  const handleUpload = () => {
    if (recordedBlob && verificationCode) {
      setFlowState('uploading')
      upload(recordedBlob, sessionId, verificationCode)
    }
  }

  // Handle cancel upload
  const handleCancelUpload = () => {
    cancelUpload()
    setFlowState('recorded')
  }

  // RENDER BASED ON FLOW STATE

  // State 1: Show permission screen
  if (flowState === 'permission' && (geoStatus === 'idle' || geoStatus === 'requesting')) {
    return (
      <PermissionScreen
        status={geoStatus}
        onRequestPermission={requestPermission}
      />
    )
  }

  // State 2: Show blocked screen
  if (flowState === 'blocked') {
    return <BlockedScreen reason={blockReason} message={blockMessage} />
  }

  // State 3: Validating with backend (with cold start handling)
  if (flowState === 'validating') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Show error with retry if validation failed */}
          {validationError ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <div className="p-3 bg-amber-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Wifi className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Connection Issue
              </h2>
              <p className="text-gray-600 mb-6">
                {validationError}
              </p>
              <button
                onClick={handleRetryValidation}
                disabled={isRetrying}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                           text-white rounded-lg font-medium transition-colors
                           flex items-center justify-center gap-2"
              >
                {isRetrying ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Try Again
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 mt-4">
                First connection may take up to 30 seconds if server is waking up.
              </p>
            </div>
          ) : (
            // Normal loading state
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Connecting to Server...
              </h2>
              <p className="text-gray-500 mb-4">
                Verifying your location at the warehouse
              </p>
              <p className="text-xs text-gray-400">
                This may take up to 30 seconds on first load
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // State 7: Upload complete - submission success
  if (flowState === 'submitted') {
    // Generate display report number (use backend reportId or fallback to session-based number)
    const displayReportId = reportId || `${sessionId.slice(0, 4).toUpperCase()}`

    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Audit Submitted
          </h1>

          {/* Report Number - The key info from spec */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-700 font-medium">
              Report #{displayReportId} Generated
            </p>
          </div>

          <p className="text-gray-600 mb-6">
            Your verification video has been uploaded successfully.
            The system will analyze it shortly.
          </p>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
            <p className="text-sm text-gray-500 mb-1">Session ID</p>
            <p className="font-mono text-gray-900">{sessionId}</p>
          </div>

          {position && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
              <p className="text-sm text-gray-500 mb-1">Verified Location</p>
              <p className="font-mono text-sm text-gray-900">
                {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
              </p>
            </div>
          )}

          <p className="text-sm text-gray-500">
            You will receive the verification report via email.
          </p>
        </div>
      </main>
    )
  }

  // States 4, 5, 6: Ready / Recorded / Uploading
  return (
    <main className="min-h-screen bg-gray-50 py-4 px-4">
      <div className="w-full max-w-lg mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Stock Verification
              </h1>
              <p className="text-sm text-gray-500">
                Session: {sessionId?.slice(0, 8)}...
              </p>
            </div>
          </div>
        </div>

        {/* Location Verified Badge - Compact */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Location Verified</span>
          </div>
          {position && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <MapPin className="w-3 h-3" />
              <span>{position.accuracy.toFixed(0)}m accuracy</span>
            </div>
          )}
        </div>

        {/* Upload Progress (shown during uploading state) */}
        {flowState === 'uploading' && (
          <div className="mb-4">
            <UploadProgress
              status={uploadStatus}
              progress={uploadProgress}
              error={uploadError}
              videoUrl={videoUrl}
              onRetry={retryUpload}
              onCancel={handleCancelUpload}
            />
          </div>
        )}

        {/* Camera Section */}
        {(flowState === 'ready' || flowState === 'recorded') && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
            <h2 className="text-sm font-medium text-gray-700 mb-3">
              {flowState === 'recorded' ? 'Recording Complete' : 'Record Warehouse Video'}
            </h2>

            {flowState === 'ready' && (
              <Camera
                onRecordingComplete={handleRecordingComplete}
                recordingDuration={10}
                verificationCode={verificationCode}
              />
            )}

            {flowState === 'recorded' && recordedBlob && (
              <div className="space-y-4">
                {/* Video Preview */}
                <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
                  <video
                    src={URL.createObjectURL(recordedBlob)}
                    controls
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Video Info */}
                <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {(recordedBlob.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Ready to upload
                  </span>
                </div>

                {/* Verification Code Confirmation */}
                {verificationCode && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-600 mb-1">Verification Code Spoken:</p>
                    <p className="text-xl font-mono font-bold text-blue-800 tracking-wider">
                      {verificationCode}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleRecordAgain}
                    className="flex-1 py-3 px-4 bg-gray-200 text-gray-700 rounded-lg
                               hover:bg-gray-300 font-medium transition-colors"
                  >
                    Record Again
                  </button>
                  <button
                    onClick={handleUpload}
                    className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg
                               hover:bg-blue-700 font-medium transition-colors
                               flex items-center justify-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    Upload Video
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        {flowState === 'ready' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Recording Instructions</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>1. Click "Enable Camera" to start</li>
              <li>2. Click "Start Recording" for a 10-second video</li>
              <li>3. <strong>Read the 4-digit code out loud</strong> when it appears</li>
              <li>4. Pan around to show the warehouse and stock</li>
            </ul>
          </div>
        )}
      </div>
    </main>
  )
}
