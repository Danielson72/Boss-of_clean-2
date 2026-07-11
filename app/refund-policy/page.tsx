import Link from 'next/link';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata = generatePageMetadata({
  title: 'Lead Fee Refund Policy',
  description:
    'Boss of Clean lead fee refund policy. When the $30 lead fee is refundable, how to claim a bad lead, the 7-day claim window, and our resolution timeline.',
  path: '/refund-policy',
  keywords: ['refund policy', 'lead fee refund', 'bad lead', 'Boss of Clean refunds'],
});

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-dark">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-dark via-brand-navy to-brand-dark" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-[1.1] mb-4">
            Lead Fee Refund Policy
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            When the $30 lead fee is refundable, and how to make a claim.
          </p>
          <p className="text-gray-500 text-sm mt-4">Last updated: July 2026</p>
        </div>
      </section>

      {/* Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg prose-gray max-w-none">
          <section className="mb-12">
            <p className="text-gray-600 leading-relaxed">
              This policy applies to the <strong>$30 lead fee</strong> paid by service
              professionals (&ldquo;Pros&rdquo;) on Boss of Clean, a Florida home and business
              services marketplace.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              1. What the lead fee buys
            </h2>
            <p className="text-gray-600 leading-relaxed">
              A Pro pays the lead fee only after a customer has (a) accepted the Pro&apos;s quote and
              (b) confirmed they want to hire that Pro. Payment releases the customer&apos;s contact
              information (name, phone, email, service address) to that Pro for that job. The fee is
              for the introduction &mdash; it is not a guarantee that the job will be completed or
              that the customer will not change plans.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              2. Bad-lead criteria (refund-eligible)
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              A lead fee is refundable when the lead was defective at the time of purchase, meaning
              any of:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>
                <strong>Disconnected or wrong contact info.</strong> The phone number is
                disconnected, unreachable as dialed, or belongs to someone other than the requester;
                or the email hard-bounces.
              </li>
              <li>
                <strong>Fake or fraudulent request.</strong> The request was not submitted by a real
                prospective customer (spam, pranks, bots, competitor probing).
              </li>
              <li>
                <strong>Duplicate lead.</strong> The Pro already paid for the same customer and same
                job on Boss of Clean (a repeat request for a <em>new</em> job is not a duplicate).
              </li>
              <li>
                <strong>Customer cancelled before contact.</strong> The customer withdrew the request
                before the Pro had any reasonable opportunity to make contact.
              </li>
              <li>
                <strong>Outside stated service area.</strong> The job address is materially outside
                the service area the lead displayed before purchase.
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              3. Not refund-eligible
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>The customer chose another Pro, postponed, or negotiated a different scope.</li>
              <li>The Pro was slow to respond (we recommend contact within 24 hours).</li>
              <li>Price disagreement after contact.</li>
              <li>The Pro simply changed their mind about wanting the job.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              4. Claim window
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Refund claims must be submitted within <strong>7 calendar days</strong> of the fee
              being charged. Claims outside the window are reviewed only at Boss of Clean&apos;s
              discretion.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              5. How to claim and resolution timeline
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Submit the refund request from the Pro dashboard, or email{' '}
              <a href="mailto:admin@bossofclean.com" className="text-brand-gold hover:underline">
                admin@bossofclean.com
              </a>
              , with the lead reference and the reason category. We may verify the claim (for
              example, test the phone number, or review platform messages and request history). One
              claim per lead.
            </p>
            <p className="text-gray-600 leading-relaxed">
              We will issue a decision within <strong>5 business days</strong> of submission.
              Approved refunds are returned to the original payment method within 10 business days
              (card network timing may add processing days).
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              6. Form of refund
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Approved refunds are issued to the original payment method. Where the Pro prefers, we
              may offer an account credit toward a future lead instead.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              7. Abuse
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Refund claims are audited. Submitting false claims, or claiming a refund on a lead the
              Pro in fact serviced (on or off platform), is grounds for claim denial, clawback, and
              account suspension. Initiating a card chargeback while a refund claim is open may pause
              the claim.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              8. Contact
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Questions about this policy? Contact us at{' '}
              <a href="mailto:admin@bossofclean.com" className="text-brand-gold hover:underline">
                admin@bossofclean.com
              </a>
              . See also our{' '}
              <Link href="/terms" className="text-brand-gold hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/review-policy" className="text-brand-gold hover:underline">
                Review Policy
              </Link>
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
