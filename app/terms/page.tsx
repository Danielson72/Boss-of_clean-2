import Link from 'next/link';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata = generatePageMetadata({
  title: 'Terms of Service',
  description:
    'Boss of Clean terms of service. How our Florida home and business services marketplace works, the roles of customers and independent Pros, fees, and platform protections.',
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
          <p className="text-gray-500 text-sm mt-4">Last updated: July 2026</p>
        </div>
      </section>

      {/* Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg prose-gray max-w-none">
          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              1. Platform Role &mdash; a Neutral Marketplace
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Boss of Clean operates a Florida marketplace that connects customers with independent
              home and business service professionals (&ldquo;Pros&rdquo;) across many categories,
              including cleaning, handyman work, plumbing, HVAC, electrical, pest control,
              landscaping, pool service, pressure washing, and mobile detailing.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Boss of Clean is <strong>only</strong> the platform. We are <strong>not</strong> an
              employer, contractor, agent, partner, or joint venturer of any Pro, and we are{' '}
              <strong>not a party</strong> to any agreement for services between a customer and a
              Pro. We do not employ, supervise, direct, or control Pros; we do not perform, inspect,
              or manage any job; and we do not endorse, certify, or guarantee any Pro, their
              qualifications, or their work. Any hiring decision, service agreement, schedule, scope,
              and price are set directly between the customer and the Pro.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              2. Professionals Are Independent Businesses
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Each Pro is an independent business, solely responsible for its own operations. By
              listing on Boss of Clean, a Pro represents and agrees that they are responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>obtaining and maintaining all licenses, permits, and insurance required for their trade and service area;</li>
              <li>the quality, safety, timeliness, and legality of the services they provide;</li>
              <li>their own pricing, taxes, employees or subcontractors, tools, and equipment;</li>
              <li>compliance with all applicable local, state, and federal laws and regulations;</li>
              <li>accurate profile information, including services, service areas, and availability.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              3. Customer Responsibilities
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Provide accurate contact information, property details, and service requirements.</li>
              <li>Be present or provide access as agreed with your Pro at the scheduled service time.</li>
              <li>Pay your Pro directly for the services you agree to, on the terms you agree with them.</li>
              <li>Treat Pros with respect and maintain a safe working environment.</li>
              <li>Raise any service issue first with your Pro, and use the platform&apos;s support channels if you cannot resolve it.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              4. Payments and Fees
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              <strong>Payment for services is directly between the customer and the Pro.</strong>{' '}
              Boss of Clean does not set, collect, hold, escrow, or process payment for the services
              a Pro provides, and does not issue payouts to Pros for those services. We take{' '}
              <strong>no percentage or commission</strong> of any job. How and when a customer pays a
              Pro (and any deposit, cancellation, or refund terms for the service itself) is agreed
              between the customer and that Pro.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Boss of Clean&apos;s <strong>only</strong> financial relationship with a Pro is:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>
                <strong>A per-lead unlock fee.</strong> After a customer accepts a Pro&apos;s quote
                and confirms they want to hire that Pro, the Pro pays a flat lead-unlock fee to
                receive that customer&apos;s contact information for the job. The fee is for the
                introduction; it is not a commission on the job and is not a guarantee that the job
                will proceed. The current fee is shown to the Pro before payment and on our{' '}
                <Link href="/pricing" className="text-brand-gold hover:underline">
                  Pricing
                </Link>{' '}
                page. Refunds of the lead-unlock fee are governed by our{' '}
                <Link href="/refund-policy" className="text-brand-gold hover:underline">
                  Lead Fee Refund Policy
                </Link>
                .
              </li>
              <li>
                <strong>Optional subscription plans.</strong> Pros may choose a paid subscription for
                additional marketplace features. Plan prices and features are described on the{' '}
                <Link href="/pricing" className="text-brand-gold hover:underline">
                  Pricing
                </Link>{' '}
                page. Subscription fees are billed for the plan period and are separate from the
                lead-unlock fee.
              </li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              All Boss of Clean fees are processed securely through our payment processor, Stripe.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              5. Cancellations and No-Shows
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Because the service agreement is between the customer and the Pro, any cancellation,
              rescheduling, no-show, deposit, or cancellation-fee terms for a job are set and
              enforced between those two parties. Boss of Clean is not a party to those terms, does
              not charge or collect service cancellation or no-show fees, and does not refund amounts
              a customer pays a Pro. We encourage both sides to communicate changes as early as
              possible; repeated no-shows or cancellations by a Pro may affect their standing on the
              platform.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              6. Reviews
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Reviews reflect the opinions of the customers who write them and must follow our{' '}
              <Link href="/review-policy" className="text-brand-gold hover:underline">
                Review Policy
              </Link>
              . Boss of Clean moderates reviews against that policy but does not endorse review
              content.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              7. Disputes Between Customers and Pros
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Any dispute about a service &mdash; its quality, price, scheduling, damage, or
              completion &mdash; is between the customer and the Pro, who are responsible for
              resolving it directly. Boss of Clean is not the payer, insurer, guarantor, or arbiter
              of the underlying job and is not responsible for a Pro&apos;s acts or omissions.
            </p>
            <p className="text-gray-600 leading-relaxed">
              As a courtesy, we may provide information from platform records (such as messages and
              request history) to help the parties resolve a dispute, and we may take account actions
              against a user who violates these terms. Our financial remedies are limited to the
              Boss of Clean fees a user paid us &mdash; for example, a lead-unlock fee refund under
              our{' '}
              <Link href="/refund-policy" className="text-brand-gold hover:underline">
                Lead Fee Refund Policy
              </Link>
              . You may also contact{' '}
              <a href="mailto:admin@bossofclean.com" className="text-brand-gold hover:underline">
                admin@bossofclean.com
              </a>
              .
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              8. No Warranty; No Guarantee of Pros
            </h2>
            <p className="text-gray-600 leading-relaxed">
              The platform is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without
              warranties of any kind, express or implied, to the maximum extent permitted by Florida
              law. Boss of Clean does not warrant or guarantee the work, conduct, qualifications,
              licensing, insurance, background, or availability of any Pro, or that any job will be
              completed or completed to a particular standard. Listing on the platform is not an
              endorsement. You are responsible for evaluating a Pro (or a customer) before entering
              into any agreement, including confirming licensing and insurance where appropriate.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              9. TCPA Consent
            </h2>
            <p className="text-gray-600 leading-relaxed">
              By providing your phone number on Boss of Clean, you consent to receive transactional
              SMS messages related to your account, including request, quote, and lead notifications
              and service updates. Message and data rates may apply. You may opt out at any time by
              replying <strong>STOP</strong> to any text message. For help, reply <strong>HELP</strong>{' '}
              or contact{' '}
              <a href="mailto:admin@bossofclean.com" className="text-brand-gold hover:underline">
                admin@bossofclean.com
              </a>
              .
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              10. Limitation of Liability
            </h2>
            <p className="text-gray-600 leading-relaxed">
              To the maximum extent permitted by Florida law, Boss of Clean shall not be liable for
              any indirect, incidental, special, consequential, or punitive damages, or for any
              damages arising out of the acts or omissions of a Pro or a customer, the services (or
              failure to provide services), property damage, personal injury, lost profits, or loss
              of data, arising out of or related to your use of the platform. Our total liability for
              any claim shall not exceed the total Boss of Clean fees you paid us in the twelve (12)
              months preceding the claim.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              11. Indemnification
            </h2>
            <p className="text-gray-600 leading-relaxed">
              You agree to indemnify and hold harmless Boss of Clean and its officers, employees, and
              agents from any claims, damages, losses, or expenses (including reasonable
              attorneys&apos; fees) arising out of your use of the platform, your services or your
              hiring of a Pro, your violation of these terms, or your violation of any law or the
              rights of a third party.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              12. Account Termination
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Boss of Clean may suspend or terminate any account that violates these terms, engages
              in fraudulent activity, receives repeated substantiated complaints, or otherwise harms
              the safety or integrity of the marketplace. You may delete your account at any time by
              contacting support.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              13. Changes to These Terms
            </h2>
            <p className="text-gray-600 leading-relaxed">
              We may update these terms from time to time. Material changes will be reflected by the
              &ldquo;Last updated&rdquo; date above, and your continued use of the platform after a
              change means you accept the updated terms.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              14. Governing Law and Dispute Resolution
            </h2>
            <p className="text-gray-600 leading-relaxed">
              These terms are governed by the laws of the State of Florida, without regard to its
              conflict of law principles. Any dispute between you and Boss of Clean that is not
              resolved through our support process shall be resolved by binding arbitration in
              Florida under the rules of the American Arbitration Association, and any court
              proceeding permitted under these terms shall be brought in the state or federal courts
              located in Orange County, Florida. This section governs disputes between you and Boss
              of Clean; disputes between a customer and a Pro are addressed in Section 7.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              15. Contact
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Questions about these terms? Contact us at{' '}
              <a href="mailto:admin@bossofclean.com" className="text-brand-gold hover:underline">
                admin@bossofclean.com
              </a>
              .
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
