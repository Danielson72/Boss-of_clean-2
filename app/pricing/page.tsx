import { Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { generatePageMetadata } from '@/lib/seo/metadata';
import { createClient } from '@/lib/supabase/server';
import { PricingCTA, type PricingAuthState, type PricingPlanId } from '@/components/pricing/PricingCTA';

export const metadata = generatePageMetadata({
  title: 'Pricing',
  description: 'Affordable plans for residential & commercial service pros to list on Boss of Clean — cleaning, office cleaning, handyman, HVAC, plumbing, electrical, pest control, landscaping, pool, mobile detailing, and pressure washing. Free pay-per-lead, Basic $79/mo, and Pro $199/mo.',
  path: '/pricing',
  keywords: [
    'Boss of Clean pricing',
    'residential & commercial service marketplace pricing',
    'commercial cleaning Florida',
    'office cleaning',
    'pro listing plans',
    'Thumbtack alternative',
    'Angi alternative',
    'HomeAdvisor alternative',
  ],
});

const PRO_CATEGORIES = [
  'House cleaning',
  'Handyman',
  'HVAC',
  'Plumbing',
  'Electrical',
  'Pest control',
  'Landscaping',
  'Pool service',
  'Mobile detailing',
  'Pressure washing',
];

interface Plan {
  planId: PricingPlanId;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlighted: boolean;
}

const plans: Plan[] = [
  {
    planId: 'free',
    name: 'Free',
    price: '$0',
    period: '/mo',
    description: 'Pay only when you want a lead',
    features: [
      'Basic business listing on the marketplace',
      'Profile page with services and service areas',
      'Pay-per-lead pricing — no monthly commitment',
      'Flat $30 per lead — no tiers, no percentages',
      'Every lead is exclusive — never shared',
    ],
    cta: 'Get Started Free',
    ctaHref: '/signup?role=pro',
    highlighted: false,
  },
  {
    planId: 'basic',
    name: 'Basic',
    price: '$79',
    period: '/mo',
    description: 'Steady lead flow without the heavy commit',
    features: [
      'Everything in Free',
      'Priority lead routing — you see qualified leads first',
      'Featured placement in category and city search',
      'Priority in customer notifications',
      'Profile highlights',
      'Business analytics dashboard',
    ],
    cta: 'Start Basic',
    ctaHref: '/signup?role=pro&plan=basic',
    highlighted: false,
  },
  {
    planId: 'pro',
    name: 'Pro',
    price: '$199',
    period: '/mo',
    description: 'Best for established pros that want volume',
    features: [
      'Everything in Basic',
      'Top placement in search results',
      'Featured on homepage and category hubs',
      'Priority support',
      'Advanced analytics and insights',
      'Multiple service area coverage',
    ],
    cta: 'Start Pro',
    ctaHref: '/signup?role=pro&plan=pro',
    highlighted: true,
  },
];

const faqs = [
  {
    question: 'How does lead routing work on Boss of Clean?',
    answer: 'When a customer submits a request, qualified pros in the matching service area receive a notification and can accept the lead. Paid plans place you higher in the routing order, so you see qualified leads first. Lead volume depends on marketplace demand and your service area — we do not guarantee a specific number of leads per month.',
  },
  {
    question: 'Is Boss of Clean only for cleaning companies?',
    answer: 'No. Boss of Clean is a marketplace for all residential & commercial service pros — cleaning, handyman, HVAC, plumbing, electrical, pest control, landscaping, pool service, mobile detailing, and pressure washing. If a customer needs it done, the pro who does it belongs here.',
  },
  {
    question: 'Is Boss of Clean free for customers?',
    answer: 'Yes, always. Homeowners and businesses can search and request quotes from pros at no cost. We only charge pros for marketplace access and lead delivery.',
  },
  {
    question: 'Do I need a contract?',
    answer: 'No long-term contracts. All paid plans are month-to-month and you can cancel anytime. Your listing stays active through the end of the current billing period.',
  },
  {
    question: 'How is this different from Thumbtack, Angi, or HomeAdvisor?',
    answer: 'Every lead on Boss of Clean is exclusive to a single pro — never shared, never resold. Every price is published on this page: list free and pay $30 per lead, or choose a flat monthly plan.',
  },
  {
    question: 'How do I get started?',
    answer: 'Sign up, build your pro profile with services and service areas, choose a plan, and start receiving customer requests. The whole process takes about 10 minutes.',
  },
];

async function resolveAuthState(): Promise<PricingAuthState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 'anonymous';

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = userData?.role || user.user_metadata?.role || 'customer';
  // The DB role for service pros is 'cleaner' (legacy name); 'admin' is treated as pro for billing UX.
  if (role === 'cleaner' || role === 'admin') return 'pro';
  return 'customer';
}

