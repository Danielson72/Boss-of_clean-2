import Link from 'next/link';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata = generatePageMetadata({
  title: 'Terms of Service',
  description:
    'Boss of Clean terms of service. Understand the rules and expectations for using our Florida cleaning services marketplace.',
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
          <p className="text-gray-500 text-sm mt-4">Effective Date: April 16, 2026</p>
        </div>
      </section>

      {/* Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg prose-gray max-w-none">

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              1. Marketplace Only — We Are Not a Cleaning Company
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Boss of Clean operates exclusively as an online marketplace that connects homeowners
              and property managers with independent cleaning and home service professionals.
              Boss of Clean is <strong>not</strong> a cleaning company, staffing agency, or
              employer. We do not perform cleaning services, and we do not hire, supervise,
              direct, or control the independent professionals listed on our platform. All
              service providers are independent businesses solely responsible for their own
              operations, licensing, insurance, tax obligations, and quality of work.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              2. Independent Contractor Status
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              All cleaning professionals and service providers who use the Boss of Clean platform
              are <strong>independent contractors</strong>. They are <strong>not</strong> employees,
              agents, partners, or representatives of Boss of Clean LLC. Nothing in these Terms
              creates any employment, joint venture, partnership, or franchise relationship between
              Boss of Clean and any service provider.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Independent contractors are solely responsible for their own taxes, workers&apos;
              compensation, liability insurance, business licenses, and compliance with all
              applicable federal, state, and local laws. Boss of Clean does not withhold taxes,
              provide benefits, or exercise control over how professionals perform their services.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              3. Customer Responsibilities
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Provide accurate contact information, property details, and service requirements.</li>
              <li>Be present or provide access as agreed at the scheduled service time.</li>
              <li>Pay for completed services promptly through the platform.</li>
              <li>Treat service professionals with respect and maintain a safe working environment.</li>
              <li>
                Report issues through the platform&apos;s dispute resolution process rather than
                withholding payment.
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              4. Professional Responsibilities
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Maintain all required business licenses and insurance for your service area.</li>
              <li>Complete booked jobs on time and to the standard described in your profile.</li>
              <li>Respond to leads and customer inquiries in a timely manner.</li>
              <li>
                Maintain accurate profile information including services, pricing, and availability.
              </li>
              <li>
                Report to Boss of Clean any safety concerns or incidents that occur during a job.
              </li>
              <li>Comply with all applicable local, state, and federal laws and regulations.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              5. Prohibited Conduct
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              The following conduct is strictly prohibited and may result in immediate account
              suspension or permanent removal from the platform:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>
                <strong>Fake or manipulated reviews:</strong> Posting, soliciting, or incentivizing
                false reviews — positive or negative — about any user or professional on the platform.
              </li>
              <li>
                <strong>Harassment or abuse:</strong> Threatening, harassing, discriminating against,
                or otherwise engaging in abusive conduct toward any user, professional, or Boss of
                Clean staff member.
              </li>
              <li>
                <strong>Off-platform payment coercion:</strong> Pressuring, soliciting, or incentivizing
                any party to conduct transactions outside the Boss of Clean platform in order to
                circumvent platform fees or dispute protections.
              </li>
              <li>
                Impersonating another person, business, or entity on the platform.
              </li>
              <li>
                Using the platform for any unlawful purpose or in violation of any applicable law
                or regulation.
              </li>
              <li>
                Uploading or transmitting malicious code, spam, or any content that interferes with
                the platform&apos;s operation.
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              6. Payment Terms
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              All payments are processed securely through Stripe. Boss of Clean charges a{' '}
              <strong>5% platform fee</strong> on completed bookings. This fee is deducted from the
              professional&apos;s payout and covers payment processing, lead delivery, platform
              maintenance, and customer support.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Professionals receive payouts via Stripe direct deposit within 2&ndash;3 business days
              after a job is marked as completed. Subscription fees for lead access are billed
              monthly and are non-refundable for the current billing period.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              7. Cancellation &amp; No-Show Policy
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              <strong>Customers:</strong> Cancellations made at least 24 hours before the scheduled
              service time incur no charge. Cancellations within 24 hours may be subject to a
              cancellation fee of up to 50% of the quoted price, at the professional&apos;s
              discretion.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              <strong>Professionals:</strong> Cancellations should be communicated to the customer
              as early as possible. Repeated cancellations may result in account suspension or
              removal from the platform.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              <strong>Customer no-shows:</strong> If a customer is unavailable at the scheduled
              time without prior cancellation, the professional may charge a no-show fee of up to
              100% of the quoted price.
            </p>
            <p className="text-gray-600 leading-relaxed">
              <strong>Professional no-shows:</strong> If a professional fails to arrive without
              prior notice, the customer is entitled to a full refund. Repeated no-shows will
              result in account suspension.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              8. Limitation of Liability
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Boss of Clean provides the platform &ldquo;as is&rdquo; and &ldquo;as available.&rdquo;
              Boss of Clean is <strong>not liable</strong> for the quality of services performed by
              independent contractors, any disputes between customers and service providers, property
              damage, personal injury, or any other outcome arising from services arranged through
              the platform.
            </p>
            <p className="text-gray-600 leading-relaxed">
              To the maximum extent permitted by Florida law, Boss of Clean shall not be liable for
              any indirect, incidental, special, consequential, or punitive damages. Our{' '}
              <strong>total aggregate liability</strong> to any user shall not exceed the total fees
              paid to Boss of Clean by that user in the <strong>three (3) months</strong> immediately
              preceding the claim giving rise to liability.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              9. TCPA Consent
            </h2>
            <p className="text-gray-600 leading-relaxed">
              By providing your phone number on Boss of Clean, you consent to receive transactional
              SMS messages related to your account, including booking confirmations, lead
              notifications, and service updates. Message and data rates may apply. You may opt out
              at any time by replying <strong>STOP</strong> to any text message. For help, reply{' '}
              <strong>HELP</strong> or contact{' '}
              <a href="mailto:admin@bossofclean.com" className="text-brand-gold hover:underline">
                admin@bossofclean.com
              </a>
              .
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              10. Mandatory Individual Arbitration &amp; Class Action Waiver
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              <strong>
                PLEASE READ THIS SECTION CAREFULLY. IT AFFECTS YOUR LEGAL RIGHTS.
              </strong>
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Any dispute, claim, or controversy arising out of or relating to these Terms or the
              use of the Boss of Clean platform shall be resolved exclusively by{' '}
              <strong>binding individual arbitration</strong> administered by the American
              Arbitration Association (AAA) under its Consumer Arbitration Rules, seated in Orange
              County, Florida.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              <strong>Class Action Waiver:</strong> You and Boss of Clean each agree that any
              arbitration shall be conducted solely on an individual basis. You expressly waive
              any right to bring or participate in a class action, collective action, or
              representative proceeding of any kind. The arbitrator may not consolidate claims
              of more than one person and may not preside over any form of class or representative
              proceeding.
            </p>
            <p className="text-gray-600 leading-relaxed">
              If any part of this arbitration agreement is found unenforceable, the remaining
              provisions shall remain in full force.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              11. Governing Law &amp; Jurisdiction
            </h2>
            <p className="text-gray-600 leading-relaxed">
              These Terms are governed by and construed in accordance with the laws of the{' '}
              <strong>State of Florida</strong>, without regard to its conflict of law principles.
              Any legal action not subject to arbitration shall be filed exclusively in the state
              or federal courts located in <strong>Orange County, Florida</strong>, and you consent
              to the personal jurisdiction of those courts.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              12. Account Termination
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Boss of Clean reserves the right to suspend or terminate any account that violates
              these Terms, engages in fraudulent activity, receives repeated complaints, or otherwise
              harms the safety or integrity of the marketplace. Users may delete their account at
              any time by contacting support.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              13. Privacy
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Your use of the Boss of Clean platform is also governed by our{' '}
              <Link href="/privacy" className="text-brand-gold hover:underline">
                Privacy Policy
              </Link>
              , which is incorporated into these Terms by reference. Please review our Privacy
              Policy to understand our data collection and use practices.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              14. Contact
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Questions about these Terms? Contact us:
            </p>
            <address className="not-italic mt-3 text-gray-600 space-y-1">
              <p className="font-semibold">Boss of Clean LLC</p>
              <p>50 Frisco Court, Apopka, FL 32712</p>
              <p>
                <a href="mailto:admin@bossofclean.com" className="text-brand-gold hover:underline">
                  admin@bossofclean.com
                </a>
              </p>
              <p>
                <a href="tel:4074616039" className="text-brand-gold hover:underline">
                  407-461-6039
                </a>
              </p>
            </address>
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
