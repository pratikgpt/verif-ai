"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  Shield,
  CheckCircle,
  AlertTriangle,
  FileText,
  RefreshCw,
  BarChart3,
  Clock,
  Plus,
  X,
  MapPin,
  Package,
  Building2,
  Copy,
  Mail,
  LogOut,
} from 'lucide-react';
import InspectionTable from '@/components/Dashboard/InspectionTable';
import { getInspections, forceVerify, createInspection, Inspection, CreateInspectionRequest } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export default function AdminDashboard() {
  const router = useRouter();
  const { status: authStatus, user, accessToken, signOut } = useAuth();

  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Force verify state (hidden feature for demo safety)
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showForceVerify, setShowForceVerify] = useState(false);
  const [forceVerifyId, setForceVerifyId] = useState('');
  const [forceVerifyLoading, setForceVerifyLoading] = useState(false);
  const [forceVerifyMessage, setForceVerifyMessage] = useState('');

  // Create inspection state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createMessage, setCreateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newInspection, setNewInspection] = useState<CreateInspectionRequest>({
    case_id: '',
    exporter_name: '',
    client_email: '',
    target_lat: 0,
    target_long: 0,
    product_type: ''
  });
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);

  const fetchInspections = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInspections(accessToken || undefined);
      setInspections(data);
      setLastUpdated(new Date());
    } catch {
      // Silently fail - just show empty state
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.replace('/admin');
    }
  }, [authStatus, router]);

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
      const result = await forceVerify(forceVerifyId.trim(), accessToken || undefined);
      setForceVerifyMessage(result.message || 'Verification forced successfully!');
      fetchInspections();
    } catch (err) {
      setForceVerifyMessage('Force verify failed. Check authentication or backend.');
    } finally {
      setForceVerifyLoading(false);
    }
  };


  // Generate unique case ID
  const generateCaseId = () => {
    const id = `CASE-${Date.now().toString(36).toUpperCase()}`;
    setNewInspection(prev => ({ ...prev, case_id: id }));
  };

  // Create inspection handler
  const handleCreateInspection = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newInspection.case_id || !newInspection.exporter_name || !newInspection.client_email) {
      setCreateMessage({ type: 'error', text: 'Case ID, Exporter Name, and Client Email are required' });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newInspection.client_email)) {
      setCreateMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    setCreateLoading(true);
    setCreateMessage(null);

    try {
      const result = await createInspection(newInspection, accessToken || undefined);
      setCreateMessage({ type: 'success', text: `Inspection created! Case ID: ${result.case_id}` });
      setCreatedCaseId(result.case_id);
      fetchInspections();
      // Reset form
      setNewInspection({
        case_id: '',
        exporter_name: '',
        client_email: '',
        target_lat: 0,
        target_long: 0,
        product_type: ''
      });
    } catch (err) {
      setCreateMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to create inspection' });
    } finally {
      setCreateLoading(false);
    }
  };

  // Copy verification link to clipboard
  const copyVerificationLink = () => {
    if (createdCaseId) {
      const link = `${window.location.origin}/verify/${createdCaseId}`;
      navigator.clipboard.writeText(link);
      setCreateMessage({ type: 'success', text: 'Verification link copied to clipboard!' });
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

  // Show loading screen while checking auth
  if (authStatus === 'loading' || authStatus === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Logo icon - Triple click to reveal Force Verify */}
              <button
                onClick={handleLogoClick}
                className="h-9 w-9 bg-blue-600 rounded-lg flex items-center justify-center focus:outline-none"
                aria-label="VerifAI"
              >
                <Shield className="w-5 h-5 text-white" />
              </button>
              <Link href="/" className="ml-3 flex items-baseline">
                <span className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">VerifAI</span>
                <span className="text-gray-400 text-sm ml-2">Admin</span>
              </Link>
            </div>

            <div className="flex items-center gap-4">
              {/* Last updated indicator */}
              {lastUpdated && (
                <div className="hidden sm:flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  {lastUpdated.toLocaleTimeString()}
                </div>
              )}

              {/* Create Inspection button */}
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg
                           hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Inspection</span>
              </button>

              {/* Refresh button */}
              <button
                onClick={fetchInspections}
                disabled={loading}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100
                           rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {/* User info and logout */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-medium text-gray-700">
                    {user?.email?.split('@')[0] || 'Admin'}
                  </span>
                  <span className="text-xs text-gray-400">Bank Manager</span>
                </div>
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-xs text-blue-600 font-medium">
                    {user?.email?.charAt(0).toUpperCase() || 'A'}
                  </span>
                </div>
                <button
                  onClick={signOut}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Create Inspection Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Create New Inspection
              </h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setCreateMessage(null);
                  setCreatedCaseId(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateInspection} className="p-4 space-y-4">
              {/* Case ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Case ID *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newInspection.case_id}
                    onChange={(e) => setNewInspection(prev => ({ ...prev, case_id: e.target.value }))}
                    placeholder="e.g., CASE-ABC123"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={generateCaseId}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm
                               hover:bg-gray-200 transition-colors"
                  >
                    Generate
                  </button>
                </div>
              </div>

              {/* Exporter Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Exporter / Client Name *
                </label>
                <input
                  type="text"
                  value={newInspection.exporter_name}
                  onChange={(e) => setNewInspection(prev => ({ ...prev, exporter_name: e.target.value }))}
                  placeholder="e.g., Nike Export Division"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Client Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Client Email *
                </label>
                <input
                  type="email"
                  value={newInspection.client_email}
                  onChange={(e) => setNewInspection(prev => ({ ...prev, client_email: e.target.value }))}
                  placeholder="e.g., client@company.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Audit report will be sent to this email
                </p>
              </div>

              {/* Product Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Package className="w-4 h-4 inline mr-1" />
                  Product Type
                </label>
                <input
                  type="text"
                  value={newInspection.product_type}
                  onChange={(e) => setNewInspection(prev => ({ ...prev, product_type: e.target.value }))}
                  placeholder="e.g., Rice, Electronics, Textiles"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Target Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Target Warehouse Location
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      step="any"
                      value={newInspection.target_lat || ''}
                      onChange={(e) => setNewInspection(prev => ({ ...prev, target_lat: parseFloat(e.target.value) || 0 }))}
                      placeholder="Latitude (e.g., 19.0760)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                                 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="any"
                      value={newInspection.target_long || ''}
                      onChange={(e) => setNewInspection(prev => ({ ...prev, target_long: parseFloat(e.target.value) || 0 }))}
                      placeholder="Longitude (e.g., 72.8777)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                                 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  User must be within 500m of this location to start verification
                </p>
              </div>

              {/* Message */}
              {createMessage && (
                <div className={`p-3 rounded-lg text-sm ${
                  createMessage.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {createMessage.text}
                </div>
              )}

              {/* Created Case Link */}
              {createdCaseId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-blue-800 mb-2">Verification Link:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-white px-2 py-1 rounded border border-blue-200 text-blue-900 truncate">
                      {`${typeof window !== 'undefined' ? window.location.origin : ''}/verify/${createdCaseId}`}
                    </code>
                    <button
                      type="button"
                      onClick={copyVerificationLink}
                      className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    Send this link to the field inspector
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreateMessage(null);
                    setCreatedCaseId(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg
                             hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg
                             hover:bg-blue-700 disabled:opacity-50 transition-colors
                             text-sm font-medium flex items-center justify-center gap-2"
                >
                  {createLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Inspection
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Inspection Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Real-time overview of all field verification audits
          </p>
        </div>

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
