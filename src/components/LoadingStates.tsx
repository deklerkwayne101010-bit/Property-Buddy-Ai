'use client';

import { motion } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';

interface LoadingStatesProps {
  type: 'page' | 'section' | 'button' | 'inline' | 'skeleton';
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'pulse' | 'dots' | 'bars' | 'wave' | 'ring' | 'bounce';
  className?: string;
  progress?: number;
  showProgress?: boolean;
}

// Skeleton loading components
const SkeletonCard = ({ className = '' }: { className?: string }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
    </div>
  </div>
);

const SkeletonText = ({ lines = 3, className = '' }: { lines?: number; className?: string }) => (
  <div className={`animate-pulse space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className={`h-3 bg-gray-200 rounded ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
      />
    ))}
  </div>
);

const SkeletonAvatar = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse ${className}`}>
    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
  </div>
);

const SkeletonButton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse ${className}`}>
    <div className="h-10 bg-gray-200 rounded-lg"></div>
  </div>
);

// Page loading state
const PageLoading = ({ message = 'Loading...', size = 'lg' }: { message?: string; size?: 'sm' | 'md' | 'lg' }) => (
  <motion.div
    className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    <div className="text-center">
      <LoadingSpinner
        size={size}
        variant="ring"
        color="blue"
        message={message}
      />
    </div>
  </motion.div>
);

// Section loading state
const SectionLoading = ({
  message = 'Loading...',
  size = 'md',
  className = ''
}: {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) => (
  <motion.div
    className={`flex items-center justify-center py-12 ${className}`}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <LoadingSpinner
      size={size}
      variant="wave"
      color="blue"
      message={message}
    />
  </motion.div>
);

// Button loading state
const ButtonLoading = ({
  message,
  size = 'sm',
  className = ''
}: {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) => (
  <div className={`flex items-center space-x-2 ${className}`}>
    <LoadingSpinner
      size={size}
      variant="dots"
      color="gray"
    />
    {message && <span className="text-sm text-gray-600">{message}</span>}
  </div>
);

// Inline loading state
const InlineLoading = ({
  message,
  size = 'sm',
  className = ''
}: {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) => (
  <div className={`inline-flex items-center space-x-2 ${className}`}>
    <LoadingSpinner
      size={size}
      variant="pulse"
      color="blue"
    />
    {message && <span className="text-sm text-gray-600">{message}</span>}
  </div>
);

// Skeleton loading state
const SkeletonLoading = ({
  variant = 'card',
  count = 1,
  className = ''
}: {
  variant?: 'card' | 'text' | 'avatar' | 'button' | 'property-card' | 'lead-row' | 'result-card';
  count?: number;
  className?: string;
}) => {
  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return <SkeletonCard className={className} />;
      case 'text':
        return <SkeletonText className={className} />;
      case 'avatar':
        return <SkeletonAvatar className={className} />;
      case 'button':
        return <SkeletonButton className={className} />;
      case 'property-card':
        return (
          <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
            <div className="animate-pulse">
              <div className="h-48 bg-gray-200"></div>
              <div className="p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        );
      case 'lead-row':
        return (
          <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}>
            <div className="animate-pulse flex items-center space-x-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
        );
      case 'result-card':
        return (
          <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
            <div className="animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                <div className="h-3 bg-gray-200 rounded w-4/6"></div>
              </div>
            </div>
          </div>
        );
      default:
        return <SkeletonCard className={className} />;
    }
  };

  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>
          {renderSkeleton()}
        </div>
      ))}
    </div>
  );
};

export default function LoadingStates({
  type,
  message,
  size = 'md',
  variant = 'default',
  className = '',
  progress,
  showProgress = false
}: LoadingStatesProps) {
  switch (type) {
    case 'page':
      return <PageLoading message={message} size={size} />;

    case 'section':
      return <SectionLoading message={message} size={size} className={className} />;

    case 'button':
      return <ButtonLoading message={message} size={size} className={className} />;

    case 'inline':
      return <InlineLoading message={message} size={size} className={className} />;

    case 'skeleton':
      return <SkeletonLoading variant={variant as any} className={className} />;

    default:
      return (
        <LoadingSpinner
          size={size}
          variant={variant}
          message={message}
          progress={progress}
          showProgress={showProgress}
          className={className}
        />
      );
  }
}

// Export individual components for direct use
export {
  PageLoading,
  SectionLoading,
  ButtonLoading,
  InlineLoading,
  SkeletonLoading,
  SkeletonCard,
  SkeletonText,
  SkeletonAvatar,
  SkeletonButton
};