'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function EmailConfirmPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Check if we're on the client side and have access to window
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      
      if (hash && hash.includes('type=signup')) {
        // Email confirmation successful
        setStatus('success');
        setMessage('Your email has been confirmed successfully!');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else if (hash && hash.includes('type=recovery')) {
        // Password recovery link
        setStatus('success');
        setMessage('Password reset link verified. Redirecting...');
        
        // Redirect to password reset page
        setTimeout(() => {
          router.push('/auth/reset-password');
        }, 2000);
      } else if (hash && hash.includes('error')) {
        // Error in confirmation
        setStatus('error');
        setMessage('There was an error confirming your email. Please try again or contact support.');
      } else {
        // No hash or unrecognized type
        setStatus('error');
        setMessage('Invalid confirmation link.');
      }
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {status === 'loading' && (
            <div className="text-center">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Confirming Your Email
              </h2>
              <p className="text-gray-600">
                Please wait while we verify your email address...
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="rounded-full bg-green-100 p-3 mx-auto w-fit mb-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Email Confirmed!
              </h2>
              <p className="text-gray-600 mb-6">
                {message}
              </p>
              <Link
                href="/login"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700 transition duration-300"
              >
                Continue to Login
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="rounded-full bg-red-100 p-3 mx-auto w-fit mb-4">
                <AlertCircle className="h-12 w-12 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Confirmation Error
              </h2>
              <p className="text-gray-600 mb-6">
                {message}
              </p>
              <div className="space-y-3">
                <Link
                  href="/signup"
                  className="block bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700 transition duration-300 text-center"
                >
                  Back to Sign Up
                </Link>
                <Link
                  href="/contact"
                  className="block text-blue-600 hover:text-blue-700 font-medium"
                >
                  Contact Support
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Additional Information */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Having trouble? {' '}
            <Link href="/contact" className="text-blue-600 hover:text-blue-700 font-medium">
              Contact our support team
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}