import Link from 'next/link';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata = generatePageMetadata({
  title: 'Terms of Service',
  description: 'Boss of Clean terms of service. Understand the rules and expectations for using our Florida cleaning services marketplace.',
  path: '/terms',
  keywords: ['terms of service', 'user agreement', 'Boss of Clean terms'],
});

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-dark">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-dark via-brand-navy to-brand-dark" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-[1.1] mb-4">
            Terms of Service
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Please read these terms carefully before using Boss of Clean.
          </p>
          <p className="text-gray-500 text-sm mt-4">Last updated: March 2026</p>
        </div>
      </section>

      {/* Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg prose-gray max-w-none">
          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              1. Platform Role
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Boss of Clean is a marketplace platform that connects homeowners with independent
              cleaning and home service professionals. We are <strong>not</strong> an employer,
              contractor, or agent of any service provider listed on our platform. All cleaning
              professionals are independent businesses responsible for their own operations,
              licensing, insurance, tax obligations, and quality of work. Boss of Clean facilitates
              the connection but does not supervise, direct, or control the services provided.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              2. Customer Responsibilities
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Provide accurate contact information, property details, and service requirements.</li>
              <li>Be present or provide access as agreed at the scheduled service time.</li>
              <li>Pay for completed services promptly through the platform.</li>
              <li>Treat service professionals with respect and maintain a safe working environment.</li>
              <li>Report issues through the platform&apos;s dispute resolution process rather than withholding payment.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              3. Professional Responsibilities
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Maintain all required business licenses and insurance for your service area.</li>
              <li>Complete booked jobs on time and to the standard described in your profile.</li>
              <li>Respond to leads and customer inquiries in a timely manner.</li>
              <li>Maintain accurate profile information including services, pricing, and availability.</li>
              <li>Report to Boss of Clean any safety concerns or incidents that occur during a job.</li>
              <li>Comply with all applicable local, state, and federal laws and regulations.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              4. Payment Terms
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              All payments are processed securely through Stripe. Boss of Clean charges a
              <strong> 5% platform fee</strong> on completed bookings. This fee is deducted from
              the professional&apos;s payout and covers payment processing, lead delivery, platform
              maintenance, and customer support.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Professionals receive payouts via Stripe direct deposit within 2&ndash;3 business
              days after a job is marked as completed. Subscription fees for lead access are billed
              monthly and are non-refundable for the current billing period.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              5. Cancellation Policy
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              <strong>Customers:</strong> Cancellations made at least 24 hours before the scheduled
              service time incur no charge. Cancellations within 24 hours of the scheduled time may
              be subject to a cancellation fee of up to 50% of the quoted price, at the professional&apos;s
              discretion.
            </p>
            <p className="text-gray-600 leading-relaxed">
              <strong>Professionals:</strong> Cancellations should be communicated to the customer as
              early as possible. Repeated cancellations by a professional may result in account
              suspension or removal from the platform.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              6. No-Show Policy
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              <strong>Customer no-shows:</strong> If a customer is not available at the scheduled time
              and has not communicated a cancellation, the professional may charge a no-show fee of up
              to 100% of the quoted price.
            </p>
            <p className="text-gray-600 leading-relaxed">
              <strong>Professional no-shows:</strong> If a professional fails to arrive at the scheduled
              time without prior notice, the customer is entitled to a full refund. Repeated no-shows
              will result in account suspension.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              7. Dispute Resolution
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              If a dispute arises between a customer and a professional, both parties should first
              attempt to resolve it through the platform&apos;s messaging system. If a resolution
              cannot be reached, either party may file a dispute through their dashboard or by
              contacting{' '}
              <a href="mailto:contact@bossofclean.com" className="text-brand-gold hover:underline">
                contact@bossofclean.com
              </a>.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Boss of Clean will review disputes and may issue credits, refunds, or account actions
              as appropriate. Any disputes not resolved through our support process shall be settled
              by binding arbitration in the State of Florida, in accordance with the rules of the
              American Arbitration Association.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              8. Lead Quality Guarantee
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Boss of Clean stands behind the quality of leads delivered to professionals. If a
              professional receives a lead that is verifiably invalid (fake contact information,
              out-of-service-area, or duplicate), they may report it through their dashboard within
              48 hours. Verified invalid leads will be credited back to the professional&apos;s
              account within 48 hours of review.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              9. TCPA Consent
            </h2>
            <p className="text-gray-600 leading-relaxed">
              By providing your phone number on Boss of Clean, you consent to receive transactional
              SMS messages related to your account, including booking confirmations, lead notifications,
              and service updates. Message and data rates may apply. You may opt out at any time by
              replying <strong>STOP</strong> to any text message. For help, reply <strong>HELP</strong> or
              contact{' '}
              <a href="mailto:contact@bossofclean.com" className="text-brand-gold hover:underline">
                contact@bossofclean.com
              </a>.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              10. Limitation of Liability
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Boss of Clean provides the platform &ldquo;as is&rdquo; and &ldquo;as available.&rdquo;
              To the maximum extent permitted by Florida law, Boss of Clean shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages arising out of or related
              to your use of the platform, including but not limited to damages for property damage,
              personal injury, lost profits, or loss of data. Our total liability shall not exceed the
              amount you have paid to Boss of Clean in the twelve (12) months preceding the claim.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              11. Account Termination
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Boss of Clean reserves the right to suspend or terminate any account that violates
              these terms, engages in fraudulent activity, receives repeated complaints, or otherwise
              harms the safety or integrity of the marketplace. Users may delete their account at any
              time by contacting support.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              12. Governing Law
            </h2>
            <p className="text-gray-600 leading-relaxed">
              These terms are governed by and construed in accordance with the laws of the State
              of Florida, without regard to its conflict of law principles. Any legal action arising
              from these terms shall be filed in the courts of Orange County, Florida.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              13. Contact
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Questions about these terms? Contact us at{' '}
              <a href="mailto:contact@bossofclean.com" className="text-brand-gold hover:underline">
                contact@bossofclean.com
              </a>
            </p>
          </section>
        </div>

        {/* Back link */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <Link href="/" className="text-brand-gold hover:underline font-medium">
            &larr; Back to Home
          </Link>
        </div>
      </article>
    </div>
  );
}
