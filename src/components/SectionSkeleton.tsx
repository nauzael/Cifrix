import React from 'react';

interface SectionSkeletonProps {
  height?: string;
  className?: string;
  'aria-label'?: string;
}

/**
 * SectionSkeleton - Loading skeleton for lazy-loaded sections
 * Used as a fallback while the actual component loads
 */
export const SectionSkeleton: React.FC<SectionSkeletonProps> = ({
  height = 'h-64',
  className = '',
  'aria-label': ariaLabel = 'Cargando contenido...',
}) => {
  return (
    <section
      data-testid="skeleton-section"
      aria-label={ariaLabel}
      className={`relative py-8 sm:py-12 lg:py-16 bg-slate-50 dark:bg-slate-900 ${className}`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Animated shimmer effect */}
          <div className="animate-pulse space-y-6">
            {/* Header skeleton */}
            <div className="flex flex-col items-center gap-4">
              <div className={`w-3/4 h-8 ${height} bg-slate-200 dark:bg-slate-700 rounded-lg`} />
              <div className="w-1/2 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>

            {/* Content skeleton - cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <div className="flex-1 space-y-2">
                      <div className="w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                      <div className="w-24 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="w-full h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="w-5/6 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="w-4/6 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                  </div>
                </div>
              ))}
            </div>

            {/* Additional content skeleton */}
            <div className="space-y-4">
              <div className="w-full h-4 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="w-5/6 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/**
 * CardSkeleton - Loading skeleton for individual cards
 */
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      data-testid="skeleton-card"
      className={`bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md animate-pulse ${className}`}
    >
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="flex-1 space-y-2">
          <div className="w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="w-24 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="w-full h-4 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="w-5/6 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="w-4/6 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
    </div>
  );
};

/**
 * Spinner - Simple loading spinner
 */
export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div
      data-testid="spinner"
      className={`animate-spin rounded-full border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Cargando..."
    >
      <span className="sr-only">Cargando...</span>
    </div>
  );
};

export default SectionSkeleton;
