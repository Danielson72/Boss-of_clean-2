'use client';

import { Check } from 'lucide-react';

// Honest, live quote status — computed only from the request's own real state.
// No invented "sent to N pros" count (that fan-out data isn't captured today),
// and no fabricated response-time promise. Shows nothing extra when thin.

export type QuoteStatus = 'pending' | 'responded' | 'accepted' | 'completed' | 'cancelled';

const STEPS = ['Submitted', 'Pro responded', 'Accepted'] as const;

function currentStep(status: QuoteStatus): number {
  switch (status) {
    case 'accepted':
    case 'completed':
      return 2;
    case 'responded':
      return 1;
    default:
      return 0; // pending
  }
}

const EXPECTATION: Record<Exclude<QuoteStatus, 'cancelled'>, string> = {
  pending: 'Your request is live with local pros. As they respond, quotes appear here and in your email.',
  responded: 'A pro sent you a quote below — review it and accept when you’re ready.',
  accepted: 'You accepted this quote. Arrange the work and payment directly with your pro.',
  completed: 'This job is marked complete.',
};

export function QuoteStatusTracker({
  status,
  hasResponse,
}: {
  status: QuoteStatus;
  /** True when at least one real pro response exists on this request. */
  hasResponse: boolean;
}) {
  if (status === 'cancelled') return null;
  const active = currentStep(status);

  return (
    <div className="mb-4 rounded-lg bg-gray-50 border border-gray-100 p-4">
      {/* Stepper */}
      <ol className="flex items-center">
        {STEPS.map((label, i) => {
          const done = i < active;
          const isCurrent = i === active;
          return (
            <li key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center text-center">
                <span
                  className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                    done || isCurrent ? 'bg-brand-gold text-white' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {done ? <Check className="w-4 h-4" /> : i + 1}
                </span>
                <span
                  className={`mt-1.5 text-xs whitespace-nowrap ${
                    done || isCurrent ? 'text-brand-dark font-medium' : 'text-gray-400'
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <span className={`flex-1 h-0.5 mx-2 -mt-5 ${i < active ? 'bg-brand-gold' : 'bg-gray-200'}`} />
              )}
            </li>
          );
        })}
      </ol>

      {/* Factual live line */}
      <p className="mt-3 text-sm text-gray-600">
        {hasResponse && status !== 'pending' && (
          <span className="font-medium text-brand-dark">1 pro responded. </span>
        )}
        {EXPECTATION[status]}
      </p>
    </div>
  );
}
