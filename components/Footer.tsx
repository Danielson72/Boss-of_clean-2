import Link from 'next/link';
import { Phone, Mail, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="text-2xl font-bold text-blue-400 mb-4">
              BOSS OF CLEAN
            </div>
            <p className="text-gray-300 mb-4">
              Florida&apos;s premier cleaning directory connecting customers with trusted professional cleaning services across the state.
            </p>
            <address className="space-y-2 not-italic">
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-blue-400 mr-2" aria-hidden="true" />
                <a
                  href="tel:407-461-6039"
                  className="hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                  aria-label="Call us at 407-461-6039"
                >
                  407-461-6039
                </a>
              </div>
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-blue-400 mr-2" aria-hidden="true" />
                <a
                  href="mailto:dalvarez@sotsvc.com"
                  className="hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                  aria-label="Email us at dalvarez@sotsvc.com"
                >
                  dalvarez@sotsvc.com
                </a>
              </div>
              <div className="flex items-center">
                <MapPin className="h-5 w-5 text-blue-400 mr-2" aria-hidden="true" />
                <span>Serving All of Florida</span>
              </div>
            </address>
          </div>

          {/* Quick Links */}
          <nav aria-label="Footer navigation">
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-300 hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-gray-300 hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded">
                  Search Cleaners
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-gray-300 hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-300 hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-300 hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded">
                  Contact
                </Link>
              </li>
            </ul>
          </nav>

          {/* Services */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Services</h3>
            <ul className="space-y-2 text-gray-300" aria-label="Available cleaning services">
              <li>Residential Cleaning</li>
              <li>Commercial Cleaning</li>
              <li>Deep Cleaning</li>
              <li>Pressure Washing</li>
              <li>Window Cleaning</li>
              <li>Carpet Cleaning</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2025 Boss of Clean. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
