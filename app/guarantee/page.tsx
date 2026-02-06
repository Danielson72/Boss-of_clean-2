import { Shield, CheckCircle, Clock, Phone, Mail, Heart } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'The Purrfection Promise | Boss of Clean',
  description: 'The Boss of Clean Purrfection Promise — our commitment to connecting you with quality-focused cleaning professionals in Florida.',
};

export default function GuaranteePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-700 to-indigo-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-full mb-6">
            <Heart className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            The Purrfection Promise
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            We believe every home deserves a spotless clean. That&apos;s why we connect you
            with service providers committed to excellence.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Our Commitment */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Our Commitment to You</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'Quality-Focused Providers',
                description: 'We connect you with cleaning professionals who are committed to delivering excellent results for every job.',
              },
              {
                title: 'Easy Communication',
                description: 'Our platform makes it simple to communicate with your service provider before, during, and after your cleaning appointment.',
              },
              {
                title: 'Support When You Need It',
                description: 'Our support team is available to help resolve any concerns and ensure you have a great experience.',
              },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-gray-600 text-sm">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Not Satisfied */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Not Satisfied With Your Service?</h2>
          <div className="space-y-6">
            {[
              {
                step: '1',
                title: 'Contact Us Within 24 Hours',
                description: 'Let us know about your experience through your customer dashboard or by contacting our support team within 24 hours of your service.',
              },
              {
                step: '2',
                title: 'We Work With Your Provider',
                description: 'We\'ll coordinate with your service provider to understand what happened and discuss options to address your concerns.',
              },
              {
                step: '3',
                title: 'Resolution That Works for You',
                description: 'Whether that means a re-clean or help finding a better match for your needs, we\'ll work to make it right.',
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  {item.step}
                </div>
                <div className="flex-1 bg-white rounded-lg shadow-sm p-5 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Important Notice */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Important Notice</h2>
          <div className="bg-blue-50 rounded-lg p-8 border border-blue-200">
            <p className="text-gray-700 leading-relaxed">
              Boss of Clean is a marketplace platform that connects customers with independent
              cleaning professionals. Service providers are independent contractors, not employees
              of Boss of Clean. We do not perform cleaning services directly. The service provider
              is solely responsible for the quality of work performed.
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              We encourage all customers to review profiles, ratings, and reviews before booking
              a service provider. Communication through our platform helps ensure a clear
              understanding of expectations for every job.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Need Help?</h2>
          <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200">
            <p className="text-gray-600 mb-6">
              Our support team is here to help with any questions or concerns about your experience.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Email</p>
                  <p className="text-sm text-blue-600">support@bossofclean.com</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Phone</p>
                  <p className="text-sm text-blue-600">(855) BOSS-CLEAN</p>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <Link
                href="/contact"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </section>

        {/* Last Updated */}
        <div className="text-center text-sm text-gray-500">
          <p>Last updated: February 2026</p>
          <p className="mt-1">
            This policy is subject to the{' '}
            <Link href="/terms" className="text-blue-600 hover:underline">
              Boss of Clean Terms of Service
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
