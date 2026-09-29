'use client';

import { X, TrendingUp, MessageCircle, Search } from 'lucide-react';
import { CleanerCapacityError } from '@/lib/quoteClient';

interface CleanerCapacityModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorData: CleanerCapacityError;
  cleanerName?: string;
}

export default function CleanerCapacityModal({
  isOpen,
  onClose,
  errorData,
  cleanerName = 'This professional',
}: CleanerCapacityModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Professional At Capacity
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-gray-600">{errorData.message}</p>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>{cleanerName}</strong> is currently at their maximum monthly quote capacity.
              This means they&apos;re in high demand!
            </p>
          </div>

          {/* What to do next */}
          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              What you can do:
            </h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Search className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    Find Another Professional
                  </h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Browse other highly-rated cleaners in your area who can help right away.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    Contact Them Directly
                  </h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Call or email the professional directly to discuss availability.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Why this happens */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>Why does this happen?</strong> Professionals set monthly quote limits
              based on their capacity to ensure quality service. High-demand cleaners
              often reach their limits quickly.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <a
            href="/search"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Search className="w-4 h-4" />
            Find Other Cleaners
          </a>
        </div>
      </div>
    </div>
  );
}
