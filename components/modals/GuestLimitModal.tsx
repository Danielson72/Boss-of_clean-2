'use client';

import { X, AlertCircle, UserPlus, Mail } from 'lucide-react';
import { CustomerLimitError } from '@/lib/quoteClient';

interface GuestLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitData: CustomerLimitError;
}

export default function GuestLimitModal({
  isOpen,
  onClose,
  limitData,
}: GuestLimitModalProps) {
  if (!isOpen) return null;

  const { reason, daily, monthly, action } = limitData;

  const isDailyLimit = reason === 'daily_limit_exceeded';
  const isMonthlyLimit = reason === 'monthly_limit_exceeded';

  const getTitle = () => {
    if (isDailyLimit) return 'Daily Quote Limit Reached';
    if (isMonthlyLimit) return 'Monthly Quote Limit Reached';
    return 'Quote Limit Reached';
  };

  const getMessage = () => {
    if (isDailyLimit) {
      return `You've submitted ${daily} quote requests today (daily limit: 3 for guests).`;
    }
    if (isMonthlyLimit) {
      return `You've submitted ${monthly} quote requests this month (monthly limit: 10 for guests).`;
    }
    return 'You have reached your quote request limit.';
  };

  const getActionButton = () => {
    if (action === 'signup_for_unlimited') {
      return {
        text: 'Sign Up for Unlimited Quotes',
        icon: <UserPlus className="w-5 h-5" />,
        href: '/signup',
        description: 'Create a free account to remove all limits and get priority responses.',
      };
    }

    if (action === 'verify_email_for_unlimited') {
      return {
        text: 'Verify Email for Unlimited',
        icon: <Mail className="w-5 h-5" />,
        href: '/verify-email',
        description: 'Verify your email address to unlock unlimited quote requests.',
      };
    }

    return {
      text: 'Contact Support',
      icon: <Mail className="w-5 h-5" />,
      href: '/contact',
      description: 'Need help? Contact our support team for assistance.',
    };
  };

  const actionButton = getActionButton();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-full">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {getTitle()}
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
          <p className="text-gray-600">{getMessage()}</p>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">{actionButton.description}</p>
          </div>

          {/* Current Usage Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{daily}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                Today
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{monthly}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                This Month
              </div>
            </div>
          </div>

          {/* Benefits List */}
          {action === 'signup_for_unlimited' && (
            <div className="pt-4 border-t">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                With a free account you get:
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                  Unlimited quote requests
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                  Priority professional responses
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                  Save favorite cleaners
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                  Track quote history
                </li>
              </ul>
            </div>
          )}
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
            href={actionButton.href}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {actionButton.icon}
            {action === 'signup_for_unlimited' ? 'Sign Up Free' : actionButton.text}
          </a>
        </div>
      </div>
    </div>
  );
}
