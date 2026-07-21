import Link from 'next/link';
import Image from 'next/image';
import { Search, Send, CheckCircle2, DollarSign, ArrowRight } from 'lucide-react';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata = generatePageMetadata({
  title: 'How Pricing Works',
  description:
    'Boss of Clean pricing, explained. Requesting quotes is free for customers — no subscriptions. Pros pay a flat $30 only when you accept their quote. No cut of the job, no percentages.',
  path: '/how-pricing-works',
  keywords: ['how pricing works', 'lead fee', 'flat $30', 'no subscription', 'Boss of Clean pricing'],
});

// The measured, factual model — no endorsements, no guarantees.
const steps = [
  {
    icon: Search,
    step: 'Step 1',
    title: 'Request a quote — free',
    description:
      'You describe the job and your area. The request goes to local pros who work in that category. Requesting costs nothing.',
  },
  {
    icon: Send,
    step: 'Step 2',
    title: 'Pros send quotes',
    description:
      'Interested pros respond with their price. Every lead is exclusive to a single pro — it is never shared with a crowd.',
  },
  {
    icon: CheckCircle2,
    step: 'Step 3',
    title: 'You accept a quote',
    description:
      'You pick the pro you want and arrange the work and payment directly with them. Hiring is always free for you.',
  },
  {
    icon: DollarSign,
    step: 'Step 4',
    title: 'The pro pays $30 flat',
    description:
      'Only after you accept, that pro pays a flat $30 to unlock your full contact details. No tiers, no percentages, no cut of the job.',
  },
];

const facts = [
  { stat: '$30 flat', label: 'Same price for every category — cleaning, handyman, HVAC, and the rest.' },
  { stat: '0%', label: 'We never take a cut or percentage of the job you hire for.' },
  { stat: 'Exclusive', label: 'Every lead goes to a single pro — never shared with a crowd.' },
];

export default function HowPricingWorksPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-dark">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-dark via-brand-navy to-brand-dark" />
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-brand-gold/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <Image
            src="/images/ceo-cat-hero.png"
            alt="Boss of Clean"
            width={96}
            height={96}
            className="mx-auto mb-6 h-20 w-20 rounded-2xl object-cover"
            priority
          />
          <p className="inline-block text-brand-gold text-sm font-semibold tracking-[0.2em] uppercase mb-6 border border-brand-gold/30 rounded-full px-5 py-1.5">
            How Pricing Works
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-[1.1] mb-6">
            One flat fee. No <span className="text-brand-gold">surprises.</span>
          </h1>
          <p className="text-gray-300 text-lg sm:text-xl max-w-2xl mx-auto">
            Requesting quotes is free for customers. Pros pay a flat $30 — only when you accept their
            quote. No subscriptions required, and no cut of the job.
          </p>
        </div>
      </section>

      {/* Free for customers */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-brand-gold font-semibold text-sm uppercase tracking-wider mb-2">
          For Customers
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-dark mb-4">
          Free to use — always
        </h2>
        <p className="text-gray-600 text-lg leading-relaxed">
          Boss of Clean is free for customers. Requesting quotes costs nothing, there is no
          subscription, and we never charge you to hire. You describe the job, local pros respond,
          and you choose who to hire and pay them directly.
        </p>
      </section>

      {/* The $30 model in steps */}
      <section className="bg-brand-warm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-14">
            <p className="text-brand-gold font-semibold text-sm uppercase tracking-wider mb-2">
              The Flat $30 Model
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-dark">
              How the $30 works, step by step
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((item, i) => (
              <div
                key={item.title}
                className="relative bg-white border border-gray-200 rounded-2xl p-8 text-center hover:border-brand-gold/40 hover:shadow-lg transition-all duration-300"
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand-gold text-white text-xs font-bold px-3 py-1 rounded-full">
                  {item.step}
                </div>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-gold/10 mb-6 mt-2">
                  <item.icon className="h-8 w-8 text-brand-gold" />
                </div>
                <h3 className="font-display text-lg font-bold text-brand-dark mb-3">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-5 -translate-y-1/2">
                    <ArrowRight className="h-6 w-6 text-gray-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For pros */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-brand-gold font-semibold text-sm uppercase tracking-wider mb-2">
          For Pros
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-dark mb-4">
          What the $30 gets you
        </h2>
        <p className="text-gray-600 text-lg leading-relaxed mb-6">
          $30 is flat for every category — cleaning, handyman, HVAC, and the rest. There is no
          percentage of your job, ever, and you only pay after a customer accepts your quote. Prefer
          to pay monthly instead? The Basic and Pro plans are optional.
        </p>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 text-brand-dark font-semibold hover:text-brand-gold transition-colors"
        >
          See pro plans and per-lead pricing
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Facts band */}
      <section className="bg-brand-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            {facts.map((f) => (
              <div key={f.stat}>
                <p className="font-display text-3xl sm:text-4xl font-bold text-brand-gold mb-2">
                  {f.stat}
                </p>
                <p className="text-gray-600 text-sm leading-relaxed max-w-xs mx-auto">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-dark mb-6">
          Ready to get started?
        </h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/quote-request"
            className="inline-flex items-center gap-2 bg-brand-gold text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-brand-gold-light transition-all duration-200 shadow-lg"
          >
            Request a Quote — Free
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 bg-white text-brand-dark border border-gray-300 px-8 py-4 rounded-xl font-semibold text-lg hover:border-brand-gold/40 transition-all duration-200"
          >
            See Pro Plans
          </Link>
        </div>
        <p className="text-gray-400 text-sm mt-10 max-w-2xl mx-auto">
          Boss of Clean is a neutral marketplace connecting customers with independent residential &amp; commercial service
          pros. We don&apos;t employ or control pros, and hiring decisions are always yours.
        </p>
      </section>
    </div>
  );
}
