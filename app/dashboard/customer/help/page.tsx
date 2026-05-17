'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { createClient } from '@/lib/supabase/client';
import {
  HelpCircle, ChevronDown, Mail, MessageSquare, CheckCircle, XCircle,
  Loader2, Phone, Send, Clock
} from 'lucide-react';

interface ContactSubmission {
  id: string;
  subject: string;
  message: string;
  created_at: string;
  is_read?: boolean | null;
}

const customerFaqs = [
  {
    q: 'How do I find a cleaner?',
    a: 'Go to the Search page, enter your ZIP code, and filter by service type. Each listing shows reviews, pricing, and Boss-Verified badges so you can choose with confidence.',
  },
  {
    q: 'How does payment work?',
    a: 'Payments are processed securely through Stripe. Your payment is held until the job is completed to your satisfaction. Saving a payment method is coming soon.',
  },
  {
    q: 'What if I need to cancel a booking?',
    a: 'Cancel at no charge if you do so at least 24 hours before the scheduled service. Cancellations within 24 hours may be subject to a fee at the professional’s discretion.',
  },
  {
    q: 'How do I leave a review?',
    a: 'After a job is marked completed, you will receive an email with a review link. You can also leave reviews from My Bookings in your dashboard.',
  },
  {
    q: 'What does Boss-Verified mean?',
    a: 'Boss-Verified professionals have passed a background check, have valid business insurance on file, and maintain a 4.5+ star rating. It is our highest trust badge.',
  },
  {
    q: 'How do I earn account credits?',
    a: 'Confirm a hire from an accepted quote and you will earn a $10 credit. Credits show under Credits on your Overview page and expire 90 days after issue.',
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-900">{question}</span>
        <ChevronDown
          className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-gray-600 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default function CustomerHelpPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('customer_support');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

  const [history, setHistory] = useState<ContactSubmission[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      const metaName = (user.user_metadata?.full_name as string | undefined) || '';
      if (metaName) setName(metaName);
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('contact_submissions')
        .select('id, subject, message, created_at, is_read')
        .eq('email', user?.email)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        // Likely RLS blocks customer reads — render empty state, not an error.
        setHistory([]);
      } else {
        setHistory((data || []) as ContactSubmission[]);
      }
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !message.trim()) {
      setSubmitMsg('Error: Please fill out all required fields.');
      setTimeout(() => setSubmitMsg(''), 4000);
      return;
    }

    setSubmitting(true);
    setSubmitMsg('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setSubmitMsg('Message sent! Our team will get back to you within 24 hours.');
      setMessage('');
      loadHistory();
      setTimeout(() => setSubmitMsg(''), 6000);
    } catch (err) {
      setSubmitMsg(err instanceof Error ? `Error: ${err.message}` : 'Error sending message.');
      setTimeout(() => setSubmitMsg(''), 6000);
    } finally {
      setSubmitting(false);
    }
  };

  const subjectLabels: Record<string, string> = {
    general: 'General Inquiry',
    customer_support: 'Customer Support',
    list_business: 'List My Business',
    partnership: 'Partnership',
    other: 'Other',
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <ProtectedRoute requireRole="customer">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-6">
              <div className="flex items-center gap-3">
                <HelpCircle className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">Help & Support</h1>
              </div>
              <a
                href="tel:407-461-6039"
                className="hidden sm:flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <Phone className="h-4 w-4" />
                407-461-6039
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* FAQ */}
          <section className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {customerFaqs.map((item) => (
                <FaqItem key={item.q} question={item.q} answer={item.a} />
              ))}
            </div>
          </section>

          {/* Contact Form */}
          <section className="bg-white border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Contact Support</h2>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Cannot find what you need? Send us a message and our team will respond within 24 hours.
            </p>

            {submitMsg && (
              <div
                className={`mb-4 p-3 rounded-md text-sm ${
                  submitMsg.startsWith('Error')
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {submitMsg.startsWith('Error') ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  {submitMsg}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="help-name">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="help-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="help-email">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="help-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="help-subject">
                  Topic
                </label>
                <select
                  id="help-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="customer_support">Customer Support</option>
                  <option value="general">General Inquiry</option>
                  <option value="partnership">Partnership</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="help-message">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="help-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tell us how we can help..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition duration-300 flex items-center gap-2 font-medium"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </section>

          {/* Recent Tickets */}
          <section className="bg-white border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Recent Messages</h2>
            </div>

            {historyLoading ? (
              <div className="text-center py-6 text-gray-500 text-sm">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                Loading...
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  You have not contacted support yet. Use the form above to reach out.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {history.map((t) => (
                  <li key={t.id} className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {subjectLabels[t.subject] || t.subject}
                          </span>
                          {t.is_read ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                              Reviewed
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700">
                              Pending
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 whitespace-pre-wrap">
                          {t.message}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 flex-shrink-0">
                        <Clock className="h-3 w-3" />
                        {formatDate(t.created_at)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </ProtectedRoute>
  );
}
