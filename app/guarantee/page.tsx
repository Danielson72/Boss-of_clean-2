import { Shield, CheckCircle, AlertTriangle, Clock, Phone, Mail, FileText } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Boss of Clean $5,000 Service Guarantee | Florida Cleaning Services',
  description: 'Our $5,000 Service Guarantee protects you when you book cleaning services through Boss of Clean. If your cleaner doesn\'t show up or the work is unsatisfactory, we\'ll make it right.',
};

export default function GuaranteePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-700 to-indigo-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-full mb-6">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            $5,000 Service Guarantee
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Book with confidence. Every cleaning service booked through Boss of Clean
            is backed by our industry-leading service guarantee.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* What's Covered */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">What&apos;s Covered</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: 'No-Show Protection',
                description: 'If your confirmed cleaner doesn\'t show up for a scheduled appointment, we\'ll find a replacement or refund your booking fee — plus compensate you up to $500 for the inconvenience.',
              },
              {
                title: 'Quality Guarantee',
                description: 'If the cleaning service doesn\'t meet the agreed-upon scope of work, we\'ll arrange a free re-clean within 48 hours or issue a full refund of the service fee.',
              },
              {
                title: 'Property Damage Coverage',
                description: 'In the rare event that a cleaner causes damage to your property during service, our guarantee covers verified damages up to $5,000 for repair or replacement.',
              },
              {
                title: 'Theft Protection',
                description: 'All cleaners on our platform are background-checked. In the unlikely event of verified theft during a cleaning appointment, our guarantee covers losses up to $5,000.',
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

        {/* How It Works */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">How It Works</h2>
          <div className="space-y-6">
            {[
              {
                step: '1',
                title: 'Book Through Boss of Clean',
                description: 'The guarantee applies to all cleaning services booked and paid for through the Boss of Clean platform. Direct bookings outside our platform are not covered.',
              },
              {
                step: '2',
                title: 'Report an Issue Within 48 Hours',
                description: 'If something goes wrong, report the issue within 48 hours of the scheduled service through your customer dashboard or by contacting our support team.',
              },
              {
                step: '3',
                title: 'We Investigate and Resolve',
                description: 'Our team will review your claim within 1 business day. We may request photos, documentation, or a brief phone call to understand the situation.',
              },
              {
                step: '4',
                title: 'Get Made Whole',
                description: 'Once verified, we\'ll arrange a re-clean, issue a refund, or provide compensation up to $5,000 depending on the nature of the claim. Most claims are resolved within 3-5 business days.',
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

        {/* Eligibility Requirements */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Eligibility Requirements</h2>
          <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200">
            <p className="text-gray-600 mb-6">
              To be eligible for the Boss of Clean Service Guarantee, the following conditions must be met:
            </p>
            <ul className="space-y-3">
              {[
                'The service must be booked and paid for through the Boss of Clean platform.',
                'The claim must be reported within 48 hours of the scheduled service date.',
                'For property damage or theft claims, a police report may be required for claims exceeding $500.',
                'The customer must provide reasonable documentation (photos, receipts, or written description) of the issue.',
                'The guarantee does not cover pre-existing damage, normal wear and tear, or issues caused by the customer.',
                'Maximum guarantee payout is $5,000 per incident, with a lifetime maximum of $10,000 per customer account.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Exclusions */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Exclusions</h2>
          <div className="bg-amber-50 rounded-lg p-8 border border-amber-200">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0" />
              <p className="text-amber-800 font-medium">The following are not covered by this guarantee:</p>
            </div>
            <ul className="space-y-2 ml-9">
              {[
                'Services arranged directly with a cleaner outside the Boss of Clean platform',
                'Claims reported more than 48 hours after the scheduled service',
                'Dissatisfaction with pricing or service duration (these should be discussed before booking)',
                'Damage caused by customer negligence, pets, or pre-existing conditions',
                'Loss of sentimental or irreplaceable items (coverage is limited to fair market replacement value)',
                'Services performed at commercial properties exceeding 10,000 sq ft (contact us for enterprise coverage)',
              ].map((item, i) => (
                <li key={i} className="text-amber-700 text-sm list-disc">{item}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* Claims Timeline */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Claims Timeline</h2>
          <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <Clock className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                <p className="font-semibold text-gray-900">Within 48 Hours</p>
                <p className="text-sm text-gray-600 mt-1">Report your issue through the platform or contact support</p>
              </div>
              <div className="text-center">
                <FileText className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                <p className="font-semibold text-gray-900">1 Business Day</p>
                <p className="text-sm text-gray-600 mt-1">Our team reviews your claim and may request additional information</p>
              </div>
              <div className="text-center">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-3" />
                <p className="font-semibold text-gray-900">3-5 Business Days</p>
                <p className="text-sm text-gray-600 mt-1">Claim resolved with re-clean, refund, or compensation</p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Need to File a Claim?</h2>
          <div className="bg-blue-50 rounded-lg p-8 border border-blue-200">
            <p className="text-blue-800 mb-6">
              Our support team is here to help. File a claim through any of these channels:
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
                  <p className="text-sm text-blue-600">(800) BOSS-CLEAN</p>
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
            This guarantee policy is subject to the{' '}
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
