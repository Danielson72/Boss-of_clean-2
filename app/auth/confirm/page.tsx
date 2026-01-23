'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function EmailConfirmPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get('token_hash');
    const type = params.get('type');

    // Handle token_hash verification (Supabase email verification link format)
    if (tokenHash && type === 'signup') {
      const supabase = createClient();
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'signup' })
        .then(async ({ data, error }) => {
          if (error) {
            setStatus('error');
            setMessage(error.message || 'Verification failed. The link may have expired.');
            return;
          }

          if (data.user) {
            setStatus('success');
            setMessage('Your email has been verified! Redirecting to your dashboard...');

            // Determine role for redirect
            const { data: userData } = await supabase
              .from('users')
              .select('role')
              .eq('id', data.user.id)
              .single();

            const role = userData?.role || 'customer';
            setTimeout(() => {
              router.push(`/dashboard/${role}`);
            }, 2000);
          }
        });
      return;
    }

    // Handle hash-based confirmation (legacy Supabase format)
    if (hash) {
      if (hash.includes('type=signup')) {
        setStatus('success');
        setMessage('Your email has been confirmed successfully!');
        // Redirect to dashboard - user session should already be established
        setTimeout(() => {
          router.push('/dashboard/customer');
        }, 2000);
      } else if (hash.includes('type=recovery')) {
        setStatus('success');
        setMessage('Password reset link verified. Redirecting...');
        setTimeout(() => {
          router.push('/auth/reset-password');
        }, 2000);
      } else if (hash.includes('error')) {
        setStatus('error');
        const errorDesc = decodeURIComponent(
          hash.match(/error_description=([^&]*)/)?.[1]?.replace(/\+/g, ' ') || ''
        );
        setMessage(errorDesc || 'There was an error confirming your email. The link may have expired.');
      } else {
        setStatus('error');
        setMessage('Invalid confirmation link.');
      }
      return;
    }

    // No hash or token_hash - invalid link
    setStatus('error');
    setMessage('Invalid or expired confirmation link.');
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
                href="/dashboard/customer"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700 transition duration-300"
              >
                Go to Dashboard
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

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Having trouble?{' '}
            <Link href="/contact" className="text-blue-600 hover:text-blue-700 font-medium">
              Contact our support team
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
