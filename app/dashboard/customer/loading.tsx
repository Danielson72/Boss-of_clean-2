import { Skeleton } from '@/components/ui/skeleton';

function QuoteCardSkeleton() {
  return (
    <div className="border rounded-lg p-6">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-36" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-36" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </div>
        </div>
        <Skeleton className="h-9 w-28 rounded-md ml-4" />
      </div>
    </div>
  );
}

export default function CustomerDashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header skeleton */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Skeleton className="h-7 w-52" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-10 w-32 rounded-md" />
              <Skeleton className="h-6 w-6 rounded" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats overview skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-7 w-10" />
                </div>
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Tabs skeleton */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b">
            <div className="flex gap-2 px-2">
              <Skeleton className="h-10 w-32 my-1" />
              <Skeleton className="h-10 w-24 my-1" />
            </div>
          </div>

          {/* Quote cards skeleton */}
          <div className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <QuoteCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
