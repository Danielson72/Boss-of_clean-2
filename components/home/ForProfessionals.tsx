import Link from 'next/link';
import { UserPlus, DollarSign, Calendar, FileCheck } from 'lucide-react';

const benefits = [
  { icon: UserPlus, text: 'Reach new customers in your area' },
  { icon: FileCheck, text: 'Create your professional profile' },
  { icon: DollarSign, text: 'Set your own rates and availability' },
  { icon: Calendar, text: 'No long-term contracts' },
];

export default function ForProfessionals() {
  return (
    <section className="py-20 sm:py-28 bg-brand-dark relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-gold/3 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Content */}
          <div>
            <p className="text-brand-gold text-sm font-semibold tracking-[0.15em] uppercase mb-4">
              For Professionals
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
              Grow Your Cleaning Business
            </h2>
            <p className="text-gray-400 text-lg mb-10 leading-relaxed">
              Join Florida&apos;s newest home services marketplace and connect with homeowners
              looking for your services.
            </p>

            <ul className="space-y-5 mb-10">
              {benefits.map((b) => (
                <li key={b.text} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-brand-gold/10 flex items-center justify-center flex-shrink-0">
                    <b.icon className="h-5 w-5 text-brand-gold" />
                  </div>
                  <span className="text-gray-300 font-medium">{b.text}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-light text-white px-8 py-4 rounded-xl font-semibold tracking-wide transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              List Your Business
            </Link>
          </div>

          {/* Visual card */}
          <div className="relative">
            <div className="bg-brand-navy/80 border border-white/5 rounded-3xl p-8 sm:p-10">
              <div className="space-y-6">
                <div className="bg-white/5 rounded-2xl p-6">
                  <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">
                    Launching Across Florida
                  </p>
                  <p className="text-white text-3xl font-display font-bold">
                    67 Counties
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Growing network of professionals
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-2xl p-5">
                    <p className="text-brand-gold text-2xl font-display font-bold">Free</p>
                    <p className="text-gray-400 text-xs mt-1">To create your profile</p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-5">
                    <p className="text-brand-gold text-2xl font-display font-bold">Local</p>
                    <p className="text-gray-400 text-xs mt-1">Customers in your area</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
