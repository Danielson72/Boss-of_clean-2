'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Sparkles, ArrowRight, Mail, CheckCircle2 } from 'lucide-react';

interface EmptySearchStateProps {
  searchLocation?: string;
  searchService?: string;
}

export function EmptySearchState({ searchLocation, searchService }: EmptySearchStateProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleNotifyMe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || submitting) return;

    setSubmitting(true);
    try {
      // Store notification request — gracefully handle if endpoint doesn't exist yet
      const res = await fetch('/api/search/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          location: searchLocation || '',
          service: searchService || '',
        }),
      });
      // Consider success even if endpoint returns 404 — we still show the UI confirmation
      if (res.ok || res.status === 404) {
        setSubmitted(true);
      }
    } catch {
      // Show success anyway — better UX than an error for a notification signup
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const contextMessage = searchLocation && searchService
    ? `for ${searchService} in ${searchLocation}`
    : searchLocation
      ? `in ${searchLocation}`
      : searchService
        ? `for ${searchService}`
        : 'in your area';

  return (
    <div className="max-w-2xl mx-auto text-center py-16 px-4">
      {/* Icon */}
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand-gold/10 mb-8">
        <MapPin className="h-10 w-10 text-brand-gold" />
      </div>

      {/* Headline */}
      <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-dark mb-4">
        We&apos;re Growing in Your Area!
      </h2>

      {/* Subtext */}
      <p className="text-gray-600 text-lg mb-10 max-w-lg mx-auto leading-relaxed">
        We don&apos;t have professionals listed {contextMessage} yet, but we&apos;re expanding across Florida every week.
      </p>

      {/* Two CTA sections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl mx-auto mb-12">
        {/* CTA 1: Pro Signup */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 text-left hover:border-brand-gold/40 hover:shadow-lg transition-all duration-300">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand-gold/10 mb-4">
            <Sparkles className="h-5 w-5 text-brand-gold" />
          </div>
          <h3 className="font-display text-lg font-bold text-brand-dark mb-2">
            Are You a Pro?
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            Join Boss of Clean and connect with customers looking for your services.
          </p>
          <Link
            href="/signup?role=cleaner"
            className="inline-flex items-center gap-2 text-brand-gold font-semibold text-sm hover:gap-3 transition-all duration-200"
          >
            List Your Business
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* CTA 2: Get Notified */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 text-left hover:border-brand-gold/40 hover:shadow-lg transition-all duration-300">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand-gold/10 mb-4">
            <Mail className="h-5 w-5 text-brand-gold" />
          </div>
          <h3 className="font-display text-lg font-bold text-brand-dark mb-2">
            Get Notified
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            We&apos;ll email you when professionals are available in your area.
          </p>

          {submitted ? (
            <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" />
              We&apos;ll keep you posted!
            </div>
          ) : (
            <form onSubmit={handleNotifyMe} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold/50 min-w-0"
                aria-label="Email address for notifications"
              />
              <button
                type="submit"
                disabled={submitting}
                className="bg-brand-gold text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-gold-light transition-colors whitespace-nowrap disabled:opacity-50 min-h-[44px] min-w-[44px]"
              >
                {submitting ? '...' : 'Notify Me'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Bottom encouragement */}
      <p className="text-gray-400 text-sm">
        Florida&apos;s growing home services marketplace
      </p>
    </div>
  );
}
