"use client";

import React from 'react';
import {
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { Inspection } from '@/lib/api';

interface InspectionTableProps {
  inspections: Inspection[];
}

const InspectionTable: React.FC<InspectionTableProps> = ({ inspections }) => {

  // Get status badge based on verification status
  const getStatusBadge = (inspection: Inspection) => {
    const status = inspection.status?.toLowerCase();
    const verificationStatus = inspection.ai_result?.verification_status;

    // First check if we have a verification result (AI completed)
    // This takes priority over the status field
    if (verificationStatus === 'APPROVED') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Verified
        </span>
      );
    }

    if (verificationStatus === 'REJECTED') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </span>
      );
    }

    if (verificationStatus === 'MANUAL_REVIEW') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Review
        </span>
      );
    }

    // If status is completed but no verification_status, show completed
    if (status === 'completed') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </span>
      );
    }

    // Processing = AI is analyzing
    if (status === 'processing') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          <Clock className="w-3 h-3 mr-1" />
          Analyzing
        </span>
      );
    }

    // Pending = waiting for video upload (user started but didn't complete)
    if (status === 'pending') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          <Clock className="w-3 h-3 mr-1" />
          Awaiting Video
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        {inspection.status || 'Unknown'}
      </span>
    );
  };

  // Get risk score display with color coding
  const getRiskScoreDisplay = (inspection: Inspection) => {
    // Backend uses 'overall_confidence_score', fallback to 'confidence_score' for compatibility
    const score = inspection.ai_result?.risk_assessment?.overall_confidence_score
      ?? inspection.ai_result?.risk_assessment?.confidence_score;

    if (score === undefined || score === null) {
      return (
        <span className="text-gray-400 flex items-center gap-1">
          <Minus className="w-4 h-4" />
          N/A
        </span>
      );
    }

    // Higher score = lower risk (confidence in approval)
    if (score >= 70) {
      return (
        <span className="text-green-600 font-semibold flex items-center gap-1">
          <TrendingUp className="w-4 h-4" />
          {score}%
        </span>
      );
    } else if (score >= 40) {
      return (
        <span className="text-amber-600 font-semibold flex items-center gap-1">
          <Minus className="w-4 h-4" />
          {score}%
        </span>
      );
    } else {
      return (
        <span className="text-red-600 font-semibold flex items-center gap-1">
          <TrendingDown className="w-4 h-4" />
          {score}%
        </span>
      );
    }
  };

  // Get liveness check status
  const getLivenessStatus = (inspection: Inspection) => {
    const liveness = inspection.ai_result?.liveness_check;

    if (!liveness) {
      return <span className="text-gray-400">-</span>;
    }

    if (liveness.code_spoken_correctly) {
      return (
        <span className="text-green-600 flex items-center gap-1">
          <CheckCircle className="w-4 h-4" />
          Passed
        </span>
      );
    }

    return (
      <span className="text-red-600 flex items-center gap-1">
        <XCircle className="w-4 h-4" />
        Failed
      </span>
    );
  };

  // Format date/time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    };
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Recent Inspections</h3>
        <p className="mt-1 text-sm text-gray-500">
          Live feed from field auditors
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Case ID
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Exporter
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Time
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Liveness
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Risk Score
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Report
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inspections.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No inspections found</p>
                  <p className="text-gray-400 text-sm mt-1">Inspections will appear here once submitted</p>
                </td>
              </tr>
            ) : (
              inspections.map((inspection) => {
                const { date, time } = formatDateTime(inspection.created_at);
                return (
                  <tr
                    key={inspection.case_id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {/* Case ID */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono font-medium text-gray-900">
                        #{inspection.case_id.slice(0, 8)}
                      </span>
                    </td>

                    {/* Exporter Name */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {inspection.exporter_name || 'Unknown Exporter'}
                      </span>
                    </td>

                    {/* Time */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{date}</div>
                      <div className="text-xs text-gray-500">{time}</div>
                    </td>

                    {/* Liveness Check */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getLivenessStatus(inspection)}
                    </td>

                    {/* Risk Score */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getRiskScoreDisplay(inspection)}
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(inspection)}
                    </td>

                    {/* View PDF */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {inspection.report_url ? (
                        <a
                          href={inspection.report_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                                     text-blue-600 hover:text-blue-800 hover:bg-blue-50
                                     rounded-lg transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                          View PDF
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      {inspections.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Showing {inspections.length} inspection{inspections.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
};

export default InspectionTable;
