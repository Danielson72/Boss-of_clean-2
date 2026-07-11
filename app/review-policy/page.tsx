import Link from 'next/link';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata = generatePageMetadata({
  title: 'Review Policy',
  description:
    'Boss of Clean review policy. Reviews come from verified customers only, no pay-for-reviews, content standards, and the Pro dispute process.',
  path: '/review-policy',
  keywords: ['review policy', 'verified reviews', 'Boss of Clean reviews'],
});

export default function ReviewPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-dark">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-dark via-brand-navy to-brand-dark" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-[1.1] mb-4">
            Review Policy
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Reviews on Boss of Clean reflect real, verified service experiences.
          </p>
          <p className="text-gray-500 text-sm mt-4">Last updated: July 2026</p>
        </div>
      </section>

      {/* Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg prose-gray max-w-none">
          <section className="mb-12">
            <p className="text-gray-600 leading-relaxed">
              Reviews on Boss of Clean must reflect real, verified service experiences.
              &ldquo;Purrfection is our Standard&rdquo; only means something if the ratings are
              honest.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              1. Who can review
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Only a customer who booked and received (or materially began) a service through Boss of
              Clean may review the Pro for that job. One review per completed job. Pros may post a
              public response to any review of their business.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              2. Verification requirement
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Reviews are tied to a platform booking record. We do not accept:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>reviews from accounts with no booking with that Pro;</li>
              <li>reviews of a Pro by that Pro, their employees, or family/associates;</li>
              <li>imported or copied reviews from other sites.</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              Reviews may display a &ldquo;Verified job&rdquo; indicator only when the underlying
              booking exists on the platform.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              3. No pay-for-reviews
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Neither Boss of Clean nor Pros may:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>pay, discount, tip, or otherwise compensate anyone for a positive review;</li>
              <li>condition a refund or dispute resolution on editing or removing a review;</li>
              <li>
                run &ldquo;review gating&rdquo; (soliciting reviews only from customers screened as
                happy).
              </li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              Asking a customer, neutrally, to leave an honest review is allowed and encouraged.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              4. Content standards
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Reviews must be about the service experience. We remove content that is unlawful,
              defamatory per se, doxxing (posting someone&apos;s private contact info), hate speech,
              spam/ads, or unrelated to the job. We do <strong>not</strong> remove a review merely
              because it is negative.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              5. Dispute process (Pros)
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              A Pro may flag a review from their dashboard, or email{' '}
              <a href="mailto:admin@bossofclean.com" className="text-brand-gold hover:underline">
                admin@bossofclean.com
              </a>
              , within <strong>30 days</strong> of the review being posted, stating the specific
              ground (no underlying job, wrong business, content-standard violation, suspected fake).
            </p>
            <p className="text-gray-600 leading-relaxed">
              Boss of Clean reviews the booking record, messages, and payment history and issues a
              decision within <strong>10 business days</strong>. Outcomes: keep, remove, or annotate.
              The customer may be invited to revise factual errors. One escalation is available to a
              second reviewer; that outcome is final at the platform level.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              6. No retaliation
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Pros may not threaten, penalize, or refuse warranty service to a customer because of an
              honest review. Verified retaliation is grounds for suspension.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              7. Our role
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Boss of Clean is a marketplace. Reviews are the opinions of their authors. We moderate
              against this policy but do not endorse review content.
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
              <Link href="/refund-policy" className="text-brand-gold hover:underline">
                Lead Fee Refund Policy
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
