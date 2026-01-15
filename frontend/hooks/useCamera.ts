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

  // Attach stream to video element when both are available
  // This handles the case where video element renders after stream is obtained
  useEffect(() => {
    if (streamRef.current && videoRef.current && status === 'previewing') {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current
        videoRef.current.play().catch(err => {
          console.warn('Video autoplay failed:', err)
        })
      }
    }
  }, [status])

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
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      })

      streamRef.current = stream

      // Debug: Verify audio tracks are available
      const audioTracks = stream.getAudioTracks()
      const videoTracks = stream.getVideoTracks()
      console.log('Camera started:', {
        audioTracks: audioTracks.length,
        videoTracks: videoTracks.length,
        audioEnabled: audioTracks[0]?.enabled,
        audioLabel: audioTracks[0]?.label,
      })

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

    // Detect supported MIME type with audio codec
    let mimeType = ''
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4',
    ]

    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        mimeType = type
        console.log('Using MIME type:', type)
        break
      }
    }

    // Create MediaRecorder with audio settings
    const options: MediaRecorderOptions = {
      audioBitsPerSecond: 128000,
      videoBitsPerSecond: 2500000,
    }
    if (mimeType) {
      options.mimeType = mimeType
    }

    // Create MediaRecorder with supported format
    const mediaRecorder = new MediaRecorder(streamRef.current, options)
    console.log('MediaRecorder created with audio:', streamRef.current.getAudioTracks().length > 0)

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data)
      }
    }

    mediaRecorder.onstop = () => {
      // Combine all chunks into single blob using the recorder's actual mimeType
      const blobType = mediaRecorder.mimeType || 'video/webm'
      const blob = new Blob(chunksRef.current, { type: blobType })
      console.log('Recording complete. Blob type:', blobType, 'Size:', blob.size, 'bytes')
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
