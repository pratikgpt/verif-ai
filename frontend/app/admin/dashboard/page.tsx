"use client";

import React, { useEffect, useState } from 'react';
import InspectionTable from '@/components/Dashboard/InspectionTable';
import { Loader2 } from 'lucide-react';

export default function AdminDashboard() {
    const [inspections, setInspections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchInspections = async () => {
            try {
                // Attempt to fetch from the actual backend
                // Note: We use a relative path /api/... or direct URL. Assuming backend is on localhost:8000 for dev
                // In a real prod setup, this would be proxied or an ENV var.
                const response = await fetch('http://localhost:8000/inspections');

                if (!response.ok) {
                    throw new Error('Failed to fetch from backend');
                }

                const data = await response.json();
                setInspections(data);
            } catch (err) {
                console.warn("Backend unavailable, falling back to Mock Data for demonstration.");
                // Fallback Mock Data as per requirements
                setInspections([
                    {
                        id: '550e8400-e29b-41d4-a716-446655440000',
                        created_at: new Date().toISOString(),
                        status: 'COMPLETED',
                        exporter_name: 'GreenField Exports',
                        ai_result: {
                            liveness_check: {
                                code_spoken_correctly: true
                            },
                            verified: true,
                            confidence: 98,
                            reason: "Warehouse detected. Boxes count matches manifest."
                        },
                        video_url: 'http://example.com/video1.mp4'
                    },
                    {
                        id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
                        created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                        status: 'REJECTED',
                        exporter_name: 'Oceanic Traders',
                        ai_result: {
                            liveness_check: {
                                code_spoken_correctly: false
                            },
                            verified: false,
                            confidence: 90,
                            reason: "Liveness code mismatch. User verified wrong location."
                        },
                        video_url: 'http://example.com/video2.mp4'
                    },
                    {
                        id: '3d8b1234-5678-90ab-cdef-1234567890ab',
                        created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
                        status: 'pending',
                        exporter_name: 'Apex Logistics',
                        // No result yet
                    }
                ]);
                setError(null); // Clear error since we handled it gracefully
            } finally {
                setLoading(false);
            }
        };

        fetchInspections();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
            {/* Navbar for Admin */}
            <nav className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                {/* Logo Placeholder */}
                                <div className="h-8 w-8 bg-indigo-600 rounded-sm flex items-center justify-center text-white font-bold text-xs">
                                    V
                                </div>
                                <span className="ml-2 text-xl font-bold tracking-tight text-gray-900">VerifAI <span className="text-gray-500 text-sm font-normal">| Admin</span></span>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <span className="text-sm text-gray-500 mr-4">Bank Manager View</span>
                            <div className="h-8 w-8 rounded-full bg-gray-200"></div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p className="mt-2 text-sm text-gray-600">Overview of all field audit requests and their AI-verification status.</p>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Stats Cards Row (Optional enhancement for "Dashboard feel") */}
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                            <div className="bg-white overflow-hidden shadow rounded-lg px-4 py-5 sm:p-6 border border-gray-100 border-l-4 border-l-blue-500">
                                <dt className="text-sm font-medium text-gray-500 truncate">Total Inspections</dt>
                                <dd className="mt-1 text-3xl font-semibold text-gray-900">{inspections.length}</dd>
                            </div>
                            <div className="bg-white overflow-hidden shadow rounded-lg px-4 py-5 sm:p-6 border border-gray-100 border-l-4 border-l-green-500">
                                <dt className="text-sm font-medium text-gray-500 truncate">Verified Safe</dt>
                                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                                    {inspections.filter(i => i.status === 'COMPLETED' && i.ai_result?.verified).length}
                                </dd>
                            </div>
                            <div className="bg-white overflow-hidden shadow rounded-lg px-4 py-5 sm:p-6 border border-gray-100 border-l-4 border-l-red-500">
                                <dt className="text-sm font-medium text-gray-500 truncate">Action Required</dt>
                                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                                    {inspections.filter(i => i.status === 'REJECTED' || (i.status === 'COMPLETED' && !i.ai_result?.verified)).length}
                                </dd>
                            </div>
                        </div>

                        <InspectionTable inspections={inspections} />
                    </div>
                )}
            </main>
        </div>
    );
}
