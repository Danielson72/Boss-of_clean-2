'use client';

import ErrorDisplay from '@/components/ErrorDisplay';

export default function AdminDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorDisplay
      error={error}
      reset={reset}
      title="Admin dashboard error"
      backHref="/dashboard/admin"
      backLabel="Back to admin"
    />
  );
}
