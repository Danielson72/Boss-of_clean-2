'use client';

import ErrorDisplay from '@/components/ErrorDisplay';

export default function RootError({
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
      title="Something went wrong"
      backHref="/"
      backLabel="Go home"
    />
  );
}
