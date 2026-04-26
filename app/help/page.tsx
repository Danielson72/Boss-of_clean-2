'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, HelpCircle, Home, Briefcase, Mail } from 'lucide-react';

const homeownerFaqs = [
  {
    question: 'How do I find a cleaner?',
    answer:
      'Head to our Search page and enter your ZIP code along with the type of service you need. You can filter by service type, sort by rating or price, and browse verified professional profiles. Each listing shows reviews, pricing, and trust badges so you can choose with confidence.',
  },
  {
    question: 'How does payment work?',
    answer:
      'All payments are processed securely through Stripe. When you book a service, your payment is held securely until the job is completed to your satisfaction. Professionals receive their payout within 2\u20133 business days after completion.',
  },
  {
    question: 'What if I need to cancel?',
    answer:
      'You can cancel a booking at no charge as long as you do so at least 24 hours before the scheduled service time. Cancellations made within 24 hours may be subject to a fee of up to 50% of the quoted price at the professional\u2019s discretion.',
  },
  {
    question: 'How do I leave a review?',
    answer:
      'After your job is marked as completed, you\u2019ll receive an email prompting you to rate and review your cleaning professional. You can also leave reviews from your customer dashboard under Bookings. Honest reviews help other homeowners and reward great professionals.',
  },
  {
    question: 'What does Boss-Verified mean?',
    answer:
      'Boss-Verified professionals have passed our verification process: background check completed, valid business insurance on file, and a minimum 4.5-star rating maintained over time. It\u2019s our highest trust badge and means you\u2019re hiring a proven professional.',
  },
];

const proFaqs = [
  {
    question: 'How do I get leads?',
    answer:
      'Subscribe to a plan, complete your profile, and set your service areas. Leads from homeowners in your areas are delivered directly to your dashboard and via SMS/email notifications. The more complete your profile, the better your lead quality.',
  },
  {
    question: 'Are leads exclusive?',
    answer:
      'Yes. Every lead on Boss of Clean is sent to one professional only \u2014 they are never shared with multiple providers. This means you\u2019re not competing against five other companies for the same job.',
  },
  {
    question: 'How do I get paid?',
    answer:
      'After a job is marked as completed, your payout is processed via Stripe direct deposit within 2\u20133 business days. A 5% platform fee is deducted automatically. You can view all your earnings and payout history in your Pro Dashboard.',
  },
  {
    question: 'What are the subscription tiers?',
    answer:
      'We offer two plans: Basic at $79/month and Pro at $199/month. Pro members get priority lead placement, a featured badge on their profile, and access to advanced analytics. Visit our Pricing page for full details.',
  },
  {
    question: 'How do I dispute a bad lead?',
    answer:
      'Go to your Pro Dashboard, navigate to Leads, and click "Report Issue" on any lead you believe is invalid. We review all disputes within 48 hours. If the lead is verified as invalid (fake info, out-of-area, duplicate), credits are issued to your account automatically.',
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-brand-dark">{question}</span>
        <ChevronDown
          className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-gray-600 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState<'homeowner' | 'pro'>('homeowner');

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-dark">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-dark via-brand-navy to-brand-dark" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-gold/10 mb-6">
            <HelpCircle className="h-8 w-8 text-brand-gold" />
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-[1.1] mb-4">
            Help Center
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Find answers to common questions about using Boss of Clean.
          </p>
        </div>
      </section>

      {/* Tabs + FAQs */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-gray-100 p-1 mb-10">
          <button
            type="button"
            onClick={() => setActiveTab('homeowner')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'homeowner'
                ? 'bg-white text-brand-dark shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Home className="h-4 w-4" />
            For Homeowners
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pro')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'pro'
                ? 'bg-white text-brand-dark shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            For Pros
          </button>
        </div>

        {/* FAQ List */}
        <div className="space-y-3">
          {(activeTab === 'homeowner' ? homeownerFaqs : proFaqs).map((faq) => (
            <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </section>

      {/* Still need help */}
      <section className="bg-brand-cream">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-gold/10 mb-6">
            <Mail className="h-7 w-7 text-brand-gold" />
          </div>
          <h2 className="font-display text-2xl font-bold text-brand-dark mb-3">
            Still need help?
          </h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Our team is here to assist you. Send us an email and we&apos;ll get back
            to you within 24 hours.
          </p>
          <a
            href="mailto:admin@bossofclean.com"
            className="inline-flex items-center gap-2 bg-brand-gold text-white px-8 py-4 rounded-xl font-semibold hover:bg-brand-gold-light transition-all duration-200 shadow-lg"
          >
            <Mail className="h-5 w-5" />
            admin@bossofclean.com
          </a>
        </div>
      </section>
    </div>
  );
}
