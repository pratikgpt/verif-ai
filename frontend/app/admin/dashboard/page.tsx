"use client";

import React, { useEffect, useState, useCallback } from 'react';
import {
  Loader2,
  Shield,
  CheckCircle,
  AlertTriangle,
  FileText,
  RefreshCw,
  BarChart3,
  Clock
} from 'lucide-react';
import InspectionTable from '@/components/Dashboard/InspectionTable';
import { getInspections, forceVerify, Inspection } from '@/lib/api';

// Mock data for when backend is unavailable
const MOCK_INSPECTIONS: Inspection[] = [
  {
    case_id: '550e8400-e29b-41d4-a716-446655440000',
    created_at: new Date().toISOString(),
    status: 'completed',
    gps_lat: 19.073892,
    gps_long: 72.845470,
    exporter_name: 'GreenField Exports Pvt Ltd',
    video_url: 'https://example.com/video1.mp4',
    report_url: 'https://example.com/report1.pdf',
    ai_result: {
      verification_status: 'APPROVED',
      liveness_check: {
        code_spoken_correctly: true,
        voice_confidence: 95
      },
      risk_assessment: {
        confidence_score: 92,
        fraud_flags: []
      },
      stock_assessment: {
        warehouse_environment: true,
        inventory_visible: true,
        commercial_volume: 'HIGH'
      },
      auditor_reasoning: 'Warehouse verified with substantial inventory.'
    }
  },
  {
    case_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    status: 'completed',
    gps_lat: 19.076090,
    gps_long: 72.877426,
    exporter_name: 'Oceanic Traders International',
    video_url: 'https://example.com/video2.mp4',
    ai_result: {
      verification_status: 'REJECTED',
      liveness_check: {
        code_spoken_correctly: false,
        voice_confidence: 30
      },
      risk_assessment: {
        confidence_score: 25,
        fraud_flags: ['LIVENESS_FAILED', 'CODE_MISMATCH']
      },
      auditor_reasoning: 'Liveness code was not spoken correctly.'
    }
  },
  {
    case_id: '3d8b1234-5678-90ab-cdef-1234567890ab',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    status: 'processing',
    gps_lat: 19.082080,
    gps_long: 72.871170,
    exporter_name: 'Apex Logistics Co',
  },
  {
    case_id: 'abc12345-6789-0def-ghij-klmnopqrstuv',
    created_at: new Date(Date.now() - 14400000).toISOString(),
    status: 'completed',
    gps_lat: 19.089654,
    gps_long: 72.865890,
    exporter_name: 'Mumbai Exports Hub',
    video_url: 'https://example.com/video4.mp4',
    report_url: 'https://example.com/report4.pdf',
    ai_result: {
      verification_status: 'APPROVED',
      liveness_check: {
        code_spoken_correctly: true,
        voice_confidence: 88
      },
      risk_assessment: {
        confidence_score: 85,
        fraud_flags: []
      },
      stock_assessment: {
        warehouse_environment: true,
        inventory_visible: true,
        commercial_volume: 'MEDIUM'
      },
      auditor_reasoning: 'Stock verified at warehouse location.'
    }
  }
];

