'use client';

import { motion } from 'framer-motion';
import { pulse } from './animations';

interface SkeletonLoaderProps {
  variant?: 'card' | 'text' | 'avatar' | 'button' | 'property-card' | 'lead-row' | 'result-card';
  lines?: number;
  className?: string;
}

export default function SkeletonLoader({
  variant = 'text',
  lines = 1,
  className = ''
}: SkeletonLoaderProps) {
  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return (
          <div className={`bg-white rounded-lg shadow-sm border p-4 space-y-3 ${className}`}>
            <motion.div
              {...pulse}
              className="h-4 bg-gray-200 rounded w-3/4"
            />
            <motion.div
              {...pulse}
              className="h-3 bg-gray-200 rounded w-1/2"
            />
            <motion.div
              {...pulse}
              className="h-3 bg-gray-200 rounded w-2/3"
            />
          </div>
        );

      case 'property-card':
        return (
          <div className={`bg-white rounded-xl shadow-soft border border-neutral-200 overflow-hidden ${className}`}>
            <motion.div
              {...pulse}
              className="h-48 bg-gray-200"
            />
            <div className="p-4 space-y-3">
              <motion.div
                {...pulse}
                className="h-5 bg-gray-200 rounded w-3/4"
              />
              <motion.div
                {...pulse}
                className="h-4 bg-gray-200 rounded w-1/2"
              />
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="text-center space-y-1">
                    <motion.div
                      {...pulse}
                      className="h-4 bg-gray-200 rounded w-full"
                    />
                    <motion.div
                      {...pulse}
                      className="h-3 bg-gray-200 rounded w-2/3 mx-auto"
                    />
                  </div>
                ))}
              </div>
              <motion.div
                {...pulse}
                className="h-4 bg-gray-200 rounded w-1/3"
              />
            </div>
          </div>
        );

      case 'result-card':
        return (
          <div className={`bg-white rounded-lg shadow-sm border p-4 space-y-3 ${className}`}>
            <div className="flex items-center space-x-2">
              <motion.div
                {...pulse}
                className="h-4 w-16 bg-gray-200 rounded"
              />
              <motion.div
                {...pulse}
                className="h-4 w-12 bg-gray-200 rounded"
              />
              <motion.div
                {...pulse}
                className="h-4 w-14 bg-gray-200 rounded"
              />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <motion.div
                  key={i}
                  {...pulse}
                  className="h-3 bg-gray-200 rounded"
                  style={{ width: `${Math.random() * 40 + 60}%` }}
                />
              ))}
            </div>
            <div className="flex space-x-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <motion.div
                  key={i}
                  {...pulse}
                  className="h-6 w-12 bg-gray-200 rounded"
                />
              ))}
            </div>
          </div>
        );

      case 'lead-row':
        return (
          <div className={`flex items-center space-x-4 p-4 ${className}`}>
            <motion.div
              {...pulse}
              className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0"
            />
            <div className="flex-1 space-y-2">
              <motion.div
                {...pulse}
                className="h-4 bg-gray-200 rounded w-1/3"
              />
              <motion.div
                {...pulse}
                className="h-3 bg-gray-200 rounded w-1/4"
              />
            </div>
            <motion.div
              {...pulse}
              className="h-4 w-20 bg-gray-200 rounded"
            />
            <motion.div
              {...pulse}
              className="h-6 w-16 bg-gray-200 rounded-full"
            />
          </div>
        );

      case 'avatar':
        return (
          <motion.div
            {...pulse}
            className={`bg-gray-200 rounded-full ${className}`}
          />
        );

      case 'button':
        return (
          <motion.div
            {...pulse}
            className={`bg-gray-200 rounded ${className}`}
          />
        );

      case 'text':
      default:
        return (
          <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
              <motion.div
                key={i}
                {...pulse}
                className="h-4 bg-gray-200 rounded"
                style={{ width: i === lines - 1 ? '60%' : '100%' }}
              />
            ))}
          </div>
        );
    }
  };

  return renderSkeleton();
}

// Grid skeleton for multiple items
interface SkeletonGridProps {
  variant: 'property-card' | 'result-card' | 'lead-row';
  count?: number;
  columns?: number;
  className?: string;
}

export function SkeletonGrid({
  variant,
  count = 6,
  columns = 3,
  className = ''
}: SkeletonGridProps) {
  return (
    <div className={`grid gap-4 ${className}`} style={{
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonLoader key={i} variant={variant} />
      ))}
    </div>
  );
}