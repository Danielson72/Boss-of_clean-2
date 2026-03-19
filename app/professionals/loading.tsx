import { Skeleton } from '@/components/ui/skeleton';

export default function ProfessionalsLoading() {
  return (
    <div className="min-h-screen bg-brand-cream">
      {/* Hero skeleton */}
      <div className="bg-brand-dark py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Skeleton className="h-12 w-96 mx-auto mb-4 bg-white/10" />
          <Skeleton className="h-6 w-[32rem] mx-auto mb-8 bg-white/10" />
          <div className="flex justify-center gap-4">
            <Skeleton className="h-12 w-40 rounded-lg bg-white/10" />
            <Skeleton className="h-12 w-48 rounded-lg bg-white/10" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter pills skeleton */}
        <div className="flex gap-2 mb-6 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-32 rounded-full flex-shrink-0" />
          ))}
        </div>

        {/* Sort bar skeleton */}
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-5 w-40" />
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
            >
              <div className="h-48 bg-gray-100 animate-pulse" />
              <div className="p-5 space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="flex gap-1.5">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-9 w-28 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