export default function AdminDashboard() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Force verify state (hidden feature for demo safety)
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showForceVerify, setShowForceVerify] = useState(false);
  const [forceVerifyId, setForceVerifyId] = useState('');
  const [forceVerifyLoading, setForceVerifyLoading] = useState(false);
  const [forceVerifyMessage, setForceVerifyMessage] = useState('');

  const fetchInspections = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInspections();
      // Debug: Log ALL inspections to see which ones have ai_result
      console.log('=== Dashboard Data Debug ===');
      console.log('Total inspections:', data?.length || 0);
      data?.forEach((inspection, index) => {
        console.log(`[${index}] ${inspection.case_id.slice(0, 12)}... | status: ${inspection.status} | verification: ${inspection.ai_result?.verification_status || 'N/A'} | has_ai_result: ${!!inspection.ai_result}`);
      });
      setInspections(data);
      setIsUsingMockData(false);
      setLastUpdated(new Date());
    } catch (err) {
      console.warn("Backend unavailable, using mock data for demonstration.");
      setInspections(MOCK_INSPECTIONS);
      setIsUsingMockData(true);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  // Hidden feature: Triple-click on logo to reveal Force Verify
  const handleLogoClick = () => {
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);

    if (newCount >= 3) {
      setShowForceVerify(true);
      setLogoClickCount(0);
    }

    // Reset count after 2 seconds
    setTimeout(() => setLogoClickCount(0), 2000);
  };

  // Force verify handler
  const handleForceVerify = async () => {
    if (!forceVerifyId.trim()) {
      setForceVerifyMessage('Please enter a Case ID');
      return;
    }

    setForceVerifyLoading(true);
    setForceVerifyMessage('');

    try {
      const result = await forceVerify(forceVerifyId.trim());
      setForceVerifyMessage(result.message || 'Verification forced successfully!');
      fetchInspections();
    } catch (err) {
      setForceVerifyMessage('Force verify failed. Backend endpoint may not be configured.');
    } finally {
      setForceVerifyLoading(false);
    }
  };

  // Calculate stats - prioritize verification_status from ai_result
  const stats = {
    total: inspections.length,
    verified: inspections.filter(i =>
      i.ai_result?.verification_status === 'APPROVED'
    ).length,
    rejected: inspections.filter(i =>
      i.ai_result?.verification_status === 'REJECTED'
    ).length,
    // Only count 'processing' (AI analyzing), not 'pending' (awaiting video)
    processing: inspections.filter(i =>
      !i.ai_result?.verification_status &&
      i.status === 'processing'
    ).length,
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Logo - Triple click to reveal Force Verify */}
              <button
                onClick={handleLogoClick}
                className="flex items-center focus:outline-none"
              >
                <div className="h-9 w-9 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="ml-3">
                  <span className="text-xl font-bold text-gray-900">VerifAI</span>
                  <span className="text-gray-400 text-sm ml-2">Admin</span>
                </div>
              </button>
            </div>

            <div className="flex items-center gap-4">
              {/* Last updated indicator */}
              {lastUpdated && (
                <div className="hidden sm:flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  {lastUpdated.toLocaleTimeString()}
                </div>
              )}

              {/* Refresh button */}
              <button
                onClick={fetchInspections}
                disabled={loading}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100
                           rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {/* User avatar placeholder */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 hidden sm:block">Bank Manager</span>
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-xs text-gray-600 font-medium">BM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Inspection Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Real-time overview of all field verification audits
          </p>
        </div>

        {/* Mock Data Warning */}
        {isUsingMockData && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Demo Mode Active</p>
              <p className="text-sm text-amber-700">
                Backend unavailable. Displaying sample data for demonstration.
              </p>
            </div>
          </div>
        )}

        {/* Hidden Force Verify Panel (Demo Safety) */}
        {showForceVerify && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Force Verify (Demo Override)
              </h3>
              <button
                onClick={() => setShowForceVerify(false)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Hide
              </button>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Enter Case ID to force verify"
                value={forceVerifyId}
                onChange={(e) => setForceVerifyId(e.target.value)}
                className="flex-1 px-3 py-2 border border-red-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                onClick={handleForceVerify}
                disabled={forceVerifyLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium
                           hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {forceVerifyLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Force Verify
              </button>
            </div>
            {forceVerifyMessage && (
              <p className="mt-2 text-sm text-red-700">{forceVerifyMessage}</p>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-500">Loading inspections...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total Inspections */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Inspections</p>
                    <p className="mt-1 text-3xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Verified */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Verified Safe</p>
                    <p className="mt-1 text-3xl font-bold text-green-600">{stats.verified}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              {/* Rejected */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Action Required</p>
                    <p className="mt-1 text-3xl font-bold text-red-600">{stats.rejected}</p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>

              {/* Processing */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">In Progress</p>
                    <p className="mt-1 text-3xl font-bold text-amber-600">{stats.processing}</p>
                  </div>
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Inspections Table */}
            <InspectionTable inspections={inspections} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            VerifAI - Bank-Grade Stock Verification System
          </p>
        </div>
      </footer>
    </div>
  );
}
