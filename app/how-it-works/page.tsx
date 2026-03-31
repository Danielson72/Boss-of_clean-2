import Link from 'next/link';
import { Search, CalendarCheck, Sparkles, UserPlus, Zap, TrendingUp, ArrowRight } from 'lucide-react';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata = generatePageMetadata({
  title: 'How It Works',
  description: 'Learn how Boss of Clean connects Florida homeowners with verified cleaning professionals. Simple search, easy booking, guaranteed satisfaction.',
  path: '/how-it-works',
  keywords: ['how it works', 'find a cleaner', 'hire cleaning professional', 'Boss of Clean process'],
});

const homeownerSteps = [
  {
    icon: Search,
    step: 'Step 1',
    title: 'Search',
    description: 'Enter your ZIP code and the type of cleaning service you need. Browse verified professional profiles, read real reviews, and compare pricing.',
  },
  {
    icon: CalendarCheck,
    step: 'Step 2',
    title: 'Book',
    description: 'Choose a verified pro and pick a time that works for you. Payment is held securely through Stripe until the job is completed.',
  },
  {
    icon: Sparkles,
    step: 'Step 3',
    title: 'Relax',
    description: 'We handle the rest. Your pro arrives on time, does the job right, and you enjoy a spotless space. Purrfection is our Standard.',
  },
];

const proSteps = [
  {
    icon: UserPlus,
    step: 'Step 1',
    title: 'Sign Up',
    description: 'Create your professional profile in minutes. Add your services, service areas, photos, and business details to start attracting customers.',
  },
  {
    icon: Zap,
    step: 'Step 2',
    title: 'Get Leads',
    description: 'Exclusive leads are sent directly to your dashboard, email, and phone. Every lead is yours alone \u2014 never shared with other providers.',
  },
  {
    icon: TrendingUp,
    step: 'Step 3',
    title: 'Grow',
    description: 'Build your reputation with real customer reviews, earn repeat business, and grow your Florida cleaning business on your terms.',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-dark">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-dark via-brand-navy to-brand-dark" />
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-brand-gold/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <p className="inline-block text-brand-gold text-sm font-semibold tracking-[0.2em] uppercase mb-6 border border-brand-gold/30 rounded-full px-5 py-1.5">
            Simple &amp; Transparent
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-[1.1] mb-6">
            How <span className="text-brand-gold">Boss of Clean</span> Works
          </h1>
          <p className="text-gray-300 text-lg sm:text-xl max-w-2xl mx-auto">
            Whether you need a cleaner or you are one, getting started takes just a few steps.
          </p>
        </div>
      </section>

      {/* For Homeowners */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <p className="text-brand-gold font-semibold text-sm uppercase tracking-wider mb-2">
            For Homeowners
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-dark">
            Find a Trusted Cleaner in 3 Steps
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {homeownerSteps.map((item, i) => (
            <div key={item.title} className="relative bg-white border border-gray-200 rounded-2xl p-8 text-center hover:border-brand-gold/40 hover:shadow-lg transition-all duration-300">
              {/* Step number */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand-gold text-white text-xs font-bold px-3 py-1 rounded-full">
                {item.step}
              </div>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-gold/10 mb-6 mt-2">
                <item.icon className="h-8 w-8 text-brand-gold" />
              </div>
              <h3 className="font-display text-xl font-bold text-brand-dark mb-3">
                {item.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {item.description}
              </p>
              {/* Connector arrow (not on last) */}
              {i < homeownerSteps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-5 -translate-y-1/2">
                  <ArrowRight className="h-6 w-6 text-gray-300" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 bg-brand-gold text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-brand-gold-light transition-all duration-200 shadow-lg"
          >
            Find a Cleaner Now
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-t border-gray-200" />
      </div>

      {/* For Pros */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <p className="text-brand-gold font-semibold text-sm uppercase tracking-wider mb-2">
            For Cleaning Professionals
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-dark">
            Grow Your Business in 3 Steps
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {proSteps.map((item, i) => (
            <div key={item.title} className="relative bg-white border border-gray-200 rounded-2xl p-8 text-center hover:border-brand-gold/40 hover:shadow-lg transition-all duration-300">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand-dark text-white text-xs font-bold px-3 py-1 rounded-full">
                {item.step}
              </div>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-dark/5 mb-6 mt-2">
                <item.icon className="h-8 w-8 text-brand-dark" />
              </div>
              <h3 className="font-display text-xl font-bold text-brand-dark mb-3">
                {item.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {item.description}
              </p>
              {i < proSteps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-5 -translate-y-1/2">
                  <ArrowRight className="h-6 w-6 text-gray-300" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/signup?role=cleaner"
            className="inline-flex items-center gap-2 bg-brand-dark text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-brand-navy transition-all duration-200 shadow-lg"
          >
            Join as a Pro
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Trust bar */}
      <section className="bg-brand-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
            Why Boss of Clean?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-8">
            <div>
              <p className="text-3xl font-bold text-brand-gold mb-1">100%</p>
              <p className="text-gray-600 text-sm">Exclusive leads &mdash; never shared</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-brand-gold mb-1">5%</p>
              <p className="text-gray-600 text-sm">Fair platform fee &mdash; no hidden costs</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-brand-gold mb-1">24hr</p>
              <p className="text-gray-600 text-sm">Lead quality guarantee response</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
