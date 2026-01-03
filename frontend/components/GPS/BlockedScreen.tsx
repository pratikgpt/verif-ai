'use client'

import { ShieldX, AlertTriangle } from 'lucide-react'

interface BlockedScreenProps {
  reason: 'denied' | 'too_far' | 'error'
  message?: string
}

/**
 * Blocked Screen - THE RED WALL
 *
 * This screen is shown when:
 * 1. User denied location permission
 * 2. User is too far from the warehouse
 * 3. GPS error occurred
 *
 * IMPORTANT: There is NO "continue anyway" button.
 * The only option is to refresh and try again.
 * This is intentional - we don't give fraudsters an escape hatch.
 */
export default function BlockedScreen({ reason, message }: BlockedScreenProps) {
  const getContent = () => {
    switch (reason) {
      case 'denied':
        return {
          title: 'Location Access Denied',
          description: 'Location access is mandatory for bank audit compliance. You cannot proceed without enabling location services.',
          instruction: 'Please enable location in your browser settings and refresh this page.',
        }
      case 'too_far':
        return {
          title: 'Location Verification Failed',
          description: 'You must be physically present at the designated warehouse location to conduct this audit.',
          instruction: 'Please travel to the warehouse and try again.',
        }
      case 'error':
        return {
          title: 'Location Error',
          description: message || 'Unable to determine your location. This may be due to GPS hardware issues or network problems.',
          instruction: 'Please check your device settings and try again.',
        }
    }
  }

  const content = getContent()

  return (
    <div className="min-h-screen bg-red-600 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Warning Icon */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-red-500 rounded-full">
            <ShieldX className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* Alert Badge */}
        <div className="inline-flex items-center gap-2 bg-red-500 text-white text-sm font-medium px-4 py-2 rounded-full mb-6">
          <AlertTriangle className="w-4 h-4" />
          AUDIT BLOCKED
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-4">
          {content.title}
        </h1>

        {/* Description */}
        <p className="text-red-100 mb-6">
          {content.description}
        </p>

        {/* Instruction Box */}
        <div className="bg-red-500/50 border border-red-400 rounded-lg p-4 mb-8">
          <p className="text-white text-sm">
            {content.instruction}
          </p>
        </div>

        {/* Refresh Button - The ONLY escape */}
        <button
          onClick={() => window.location.reload()}
          className="w-full py-4 px-6 bg-white text-red-600 font-semibold rounded-lg
                     hover:bg-red-50 transition-colors"
        >
          Refresh & Try Again
        </button>

        {/* Session Info */}
        <p className="text-red-200 text-xs mt-6">
          This incident has been logged for security purposes.
        </p>
      </div>
    </div>
  )
}
