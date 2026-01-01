'use client'

import { Upload, CheckCircle, AlertCircle, RefreshCw, X, Loader2 } from 'lucide-react'
import { UploadStatus } from '@/hooks/useUpload'

interface UploadProgressProps {
  status: UploadStatus
  progress: number
  error: string | null
  videoUrl: string | null
  onRetry: () => void
  onCancel: () => void
}

/**
 * Upload Progress Component
 *
 * Shows upload status with:
 * - Progress bar (percentage + visual)
 * - Success state with checkmark
 * - Error state with retry button
 * - Cancel button during upload
 *
 * CRITICAL UX FOR BAD 4G:
 * - Progress bar keeps user engaged during slow uploads
 * - Retry button prevents data loss on failure
 * - Cancel allows user to abort if stuck
 */
export default function UploadProgress({
  status,
  progress,
  error,
  videoUrl,
  onRetry,
  onCancel,
}: UploadProgressProps) {
  // Uploading state
  if (status === 'uploading') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Uploading Video</h3>
              <p className="text-sm text-gray-500">Please keep this page open</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            title="Cancel upload"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Progress Text */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Uploading...</span>
          <span className="font-medium text-blue-600">{progress}%</span>
        </div>

        {/* Warning for slow connection */}
        {progress > 0 && progress < 30 && (
          <p className="text-xs text-amber-600 mt-3">
            Slow connection detected. Please stay on this page.
          </p>
        )}
      </div>
    )
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-medium text-green-800">Upload Complete</h3>
            <p className="text-sm text-green-600">
              Video submitted for verification
            </p>
          </div>
        </div>

        {/* Completion bar */}
        <div className="h-2 bg-green-200 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full w-full" />
        </div>
      </div>
    )
  }

  // Error state with retry
  if (status === 'error') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="font-medium text-red-800">Upload Failed</h3>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>

        {/* Retry Button - THE MOST IMPORTANT BUTTON */}
        <button
          onClick={onRetry}
          className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white
                     rounded-lg font-medium transition-colors flex items-center
                     justify-center gap-2"
        >
          <RefreshCw className="w-5 h-5" />
          Retry Upload
        </button>

        <p className="text-xs text-red-500 text-center mt-3">
          Your video is saved locally. Tap retry when connection improves.
        </p>
      </div>
    )
  }

  // Idle state (shouldn't normally be shown, but good to have)
  return null
}
