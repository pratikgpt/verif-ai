'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Camera States:
 * - idle: Camera not started
 * - requesting: Asking for camera permission
 * - previewing: Camera on, showing live feed
 * - recording: Currently recording video
 * - recorded: Recording complete, blob ready
 * - error: Something went wrong
 */
export type CameraStatus = 'idle' | 'requesting' | 'previewing' | 'recording' | 'recorded' | 'error'

export interface UseCameraReturn {
  status: CameraStatus
  videoRef: React.RefObject<HTMLVideoElement | null>
  error: string | null
  recordedBlob: Blob | null
  recordingTime: number
  startCamera: () => Promise<void>
  startRecording: (durationSeconds?: number) => void
  stopRecording: () => void
  resetCamera: () => void
}

/**
 * useCamera Hook
 *
 * CRITICAL SECURITY FEATURES:
 * 1. Uses getUserMedia - ONLY live camera, no file picker
 * 2. Records directly from stream - cannot inject pre-recorded video
 * 3. Blob is created in-memory - harder to tamper with
 *
 * WHY NOT <input type="file">:
 * - File input allows selecting ANY video from gallery
 * - User could upload a video recorded months ago
 * - With getUserMedia, video MUST come from live camera feed
 */
export function useCamera(): UseCameraReturn {
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  /**
   * Start Camera
   *
   * Requests camera access and starts live preview.
   * Uses rear camera (environment) on mobile for warehouse filming.
   */
  const startCamera = useCallback(async () => {
    setStatus('requesting')
    setError(null)

    try {
      // Request camera with preferences for mobile warehouse filming
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Rear camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true, // Need audio for liveness code reading (Day 8)
      })

      streamRef.current = stream

      // Attach stream to video element for preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setStatus('previewing')
    } catch (err) {
      setStatus('error')
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access was denied. Please enable camera permissions.')
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.')
        } else {
          setError(err.message)
        }
      } else {
        setError('Failed to access camera')
      }
    }
  }, [])

  /**
   * Start Recording
   *
   * Records for specified duration (default 10 seconds).
   * Creates a Blob when complete.
   */
  const startRecording = useCallback((durationSeconds = 10) => {
    if (!streamRef.current || status !== 'previewing') return

    chunksRef.current = []
    setRecordingTime(durationSeconds)

    // Create MediaRecorder with WebM format (best browser support)
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp8,opus',
    })

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data)
      }
    }

    mediaRecorder.onstop = () => {
      // Combine all chunks into single blob
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      setRecordedBlob(blob)
      setStatus('recorded')
      setRecordingTime(0)

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    mediaRecorderRef.current = mediaRecorder
    mediaRecorder.start(100) // Capture in 100ms chunks
    setStatus('recording')

    // Countdown timer
    let timeLeft = durationSeconds
    timerRef.current = setInterval(() => {
      timeLeft -= 1
      setRecordingTime(timeLeft)

      if (timeLeft <= 0) {
        stopRecording()
      }
    }, 1000)
  }, [status])

  /**
   * Stop Recording
   *
   * Manually stop recording before timer ends.
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  /**
   * Reset Camera
   *
   * Clear recorded blob and go back to preview mode.
   */
  const resetCamera = useCallback(() => {
    setRecordedBlob(null)
    setRecordingTime(0)
    if (streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
      setStatus('previewing')
    } else {
      setStatus('idle')
    }
  }, [])

  return {
    status,
    videoRef,
    error,
    recordedBlob,
    recordingTime,
    startCamera,
    startRecording,
    stopRecording,
    resetCamera,
  }
}
