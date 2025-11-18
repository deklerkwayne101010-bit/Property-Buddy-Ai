'use client';

import { motion } from 'framer-motion';
import { spin, pulse } from './animations';

interface LoadingSpinnerProps {
   size?: 'sm' | 'md' | 'lg' | 'xl';
   variant?: 'default' | 'pulse' | 'dots' | 'bars' | 'wave' | 'ring' | 'bounce';
   color?: 'blue' | 'purple' | 'green' | 'gray';
   className?: string;
   message?: string;
   progress?: number; // 0-100 for progress bars
   showProgress?: boolean;
}

export default function LoadingSpinner({
   size = 'md',
   variant = 'default',
   color = 'blue',
   className = '',
   message,
   progress,
   showProgress = false
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colorClasses = {
    blue: 'border-blue-600',
    purple: 'border-purple-600',
    green: 'border-green-600',
    gray: 'border-gray-600'
  };

  const renderSpinner = () => {
    switch (variant) {
      case 'pulse':
        return (
          <motion.div
            {...pulse}
            className={`rounded-full ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
          />
        );

      case 'dots':
        return (
          <div className={`flex space-x-1 ${className}`}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={`w-2 h-2 rounded-full ${colorClasses[color].replace('border-', 'bg-')}`}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
              />
            ))}
          </div>
        );

      case 'bars':
        return (
          <div className={`flex space-x-1 items-end ${className}`}>
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className={`w-1 ${colorClasses[color].replace('border-', 'bg-')}`}
                animate={{
                  height: ['8px', '24px', '8px']
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.1
                }}
              />
            ))}
          </div>
        );

      case 'wave':
        return (
          <div className={`flex space-x-1 items-end ${className}`}>
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className={`w-1 ${colorClasses[color].replace('border-', 'bg-')}`}
                animate={{
                  height: ['4px', '16px', '4px']
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: 'easeInOut'
                }}
              />
            ))}
          </div>
        );

      case 'ring':
        return (
          <div className={`relative ${sizeClasses[size]} ${className}`}>
            <motion.div
              className={`absolute inset-0 border-2 border-transparent ${colorClasses[color]} rounded-full`}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className={`absolute inset-2 border-2 border-transparent ${colorClasses[color]} rounded-full`}
              animate={{ rotate: -360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        );

      case 'bounce':
        return (
          <div className={`flex space-x-1 ${className}`}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={`w-2 h-2 rounded-full ${colorClasses[color].replace('border-', 'bg-')}`}
                animate={{
                  y: [0, -8, 0]
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: 'easeInOut'
                }}
              />
            ))}
          </div>
        );

      default:
        return (
          <motion.div
            {...spin}
            className={`border-2 border-gray-300 border-t-current rounded-full ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
          />
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      {renderSpinner()}
      {message && (
        <p className="text-sm text-gray-600 animate-pulse text-center">{message}</p>
      )}
      {showProgress && progress !== undefined && (
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className={`h-2 rounded-full ${colorClasses[color].replace('border-', 'bg-')}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}