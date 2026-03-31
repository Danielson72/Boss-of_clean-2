import Link from 'next/link';
import Image from 'next/image';
import { Phone, Mail } from 'lucide-react';

const serviceCategories = [
  'House Cleaning',
  'Deep Cleaning',
  'Move-In / Move-Out Cleaning',
  'Pressure Washing',
  'Pool Cleaning',
  'Window Cleaning',
  'Carpet Cleaning',
  'Air Duct Cleaning',
  'Landscaping',
  'Mobile Car Wash / Auto Detailing',
];

const quickLinks = [
  { label: 'Home', href: '/' },
  { label: 'Search', href: '/search' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Help Center', href: '/help' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
];

export default function Footer() {
  return (
    <footer className="bg-brand-dark text-white" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main footer content */}
        <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <Image
                src="/boss-of-clean-logo.png"
                alt="Boss of Clean"
                width={40}
                height={40}
                className="rounded-full"
              />
              <div>
                <span className="text-lg font-bold font-display text-white">
                  Boss of Clean
                </span>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Florida&apos;s residential cleaning and home services marketplace.
            </p>
            <address className="space-y-3 not-italic text-sm">
              <a
                href="tel:407-461-6039"
                className="flex items-center gap-2.5 text-gray-400 hover:text-brand-gold transition-colors"
                aria-label="Call us at 407-461-6039"
              >
                <Phone className="h-4 w-4 text-brand-gold flex-shrink-0" aria-hidden="true" />
                407-461-6039
              </a>
              <a
                href="mailto:admin@bossofclean.com"
                className="flex items-center gap-2.5 text-gray-400 hover:text-brand-gold transition-colors"
                aria-label="Email us at admin@bossofclean.com"
              >
                <Mail className="h-4 w-4 text-brand-gold flex-shrink-0" aria-hidden="true" />
                admin@bossofclean.com
              </a>
            </address>
          </div>

          {/* Quick Links */}
          <nav aria-label="Footer navigation">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-brand-gold text-sm transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Services */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Services
            </h3>
            <ul
              className="grid grid-cols-2 gap-x-6 gap-y-2.5"
              aria-label="Available home services"
            >
              {serviceCategories.map((service) => (
                <li key={service}>
                  <span className="text-gray-400 text-sm">{service}</span>
                </li>
              ))}
            </ul>
            <p className="text-gray-500 text-xs mt-4">
              Serving All 67 Florida Counties
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 py-8">
          {/* Disclaimer */}
          <p className="text-xs text-gray-500 leading-relaxed max-w-4xl mx-auto text-center mb-4">
            Boss of Clean is a residential cleaning and home services marketplace
            connecting homeowners with independent service providers. We are not a
            cleaning company and do not directly employ, supervise, or control
            service providers listed on our platform. All service providers are
            independent businesses responsible for their own licensing, insurance,
            quality of work, and compliance with applicable laws.
          </p>
          <p className="text-center text-xs text-gray-500">
            &copy; 2026 Boss of Clean LLC. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
