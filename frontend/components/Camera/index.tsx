'use client'

import { useEffect } from 'react'
import { Video, Circle, Square, RotateCcw, AlertCircle, Loader2, Volume2 } from 'lucide-react'
import { useCamera } from '@/hooks/useCamera'

interface CameraProps {
  onRecordingComplete: (blob: Blob) => void
  verificationCode: string
}

export default function Camera({ onRecordingComplete, verificationCode }: CameraProps) {
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

  const handleStartRecording = () => {
    startRecording()
  }

  // Format elapsed time as M:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // When recording is complete, notify parent with blob
  useEffect(() => {
    if (status === 'recorded' && recordedBlob) {
      onRecordingComplete(recordedBlob)
    }
  }, [status, recordedBlob, onRecordingComplete])

  // Render error state
  if (status === 'error') {
    return (
      <div className="w-full aspect-video bg-gray-900 rounded-lg flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-red-400 text-center mb-4">{error}</p>
        <button
          onClick={startCamera}
          aria-label="Retry camera access"
          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
          aria-label="Enable camera for recording"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                     flex items-center gap-2 font-medium
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Video className="w-5 h-5" aria-hidden="true" />
          Enable Camera
        </button>
      </div>
    )
  }

  // Render requesting/preview/recording/recorded states
  // Video element is always in DOM so ref works properly
  return (
    <div className="w-full relative">
      {/* Video Preview - Always rendered so ref is available for stream attachment */}
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={status !== 'recorded'}
          aria-label="Camera preview"
          className={`w-full h-full object-cover ${status === 'requesting' ? 'invisible' : 'visible'}`}
        />

        {/* Requesting Overlay */}
        {status === 'requesting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="text-gray-400">Requesting camera access...</p>
          </div>
        )}

        {/* Recording Indicator */}
        {status === 'recording' && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full">
            <Circle className="w-3 h-3 fill-white animate-pulse" />
            <span className="text-sm font-medium">REC</span>
          </div>
        )}

        {/* Elapsed Timer */}
        {status === 'recording' && (
          <div className="absolute top-4 right-4 bg-black/70 text-white px-4 py-2 rounded-lg">
            <span className="text-2xl font-bold font-mono">{formatTime(recordingTime)}</span>
          </div>
        )}

        {/* VERIFICATION CODE - The Killer Feature */}
        {status === 'recording' && verificationCode && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent pt-8 pb-4 px-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Volume2 className="w-5 h-5 text-yellow-400 animate-pulse" />
                <span className="text-yellow-400 text-sm font-medium uppercase tracking-wide">
                  Read this code out loud
                </span>
              </div>
              <div className="text-5xl font-bold font-mono text-white tracking-[0.3em] drop-shadow-lg">
                {verificationCode}
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
      <div className="mt-4 flex justify-center gap-4" role="group" aria-label="Recording controls">
        {status === 'previewing' && (
          <button
            onClick={handleStartRecording}
            aria-label="Start recording"
            className="px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700
                       flex items-center gap-2 font-medium
                       focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <Circle className="w-5 h-5 fill-white" aria-hidden="true" />
            Start Recording
          </button>
        )}

        {status === 'recording' && (
          <button
            onClick={stopRecording}
            aria-label="Stop recording"
            className="px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700
                       flex items-center gap-2 font-medium animate-pulse
                       focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <Square className="w-5 h-5 fill-white" aria-hidden="true" />
            Stop Recording
          </button>
        )}

        {status === 'recorded' && (
          <button
            onClick={resetCamera}
            aria-label="Discard recording and start over"
            className="px-6 py-3 bg-gray-700 text-white rounded-full hover:bg-gray-600
                       flex items-center gap-2 font-medium
                       focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <RotateCcw className="w-5 h-5" aria-hidden="true" />
            Record Again
          </button>
        )}
      </div>
    </div>
  )
}
