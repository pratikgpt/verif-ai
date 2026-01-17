'use client'

import { MapPin, Shield, Loader2 } from 'lucide-react'
import { GeoStatus } from '@/hooks/useGeolocation'

interface PermissionScreenProps {
  status: GeoStatus
  onRequestPermission: () => void
}

/**
 * Permission Screen
 *
 * Shows BEFORE the user can access the camera.
 * This is the "wall" - no location = no audit.
 *
 * UI States:
 * - idle: Show "Enable Location" button
 * - requesting: Show loading spinner
 */
export default function PermissionScreen({
  status,
  onRequestPermission,
}: PermissionScreenProps) {
  const isLoading = status === 'requesting'

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-8" role="region" aria-labelledby="permission-title">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-blue-100 rounded-full">
            <MapPin className="w-10 h-10 text-blue-600" aria-hidden="true" />
          </div>
        </div>

        {/* Title */}
        <h1 id="permission-title" className="text-2xl font-bold text-center text-gray-900 mb-2">
          Location Required
        </h1>

        {/* Explanation - Keep it bank-official sounding */}
        <p className="text-center text-gray-600 mb-6">
          To comply with audit requirements, we need to verify your location
          at the warehouse before proceeding.
        </p>

        {/* Trust Badge */}
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-8">
          <Shield className="w-4 h-4" aria-hidden="true" />
          <span>Your location is only used for verification</span>
        </div>

        {/* Enable Button */}
        <button
          onClick={onRequestPermission}
          disabled={isLoading}
          aria-busy={isLoading}
          aria-label={isLoading ? 'Requesting location access' : 'Enable location access'}
          className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                     text-white font-semibold rounded-lg transition-colors
                     flex items-center justify-center gap-2
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              Requesting Access...
            </>
          ) : (
            <>
              <MapPin className="w-5 h-5" aria-hidden="true" />
              Enable Location Access
            </>
          )}
        </button>

        {/* Fine Print */}
        <p className="text-xs text-gray-400 text-center mt-4">
          Location data is encrypted and stored securely for audit records.
        </p>
      </div>
    </main>
  )
}
