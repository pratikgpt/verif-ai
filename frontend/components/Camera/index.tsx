'use client'

import { useEffect, useState, useMemo } from 'react'
import { Video, Circle, Square, RotateCcw, AlertCircle, Loader2, Volume2 } from 'lucide-react'
import { useCamera, CameraStatus } from '@/hooks/useCamera'

interface CameraProps {
  onRecordingComplete: (blob: Blob, livenessCode: string) => void
  recordingDuration?: number
}

/**
 * Generate a random 4-digit liveness code
 */
function generateLivenessCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

/**
 * Camera Component
 *
 * SECURITY: NO <input type="file"> anywhere!
 * This component ONLY uses live camera feed via getUserMedia.
 *
 * Flow:
 * 1. User clicks "Enable Camera" → requests permission
 * 2. Live preview shows (no recording yet)
 * 3. User clicks "Start Recording" → 10-second countdown
 * 4. Recording auto-stops → blob passed to parent
 */
export default function Camera({ onRecordingComplete, recordingDuration = 10 }: CameraProps) {
  const {
    status,
    videoRef,
    error,
    recordedBlob,
    recordingTime,
    startCamera,
    startRecording,
    stopRecording,
    resetCamera,
  } = useCamera()

  // Liveness code - generated fresh for each recording
  const [livenessCode, setLivenessCode] = useState<string>('')

  // Generate new code when starting recording
  const handleStartRecording = () => {
    const code = generateLivenessCode()
    setLivenessCode(code)
    startRecording(recordingDuration)
  }

  // When recording is complete, notify parent with liveness code
  useEffect(() => {
    if (status === 'recorded' && recordedBlob && livenessCode) {
      onRecordingComplete(recordedBlob, livenessCode)
    }
  }, [status, recordedBlob, livenessCode, onRecordingComplete])

  // Render error state
  if (status === 'error') {
    return (
      <div className="w-full aspect-video bg-gray-900 rounded-lg flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-red-400 text-center mb-4">{error}</p>
        <button
          onClick={startCamera}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
        >
          Try Again
        </button>
      </div>
    )
  }

  // Render idle state - camera not started
  if (status === 'idle') {
    return (
      <div className="w-full aspect-video bg-gray-900 rounded-lg flex flex-col items-center justify-center">
        <Video className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-gray-400 text-sm mb-4">Camera ready</p>
        <button
          onClick={startCamera}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                     flex items-center gap-2 font-medium"
        >
          <Video className="w-5 h-5" />
          Enable Camera
        </button>
      </div>
    )
  }

  // Render requesting state
  if (status === 'requesting') {
    return (
      <div className="w-full aspect-video bg-gray-900 rounded-lg flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-400">Requesting camera access...</p>
      </div>
    )
  }

  // Render preview/recording/recorded states
  return (
    <div className="w-full relative">
      {/* Video Preview */}
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={status !== 'recorded'} // Mute during preview to avoid feedback
          className="w-full h-full object-cover"
        />

        {/* Recording Indicator */}
        {status === 'recording' && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full">
            <Circle className="w-3 h-3 fill-white animate-pulse" />
            <span className="text-sm font-medium">REC</span>
          </div>
        )}

        {/* Countdown Timer */}
        {status === 'recording' && (
          <div className="absolute top-4 right-4 bg-black/70 text-white px-4 py-2 rounded-lg">
            <span className="text-2xl font-bold font-mono">{recordingTime}s</span>
          </div>
        )}

        {/* LIVENESS CODE - The Killer Feature */}
        {status === 'recording' && livenessCode && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent pt-8 pb-4 px-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Volume2 className="w-5 h-5 text-yellow-400 animate-pulse" />
                <span className="text-yellow-400 text-sm font-medium uppercase tracking-wide">
                  Read this code out loud
                </span>
              </div>
              <div className="text-5xl font-bold font-mono text-white tracking-[0.3em] drop-shadow-lg">
                {livenessCode}
              </div>
            </div>
          </div>
        )}

        {/* Recorded Badge */}
        {status === 'recorded' && (
          <div className="absolute top-4 left-4 bg-green-600 text-white px-3 py-1 rounded-full">
            <span className="text-sm font-medium">Recording Complete</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 flex justify-center gap-4">
        {status === 'previewing' && (
          <button
            onClick={handleStartRecording}
            className="px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700
                       flex items-center gap-2 font-medium"
          >
            <Circle className="w-5 h-5 fill-white" />
            Start Recording ({recordingDuration}s)
          </button>
        )}

        {status === 'recording' && (
          <button
            onClick={stopRecording}
            className="px-6 py-3 bg-gray-700 text-white rounded-full hover:bg-gray-600
                       flex items-center gap-2 font-medium"
          >
            <Square className="w-5 h-5 fill-white" />
            Stop Early
          </button>
        )}

        {status === 'recorded' && (
          <button
            onClick={resetCamera}
            className="px-6 py-3 bg-gray-700 text-white rounded-full hover:bg-gray-600
                       flex items-center gap-2 font-medium"
          >
            <RotateCcw className="w-5 h-5" />
            Record Again
          </button>
        )}
      </div>
    </div>
  )
}
