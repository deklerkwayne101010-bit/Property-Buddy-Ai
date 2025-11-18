'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingStates from './LoadingStates';

export default function CreditBalance() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchCredits();
    }
  }, [user]);

  const fetchCredits = async () => {
    try {
      const response = await fetch(`/api/credits?userId=${user?.id}`);
      const data = await response.json();

      if (response.ok) {
        setCredits(data.credits);
        setError(null);
      } else {
        console.error('Failed to fetch credits:', data.error);
        setError(data.error || 'Failed to fetch credits');
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
      setError('Network error while fetching credits');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-full">
      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
        <span className="text-white text-xs font-bold">💰</span>
      </div>
      <div className="flex items-center space-x-1">
        {loading ? (
          <LoadingStates type="inline" message="Loading..." size="sm" />
        ) : error ? (
          <span className="text-red-600 font-semibold text-sm">Error</span>
        ) : (
          <>
            <span className={`font-semibold text-sm ${credits !== null && credits < 10 ? 'text-red-600' : 'text-blue-800'}`}>
              {credits !== null ? credits : 0}
            </span>
            <span className="text-blue-600 text-xs">credits</span>
            {credits !== null && credits < 10 && (
              <span className="text-red-500 text-xs ml-1">⚠️</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}