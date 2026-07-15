import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { generatePageMetadata } from '@/lib/seo/metadata';
import InstallGuide from '@/components/pwa/InstallGuide';

export const metadata = generatePageMetadata({
  title: 'Install the App',
  description:
    'Add Boss of Clean to your phone home screen. Step-by-step install help for iPhone (Safari) and Android (Chrome), tailored to your browser.',
  path: '/install',
  keywords: ['install app', 'add to home screen', 'Boss of Clean app', 'PWA install'],
});

export default function InstallPage() {
  return (
    <div className="min-h-screen bg-brand-warm">
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-dark">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-dark via-brand-navy to-brand-dark" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-brand-gold/5 rounded-full blur-3xl" />
        <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
          <p className="inline-block text-brand-gold text-sm font-semibold tracking-[0.2em] uppercase mb-5 border border-brand-gold/30 rounded-full px-5 py-1.5">
            Get the App
          </p>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-[1.1] mb-4">
            Install <span className="text-brand-gold">Boss of Clean</span>
          </h1>
          <p className="text-gray-300 text-base sm:text-lg">
            One tap from your home screen. We&rsquo;ll show you the exact steps for your phone.
          </p>
        </div>
      </section>

      {/* Guide — detection runs client-side */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <InstallGuide />

        <p className="mt-8 text-center text-sm text-gray-500">
          Installing adds a home-screen icon and full-screen app — no App Store, no download size.
        </p>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-brand-dark font-semibold hover:text-brand-gold transition-colors"
          >
            Back to Boss of Clean
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
