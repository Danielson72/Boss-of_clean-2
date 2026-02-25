import { Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { generatePageMetadata } from '@/lib/seo/metadata';
import { SERVICE_TYPES } from '@/lib/data/service-types';

export const metadata = generatePageMetadata({
  title: 'Pricing',
  description: 'Affordable plans for cleaning professionals to list on Boss of Clean. Basic listing free. Professional and Premium tiers for featured placement and more inquiries.',
  path: '/pricing',
  keywords: ['Boss of Clean pricing', 'cleaning business listing', 'cleaning marketplace plans'],
});

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    description: 'Perfect for trying Boss of Clean',
    features: [
      'Basic business listing',
      'Profile page with your info',
      'Contact form for customer inquiries',
      'Show up in search results',
    ],
    cta: 'Get Started Free',
    ctaHref: '/signup?role=cleaner',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '$49',
    period: '/mo',
    description: 'Most popular for growing businesses',
    features: [
      'Everything in Starter',
      'Featured placement in search results',
      'Priority in customer notifications',
      'Profile badges and highlights',
      'Business analytics dashboard',
      'Phone and email support',
    ],
    cta: 'Start Professional',
    ctaHref: '/signup?role=cleaner&plan=basic',
    highlighted: true,
  },
  {
    name: 'Premium',
    price: '$99',
    period: '/mo',
    description: 'Best for established businesses',
    features: [
      'Everything in Professional',
      'Top placement in search results',
      'Featured on homepage',
      'Priority support',
      'Advanced analytics and insights',
      'Multiple service area coverage',
    ],
    cta: 'Start Premium',
    ctaHref: '/signup?role=cleaner&plan=pro',
    highlighted: false,
  },
];

const faqs = [
  {
    question: 'Is Boss of Clean free for customers?',
    answer: 'Yes, always. Customers can search for and connect with cleaning professionals at no cost. We only charge professionals for premium listing features.',
  },
  {
    question: 'Do I need a contract?',
    answer: 'No long-term contracts. All paid plans are month-to-month and you can cancel anytime. Your listing stays active through the end of your billing period.',
  },
  {
    question: 'What services can I list?',
    answer: `You can list any residential cleaning or home service including: ${SERVICE_TYPES.map(s => s.shortName).join(', ')}, and more.`,
  },
  {
    question: 'How do I get started?',
    answer: 'Sign up, create your business profile with your services and service areas, and start receiving customer inquiries. The whole process takes about 10 minutes.',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-dark">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-dark via-brand-navy to-brand-dark" />
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-brand-gold/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 text-center">
          <p className="inline-block text-brand-gold text-sm font-semibold tracking-[0.2em] uppercase mb-6 border border-brand-gold/30 rounded-full px-5 py-1.5">
            Launch Pricing
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4">
            Simple, Transparent <span className="text-brand-gold">Pricing</span>
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto mb-2">
            Choose the plan that fits your business. No hidden fees, no long-term contracts.
          </p>
          <p className="text-brand-gold/70 text-sm">
            Launch pricing — subject to change as we grow
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white rounded-2xl border-2 p-8 transition-all duration-300 ${
                plan.highlighted
                  ? 'border-brand-gold shadow-xl scale-[1.02]'
                  : 'border-gray-200 hover:border-brand-gold/40 hover:shadow-lg'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-brand-gold text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="font-display text-xl font-bold text-brand-dark mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-500 text-sm mb-6">
                  {plan.description}
                </p>
                <div className="flex items-baseline justify-center">
                  <span className="font-display text-5xl font-bold text-brand-dark">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-gray-400 text-lg ml-1">{plan.period}</span>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-brand-gold flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaHref}
                className={`block w-full text-center py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 min-h-[44px] ${
                  plan.highlighted
                    ? 'bg-brand-gold text-white hover:bg-brand-gold-light shadow-lg hover:shadow-xl'
                    : 'bg-brand-dark text-white hover:bg-brand-navy'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-brand-cream">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="font-display text-3xl font-bold text-brand-dark text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-8">
            {faqs.map((faq) => (
              <div key={faq.question}>
                <h3 className="font-display text-lg font-bold text-brand-dark mb-2">
                  {faq.question}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-dark">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="font-display text-3xl font-bold text-white mb-4">
            Ready to Grow Your Business?
          </h2>
          <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
            Join Boss of Clean and start connecting with Florida homeowners looking for your services.
          </p>
          <Link
            href="/signup?role=cleaner"
            className="inline-flex items-center gap-2 bg-brand-gold text-white px-8 py-4 rounded-xl font-semibold hover:bg-brand-gold-light transition-all duration-200 shadow-lg hover:shadow-xl min-h-[44px]"
          >
            List Your Business
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