export default async function PricingPage() {
  const authState = await resolveAuthState();

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
            The Marketplace for Residential & Commercial Service Pros
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4">
            Exclusive Leads. <span className="text-brand-gold">Transparent Pricing.</span>
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto mb-2">
            A Thumbtack, Angi, and HomeAdvisor alternative built on exclusive leads, published lead caps,
            and plain-English overflow pricing. Pick the plan that fits how you run.
          </p>
          <p className="text-brand-gold/70 text-sm">
            Free to list. $79/mo Basic. $199/mo Pro.
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

              <PricingCTA
                planId={plan.planId}
                ctaHref={plan.ctaHref}
                ctaLabel={plan.cta}
                highlighted={plan.highlighted}
                authState={authState}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Category coverage */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="text-center mb-8">
          <p className="text-sm font-semibold text-brand-gold uppercase tracking-wider mb-2">
            Built for every residential & commercial trade
          </p>
          <h2 className="font-display text-3xl font-bold text-brand-dark">
            One marketplace. Every category.
          </h2>
          <p className="text-gray-600 mt-3 max-w-2xl mx-auto">
            The same pricing applies whether you clean houses, fix HVAC systems, or run a pool
            route. Boss of Clean is the home for the trades.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {PRO_CATEGORIES.map((category) => (
            <div
              key={category}
              className="bg-brand-cream border border-brand-gold/20 rounded-xl px-4 py-3 text-center"
            >
              <p className="text-brand-dark font-semibold text-sm">{category}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pay-per-lead breakdown */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="bg-brand-cream rounded-2xl p-8 sm:p-10">
          <div className="text-center mb-8">
            <p className="text-sm font-semibold text-brand-gold uppercase tracking-wider mb-2">
              Pay-per-Lead Pricing
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-brand-dark">
              Buy leads one at a time on the Free plan
            </h2>
            <p className="text-gray-600 mt-3 max-w-2xl mx-auto">
              Not ready for a subscription? Stay on the Free plan and only pay when you unlock a lead.
              Every lead is exclusive — sent to a single pro, never shared.
            </p>
          </div>
          <div className="max-w-sm mx-auto">
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-200">
              <p className="text-xs font-semibold text-brand-gold uppercase tracking-wider mb-2">
                Flat Per-Lead Price
              </p>
              <div className="flex items-baseline justify-center mb-3">
                <span className="font-display text-5xl font-bold text-brand-dark">$30</span>
                <span className="text-gray-400 text-base ml-1">/lead</span>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                One flat price for every lead — cleaning, handyman, HVAC, plumbing, electrical, pest
                control, and every other category. No tiers, no percentages, no surprises.
              </p>
            </div>
          </div>
          <p className="text-gray-500 text-xs text-center mt-6">
            Paid plans provide priority routing and placement. Lead volume varies by service area
            and marketplace demand.
          </p>
          <div className="text-center mt-6">
            <Link
              href="/how-pricing-works"
              className="inline-flex items-center gap-2 text-brand-dark font-semibold hover:text-brand-gold transition-colors"
            >
              See how pricing works, step by step
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
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
            Join Boss of Clean and start connecting with homeowners and businesses looking for the trades you run.
          </p>
          <Link
            href="/signup?role=pro"
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
