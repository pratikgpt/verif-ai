"use client";

import React from 'react';
import { FileText, CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';

// Interfaces for the data
interface AiResult {
    liveness_check?: {
        code_spoken_correctly: boolean;
    };
    verified?: boolean;
    confidence?: number;
    reason?: string;
}

interface Inspection {
    id: string;
    created_at: string;
    status: string; // 'pending', 'completed', 'rejected'
    ai_result?: AiResult; // This might be null/undefined initially
    video_url?: string;
    exporter_name?: string; // Mocked field for now as per schema discussion
}

interface InspectionTableProps {
    inspections: Inspection[];
}

const InspectionTable: React.FC<InspectionTableProps> = ({ inspections }) => {

    // Helper to determine badge color and text based on status and AI result
    const getStatusBadge = (inspection: Inspection) => {
        // If status is still processing
        if (inspection.status === 'pending' || inspection.status === 'uploading') {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Processing
                </span>
            );
        }

        // Check AI Result specifically for the new nested structure
        const isLivenessPassed = inspection.ai_result?.liveness_check?.code_spoken_correctly;
        const isAiVerified = inspection.ai_result?.verified;

        if (inspection.status === 'completed' || inspection.status === 'COMPLETED') {
            if (isLivenessPassed && isAiVerified) {
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                    </span>
                );
            } else {
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircle className="w-3 h-3 mr-1" />
                        Rejected
                    </span>
                );
            }
        }

        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {inspection.status}
            </span>
        );
    };

    return (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Recent Inspections
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    Live feed from field auditors.
                </p>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Case ID
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Exporter
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Time
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Liveness Code
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {inspections.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                                    No inspections found.
                                </td>
                            </tr>
                        ) : (
                            inspections.map((inspection) => (
                                <tr key={inspection.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        #{inspection.id.slice(0, 8)}...
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {inspection.exporter_name || 'Agro Corp Ltd.'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(inspection.created_at).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {/* Safe access to the nested property */}
                                        {inspection.ai_result?.liveness_check?.code_spoken_correctly ? (
                                            <span className="text-green-600 flex items-center gap-1">
                                                <CheckCircle className="w-4 h-4" /> Passed
                                            </span>
                                        ) : inspection.ai_result ? (
                                            <span className="text-red-600 flex items-center gap-1">
                                                <XCircle className="w-4 h-4" /> Failed
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(inspection)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                                        {/* In a real app, this might open a modal or new page. using a dummy link for now */}
                                        <a href="#" className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1">
                                            <FileText className="w-4 h-4" />
                                            View PDF
                                        </a>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InspectionTable;
