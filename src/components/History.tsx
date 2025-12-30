'use client';

import { useState, useEffect, useCallback } from 'react';

interface HistoryItem {
  id: string;
  timestamp: string;
  propertyTitle: string;
  prompt: string;
  selectedVariant: number;
  tone: string;
  platforms: string[];
  results: { [platform: string]: string[] };
  feedback?: {
    rating: number;
    comments?: string;
  };
}

interface AnalyticsData {
  totalGenerations: number;
  mostUsedTone: string;
  bestPerformingVariant: string;
  usageStats: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export default function History() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTone, setFilterTone] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [activeView, setActiveView] = useState<'history' | 'analytics'>('history');

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    filterAndSortHistory();
  }, [history, searchTerm, filterTone, filterPlatform, sortBy]);

  const loadHistory = () => {
    const stored = localStorage.getItem('property-description-history');
    if (stored) {
      const parsedHistory = JSON.parse(stored);
      setHistory(parsedHistory);
      calculateAnalytics(parsedHistory);
    }
  };

  const calculateAnalytics = (historyData: HistoryItem[]) => {
    if (historyData.length === 0) {
      setAnalytics(null);
      return;
    }

    const totalGenerations = historyData.length;

    // Most used tone
    const toneCounts = historyData.reduce((acc, item) => {
      acc[item.tone] = (acc[item.tone] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const mostUsedTone = Object.entries(toneCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

    // Best performing variant (based on feedback ratings)
    const variantPerformance = historyData.reduce((acc, item) => {
      if (item.feedback?.rating) {
        const key = `${item.tone}-${item.selectedVariant}`;
        if (!acc[key]) acc[key] = { total: 0, count: 0 };
        acc[key].total += item.feedback.rating;
        acc[key].count += 1;
      }
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    const bestVariant = Object.entries(variantPerformance)
      .sort(([,a], [,b]) => (b.total / b.count) - (a.total / a.count))[0]?.[0] || 'N/A';

    // Usage stats
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const usageStats = {
      daily: historyData.filter(item => new Date(item.timestamp) >= today).length,
      weekly: historyData.filter(item => new Date(item.timestamp) >= weekAgo).length,
      monthly: historyData.filter(item => new Date(item.timestamp) >= monthAgo).length,
    };

    setAnalytics({
      totalGenerations,
      mostUsedTone,
      bestPerformingVariant: bestVariant,
      usageStats,
    });
  };

  const filterAndSortHistory = useCallback(() => {
    const filtered = history.filter(item => {
      const matchesSearch = searchTerm === '' ||
        item.propertyTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.prompt.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTone = filterTone === '' || item.tone === filterTone;
      const matchesPlatform = filterPlatform === '' || item.platforms.includes(filterPlatform);

      return matchesSearch && matchesTone && matchesPlatform;
    });

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return sortBy === 'newest' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
    });

    setFilteredHistory(sorted);
  }, [history, searchTerm, filterTone, filterPlatform, sortBy]);

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getUniqueTones = () => {
    return Array.from(new Set(history.map(item => item.tone)));
  };

  const getUniquePlatforms = () => {
    const allPlatforms = history.flatMap(item => item.platforms);
    return Array.from(new Set(allPlatforms));
  };

  const handleDeleteItem = (id: string) => {
    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('property-description-history', JSON.stringify(updatedHistory));
    calculateAnalytics(updatedHistory);
  };

  const handleFeedbackUpdate = (id: string, feedback: { rating: number; comments?: string }) => {
    const updatedHistory = history.map(item =>
      item.id === id ? { ...item, feedback } : item
    );
    setHistory(updatedHistory);
    localStorage.setItem('property-description-history', JSON.stringify(updatedHistory));
    calculateAnalytics(updatedHistory);
  };

  return (
    <div className="p-8">
      {/* View Toggle */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveView('history')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              activeView === 'history'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setActiveView('analytics')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              activeView === 'analytics'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Analytics
          </button>
        </div>
      </div>

      {activeView === 'history' ? (
        <>
          {/* Filters and Search */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-64">
                <input
                  type="text"
                  placeholder="Search by property title or prompt..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={filterTone}
                onChange={(e) => setFilterTone(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Tones</option>
                {getUniqueTones().map(tone => (
                  <option key={tone} value={tone}>{tone}</option>
                ))}
              </select>
              <select
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Platforms</option>
                {getUniquePlatforms().map(platform => (
                  <option key={platform} value={platform}>{platform}</option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          {/* History List */}
          <div className="space-y-4">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {history.length === 0 ? 'No history yet' : 'No results found'}
                </h3>
                <p className="text-gray-500">
                  {history.length === 0
                    ? 'Your generated descriptions will appear here.'
                    : 'Try adjusting your search or filters.'
                  }
                </p>
              </div>
            ) : (
              filteredHistory.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{item.propertyTitle}</h3>
                      <p className="text-sm text-gray-500">{formatDate(item.timestamp)}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                        {item.tone}
                      </span>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2"><strong>Prompt:</strong> {item.prompt}</p>
                    <p className="text-sm text-gray-600 mb-2"><strong>Selected Variant:</strong> {item.selectedVariant + 1}</p>
                    <p className="text-sm text-gray-600"><strong>Platforms:</strong> {item.platforms.join(', ')}</p>
                  </div>

                  {/* Results Preview */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Generated Results:</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {Object.entries(item.results).map(([platform, variants]) => (
                        <div key={platform} className="text-xs text-gray-600">
                          <strong>{platform}:</strong> {variants[item.selectedVariant]?.substring(0, 100)}...
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Feedback */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">CRM Feedback:</h4>
                    {item.feedback ? (
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => handleFeedbackUpdate(item.id, { ...(item.feedback || {}), rating: star })}
                              className={`w-4 h-4 ${star <= (item.feedback?.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        {item.feedback.comments && (
                          <span className="text-sm text-gray-600">{item.feedback.comments}</span>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleFeedbackUpdate(item.id, { rating: 5 })}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Add feedback
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        /* Analytics View */
        <div className="space-y-6">
          {analytics ? (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Generations</h3>
                  <p className="text-3xl font-bold text-blue-600">{analytics.totalGenerations}</p>
                </div>
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Most Used Tone</h3>
                  <p className="text-xl font-semibold text-green-600">{analytics.mostUsedTone}</p>
                </div>
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Best Performing Variant</h3>
                  <p className="text-lg font-semibold text-purple-600">{analytics.bestPerformingVariant}</p>
                </div>
              </div>

              {/* Usage Stats */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Statistics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{analytics.usageStats.daily}</p>
                    <p className="text-sm text-gray-600">Today</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{analytics.usageStats.weekly}</p>
                    <p className="text-sm text-gray-600">This Week</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{analytics.usageStats.monthly}</p>
                    <p className="text-sm text-gray-600">This Month</p>
                  </div>
                </div>
              </div>

              {/* Charts Placeholder */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p>Charts will be implemented with a charting library</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No analytics data yet</h3>
              <p className="text-gray-500">Generate some descriptions to see analytics.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}