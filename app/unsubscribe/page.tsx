'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type NotificationType = 'booking_updates' | 'messages' | 'promotions' | 'review_requests';

const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  booking_updates: 'Booking Updates',
  messages: 'Messages',
  promotions: 'Promotions & Offers',
  review_requests: 'Review Requests',
};

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') ?? null;
  const type = (searchParams?.get('type') ?? null) as NotificationType | null;

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already'>('loading');
  const [message, setMessage] = useState('');
  const [currentType, setCurrentType] = useState<NotificationType | null>(type);

  useEffect(() => {
    if (token && type) {
      handleUnsubscribe();
    } else if (!token) {
      setStatus('error');
      setMessage('Invalid unsubscribe link. Please use the link from your email.');
    } else if (!type) {
      setStatus('error');
      setMessage('Missing notification type. Please use the link from your email.');
    }
  }, [token, type]);

  const handleUnsubscribe = async () => {
    try {
      // First check if already unsubscribed
      const checkRes = await fetch(`/api/unsubscribe?token=${token}&type=${type}`);
      if (!checkRes.ok) {
        throw new Error('Invalid link');
      }
      const checkData = await checkRes.json();

      if (type && checkData[type] === false) {
        setStatus('already');
        setMessage(`You are already unsubscribed from ${NOTIFICATION_LABELS[type]} notifications.`);
        setCurrentType(type);
        return;
      }

      // Proceed with unsubscribe
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, type, enabled: false }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to unsubscribe');
      }

      setStatus('success');
      setMessage(data.message);
      setCurrentType(type);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again later.');
    }
  };

  const handleResubscribe = async () => {
    if (!token || !currentType) return;

    try {
      setStatus('loading');
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, type: currentType, enabled: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to resubscribe');
      }

      setStatus('success');
      setMessage(data.message);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again later.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Logo */}
        <div className="mb-6">
          <Link href="/" className="inline-block">
            <div className="flex items-center justify-center gap-2">
              <Mail className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">Boss of Clean</span>
            </div>
          </Link>
        </div>

        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Processing...</h1>
            <p className="text-gray-600">Please wait while we update your preferences.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Done!</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            {currentType && (
              <button
                onClick={handleResubscribe}
                className="text-blue-600 hover:text-blue-700 underline text-sm"
              >
                Changed your mind? Click here to resubscribe
              </button>
            )}
          </>
        )}

        {status === 'already' && (
          <>
            <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Already Unsubscribed</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={handleResubscribe}
              className="text-blue-600 hover:text-blue-700 underline text-sm"
            >
              Want to receive these emails again? Click here to resubscribe
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Oops!</h1>
            <p className="text-gray-600 mb-6">{message}</p>
          </>
        )}

        {/* Footer links */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
            <Link
              href="/"
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
            <Link
              href="/dashboard/customer/notifications"
              className="text-blue-600 hover:text-blue-700 transition-colors"
            >
              Manage All Preferences
            </Link>
          </div>
        </div>
      </div>

      <p className="mt-6 text-sm text-gray-500 text-center max-w-md">
        If you did not expect to receive this email or have concerns, please{' '}
        <Link href="/contact" className="text-blue-600 hover:underline">
          contact us
        </Link>
        .
      </p>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
