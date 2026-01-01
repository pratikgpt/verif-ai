'use client'

import { useState, useCallback } from 'react'

/**
 * GPS Permission States:
 * - idle: Haven't asked for permission yet
 * - requesting: Currently asking user for permission
 * - granted: User allowed location access, coordinates available
 * - denied: User blocked location access (SHOW RED SCREEN)
 * - error: Something went wrong (GPS hardware, timeout, etc.)
 */
export type GeoStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error'

export interface GeoPosition {
  latitude: number
  longitude: number
  accuracy: number // in meters - important for detecting GPS spoofing
  timestamp: number
}

export interface UseGeolocationReturn {
  status: GeoStatus
  position: GeoPosition | null
  error: string | null
  requestPermission: () => void
}

/**
 * useGeolocation Hook
 *
 * WHY THIS MATTERS FOR ANTI-FRAUD:
 * 1. We require HIGH ACCURACY (enableHighAccuracy: true) - makes GPS spoofing harder
 * 2. We track accuracy in meters - if accuracy > 100m, something is suspicious
 * 3. Short timeout (10s) - prevents indefinite loading states on bad networks
 * 4. We store the timestamp - proves when location was captured
 */
export function useGeolocation(): UseGeolocationReturn {
  const [status, setStatus] = useState<GeoStatus>('idle')
  const [position, setPosition] = useState<GeoPosition | null>(null)
  const [error, setError] = useState<string | null>(null)

  const requestPermission = useCallback(() => {
    // Check if browser supports geolocation
    if (!navigator.geolocation) {
      setStatus('error')
      setError('Geolocation is not supported by this browser')
      return
    }

    setStatus('requesting')
    setError(null)

    navigator.geolocation.getCurrentPosition(
      // SUCCESS: User granted permission
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        })
        setStatus('granted')
      },
      // ERROR: User denied or something went wrong
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            // THIS IS THE CRITICAL CASE - User said NO
            setStatus('denied')
            setError('Location access was denied')
            break
          case err.POSITION_UNAVAILABLE:
            setStatus('error')
            setError('Location information unavailable')
            break
          case err.TIMEOUT:
            setStatus('error')
            setError('Location request timed out')
            break
          default:
            setStatus('error')
            setError('An unknown error occurred')
        }
      },
      // OPTIONS: High accuracy for anti-fraud
      {
        enableHighAccuracy: true, // Forces GPS, not just cell tower triangulation
        timeout: 10000,           // 10 seconds max wait
        maximumAge: 0,            // Don't use cached position - we need FRESH location
      }
    )
  }, [])

  return { status, position, error, requestPermission }
}
