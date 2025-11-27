'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingSpinner from '@/components/LoadingSpinner';

interface CleanupStats {
  totalImageFiles: number;
  filesToCleanup: number;
  cutoffDate: string;
  nextCleanupDate: string;
}

interface CleanupResult {
  success: boolean;
  message: string;
  filesProcessed: number;
  filesDeleted: number;
  errors?: string[];
  cutoffDate: string;
}

export default function CleanupPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<CleanupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningCleanup, setRunningCleanup] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<CleanupResult | null>(null);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/cleanup');
      if (!response.ok) {
        throw new Error('Failed to load cleanup statistics');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error loading stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const runDryRun = async () => {
    try {
      setRunningCleanup(true);
      setError(null);
      const response = await fetch('/api/admin/cleanup?dryRun=true', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Dry run failed');
      }

      const result = await response.json();
      setDryRunResult(result);
    } catch (err) {
      console.error('Dry run error:', err);
      setError(err instanceof Error ? err.message : 'Dry run failed');
    } finally {
      setRunningCleanup(false);
    }
  };

  const runCleanup = async () => {
    if (!confirm('Are you sure you want to delete old files? This action cannot be undone.')) {
      return;
    }

    try {
      setRunningCleanup(true);
      setError(null);
      const response = await fetch('/api/admin/cleanup', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Cleanup failed');
      }

      const result = await response.json();
      setCleanupResult(result);
      // Reload stats after cleanup
      await loadStats();
    } catch (err) {
      console.error('Cleanup error:', err);
      setError(err instanceof Error ? err.message : 'Cleanup failed');
    } finally {
      setRunningCleanup(false);
    }
  };

  if (!user) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-96">
            <LoadingSpinner size="lg" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">File Cleanup Management</h1>
            <p className="text-slate-600">Manage automatic cleanup of uploaded files older than 30 days</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Statistics */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">{stats.totalImageFiles}</div>
                  <div className="text-sm text-slate-600">Total Image Files</div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-2">{stats.filesToCleanup}</div>
                  <div className="text-sm text-slate-600">Files to Clean Up</div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900 mb-2">
                    {new Date(stats.cutoffDate).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-slate-600">Cutoff Date (30 days ago)</div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100 mb-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Cleanup Actions</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={runDryRun}
                disabled={runningCleanup}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {runningCleanup ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Running...</span>
                  </>
                ) : (
                  <span>Run Dry Run</span>
                )}
              </button>
              <button
                onClick={runCleanup}
                disabled={runningCleanup || (stats?.filesToCleanup || 0) === 0}
                className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {runningCleanup ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Running...</span>
                  </>
                ) : (
                  <span>Run Cleanup ({stats?.filesToCleanup || 0} files)</span>
                )}
              </button>
            </div>
            <p className="text-sm text-slate-600 mt-3">
              Dry run shows what would be deleted without actually deleting files.
              Cleanup permanently removes files older than 3 days.
            </p>
          </div>

          {/* Dry Run Results */}
          {dryRunResult && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Dry Run Results</h3>
              <div className="space-y-2 text-sm text-blue-800">
                <p><strong>Message:</strong> {dryRunResult.message}</p>
                <p><strong>Files Processed:</strong> {dryRunResult.filesProcessed}</p>
                <p><strong>Files to Delete:</strong> {dryRunResult.filesDeleted}</p>
                <p><strong>Cutoff Date:</strong> {new Date(dryRunResult.cutoffDate).toLocaleString()}</p>
                {dryRunResult.errors && dryRunResult.errors.length > 0 && (
                  <div>
                    <strong>Errors:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {dryRunResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cleanup Results */}
          {cleanupResult && (
            <div className={`border rounded-xl p-6 mb-6 ${
              cleanupResult.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <h3 className={`text-lg font-semibold mb-3 ${
                cleanupResult.success ? 'text-green-900' : 'text-red-900'
              }`}>
                Cleanup Results
              </h3>
              <div className={`space-y-2 text-sm ${
                cleanupResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                <p><strong>Message:</strong> {cleanupResult.message}</p>
                <p><strong>Files Processed:</strong> {cleanupResult.filesProcessed}</p>
                <p><strong>Files Deleted:</strong> {cleanupResult.filesDeleted}</p>
                <p><strong>Cutoff Date:</strong> {new Date(cleanupResult.cutoffDate).toLocaleString()}</p>
                {cleanupResult.errors && cleanupResult.errors.length > 0 && (
                  <div>
                    <strong>Errors:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {cleanupResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Information */}
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">How It Works</h3>
            <div className="space-y-3 text-sm text-slate-700">
              <p>
                <strong>Automatic Cleanup:</strong> Files uploaded by agents are automatically tracked in the database with timestamps.
              </p>
              <p>
                <strong>30-Day Retention:</strong> Image files older than 30 days are identified for cleanup to save storage space.
              </p>
              <p>
                <strong>Safe Deletion:</strong> Both the file from Supabase storage and the database record are removed simultaneously.
              </p>
              <p>
                <strong>Manual Control:</strong> Use the dry run to preview what will be deleted before running the actual cleanup.
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}