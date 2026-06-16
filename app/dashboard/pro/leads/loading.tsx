import { Skeleton } from '@/components/ui/skeleton';

export default function HiredLeadsLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header skeleton */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6 gap-4">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-72" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Lead card skeletons */}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm p-5 sm:p-6 border-l-4 border-gray-200">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-10 w-full lg:w-64 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
