'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Shield, CheckCircle, MapPin, Video, FileText, ArrowRight, Lock } from 'lucide-react'

export default function Home() {
  // Generate a stable session ID only on client side to avoid hydration mismatch
  const [demoSessionId, setDemoSessionId] = useState('demo-new')

  useEffect(() => {
    // Generate unique ID only on client side
    setDemoSessionId(`demo-${Date.now().toString(36)}`)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="h-9 w-9 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="ml-3 text-xl font-bold text-gray-900">VerifAI</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/admin/dashboard"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Admin Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mb-6">
              <Lock className="w-4 h-4 mr-1.5" />
              Bank-Grade Security
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
              AI-Powered Stock
              <span className="text-blue-600"> Verification</span>
            </h1>

            {/* Subheadline */}
            <p className="mt-6 text-lg text-gray-600 leading-relaxed">
              Eliminate fraud in pre-shipment inspections with GPS-verified video audits
              and AI-powered analysis. Trusted by banks and NBFCs.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={`/verify/${demoSessionId}`}
                className="inline-flex items-center justify-center px-6 py-3 text-base font-medium
                           text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors
                           shadow-sm"
              >
                Start Demo Verification
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link
                href="/admin/dashboard"
                className="inline-flex items-center justify-center px-6 py-3 text-base font-medium
                           text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors
                           border border-gray-300"
              >
                View Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              How It Works
            </h2>
            <p className="mt-3 text-gray-600">
              Three-layer verification for maximum security
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1: GPS */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                GPS Verification
              </h3>
              <p className="text-gray-600 text-sm">
                Inspectors must be physically present at the warehouse location.
                High-accuracy GPS ensures no spoofing.
              </p>
            </div>

            {/* Feature 2: Live Video */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Live Video + Liveness Code
              </h3>
              <p className="text-gray-600 text-sm">
                No pre-recorded videos allowed. Inspectors must speak a random
                4-digit code during recording to prove authenticity.
              </p>
            </div>

            {/* Feature 3: AI Analysis */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                AI-Powered Analysis
              </h3>
              <p className="text-gray-600 text-sm">
                Our Vision-Language Model analyzes the video for warehouse presence,
                stock visibility, and potential fraud indicators.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-blue-600 rounded-2xl p-8 sm:p-12 text-center">
            <FileText className="w-12 h-12 text-blue-200 mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Automated PDF Reports
            </h2>
            <p className="text-blue-100 max-w-2xl mx-auto mb-8">
              Every verification generates a detailed certificate with GPS coordinates,
              video snapshots, AI analysis results, and audit trail.
              Ready for compliance documentation.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-blue-200">
                <CheckCircle className="w-4 h-4" />
                <span>Tamper-proof</span>
              </div>
              <div className="flex items-center gap-2 text-blue-200">
                <CheckCircle className="w-4 h-4" />
                <span>Audit-ready</span>
              </div>
              <div className="flex items-center gap-2 text-blue-200">
                <CheckCircle className="w-4 h-4" />
                <span>Auto-emailed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">VerifAI</span>
            </div>
            <p className="text-sm text-gray-500">
              Bank-Grade Stock Verification System
            </p>
            <div className="flex gap-6 text-sm text-gray-600">
              <Link href="/admin/dashboard" className="hover:text-gray-900 transition-colors">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
