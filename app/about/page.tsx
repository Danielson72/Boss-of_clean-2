import { Heart, Users, Sparkles, ArrowRight, Shield } from 'lucide-react';
import Link from 'next/link';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata = generatePageMetadata({
  title: 'About Us',
  description: 'Boss of Clean is building Florida\'s most trusted residential cleaning marketplace. Learn about our mission to connect homeowners with independent cleaning professionals.',
  path: '/about',
  keywords: ['about Boss of Clean', 'Florida cleaning marketplace', 'residential cleaning platform'],
});

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-dark">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-dark via-brand-navy to-brand-dark" />
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-brand-gold/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-brand-gold/3 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 text-center">
          <p className="inline-block text-brand-gold text-sm font-semibold tracking-[0.2em] uppercase mb-6 border border-brand-gold/30 rounded-full px-5 py-1.5">
            Our Story
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-[1.1] mb-6">
            About <span className="text-brand-gold">Boss of Clean</span>
          </h1>
          <p className="text-gray-300 text-lg sm:text-xl max-w-2xl mx-auto">
            Building Florida&apos;s most trusted residential cleaning marketplace
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="font-display text-3xl font-bold text-brand-dark mb-8">
          Our Story
        </h2>
        <div className="space-y-5 text-gray-600 text-lg leading-relaxed">
          <p>
            Boss of Clean was born from a simple frustration: finding reliable, professional
            cleaning services in Florida was harder than it should be. For homeowners, the
            options were overwhelming and opaque. For quality cleaning professionals, reaching
            new customers meant competing on platforms that didn&apos;t value their craft.
          </p>
          <p>
            We&apos;re building a marketplace where quality matters — where &ldquo;Purrfection is
            our Standard&rdquo; isn&apos;t just a tagline but a commitment to connecting
            homeowners with independent cleaning professionals they can trust.
          </p>
          <p>
            We&apos;re just getting started, and we&apos;re proud of that. Being new means
            we&apos;re fresh, innovative, and laser-focused on getting things right for both
            customers and the professionals who serve them. Every feature we build, every
            connection we facilitate, is designed to make this marketplace fair, transparent,
            and genuinely useful.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-brand-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-gold/10 mb-8">
            <Heart className="h-8 w-8 text-brand-gold" />
          </div>
          <h2 className="font-display text-3xl font-bold text-brand-dark mb-6">
            Our Mission
          </h2>
          <p className="text-gray-700 text-xl leading-relaxed max-w-3xl mx-auto">
            We believe every Florida home deserves access to trustworthy, professional
            cleaning services. Boss of Clean exists to make that connection simple,
            transparent, and reliable.
          </p>
        </div>
      </section>

      {/* For Professionals + Marketplace Difference */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* For Professionals */}
          <div className="bg-white border border-gray-200 rounded-2xl p-8 lg:p-10">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-gold/10 mb-6">
              <Sparkles className="h-6 w-6 text-brand-gold" />
            </div>
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              For Professionals
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              We&apos;re building a platform that respects the professionals who make
              clean homes possible. No predatory lead fees. No hidden costs. Just a fair
              marketplace where your work speaks for itself.
            </p>
            <Link
              href="/signup?role=cleaner"
              className="inline-flex items-center gap-2 text-brand-gold font-semibold mt-6 hover:gap-3 transition-all duration-200"
            >
              List Your Business
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Marketplace Difference */}
          <div className="bg-white border border-gray-200 rounded-2xl p-8 lg:p-10">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-gold/10 mb-6">
              <Shield className="h-6 w-6 text-brand-gold" />
            </div>
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              The Marketplace Difference
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              Boss of Clean is a marketplace — we connect you with independent cleaning
              professionals, but we don&apos;t employ them. Every professional on our
              platform runs their own business, sets their own rates, and maintains their
              own standards. We provide the platform. They provide the purrfection.
            </p>
          </div>
        </div>
      </section>

      {/* What We Value */}
      <section className="bg-brand-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="font-display text-3xl font-bold text-white text-center mb-12">
            What We Value
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: 'Honesty First',
                description: 'No fake reviews, no inflated numbers, no manufactured urgency. What you see on Boss of Clean is real.',
              },
              {
                icon: Users,
                title: 'Fair for Everyone',
                description: 'A marketplace that works for both customers and professionals. Transparent pricing, fair policies, and respect for everyone involved.',
              },
              {
                icon: Sparkles,
                title: 'Quality Matters',
                description: 'We\'re building tools that help quality professionals stand out — because great work deserves to be found.',
              },
            ].map((value) => (
              <div key={value.title} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-gold/10 mb-5">
                  <value.icon className="h-7 w-7 text-brand-gold" />
                </div>
                <h3 className="font-display text-lg font-bold text-white mb-3">
                  {value.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="font-display text-3xl font-bold text-brand-dark mb-4">
          Join the Boss of Clean Community
        </h2>
        <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
          Whether you&apos;re looking for cleaning services or want to grow your cleaning
          business, we&apos;re here to help.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/search"
            className="inline-flex items-center justify-center gap-2 bg-brand-gold text-white px-8 py-4 rounded-xl font-semibold hover:bg-brand-gold-light transition-all duration-200 shadow-lg min-h-[44px]"
          >
            Find a Professional
          </Link>
          <Link
            href="/signup?role=cleaner"
            className="inline-flex items-center justify-center gap-2 border-2 border-brand-dark text-brand-dark px-8 py-4 rounded-xl font-semibold hover:bg-brand-dark hover:text-white transition-all duration-200 min-h-[44px]"
          >
            List Your Business
          </Link>
        </div>
      </section>
    </div>
  );
}
