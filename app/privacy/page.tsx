import Link from 'next/link';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata = generatePageMetadata({
  title: 'Privacy Policy',
  description: 'Boss of Clean privacy policy. Learn how we collect, use, and protect your personal information on our Florida cleaning services marketplace.',
  path: '/privacy',
  keywords: ['privacy policy', 'data protection', 'Boss of Clean privacy', 'FIPA', 'Florida privacy'],
});

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-dark">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-dark via-brand-navy to-brand-dark" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-[1.1] mb-4">
            Privacy Policy
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Your privacy matters. Here&apos;s how we handle your data.
          </p>
          <p className="text-gray-500 text-sm mt-4">Last updated: April 2026</p>
        </div>
      </section>

      {/* Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg prose-gray max-w-none">

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              1. Data We Collect
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              When you use Boss of Clean, we may collect the following information:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li><strong>Account information:</strong> Name, email address, phone number, and password when you create an account.</li>
              <li><strong>Profile information:</strong> For cleaning professionals, business name, service areas, descriptions, and profile photos.</li>
              <li><strong>Address &amp; location data:</strong> Service address, ZIP code, city, and state to match you with local providers.</li>
              <li><strong>Payment data:</strong> Credit card and billing details processed securely through Stripe. We do not store full card numbers on our servers.</li>
              <li><strong>Service history:</strong> Past bookings, quotes, reviews, and interactions on the platform.</li>
              <li><strong>Uploaded documents:</strong> Background check authorizations or verification documents submitted by professionals.</li>
              <li><strong>Communications:</strong> Messages exchanged between customers and professionals through our platform.</li>
              <li><strong>Usage data:</strong> Pages visited, search queries, browser type, IP address, and interactions with the platform.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              2. How We Use Your Data
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li><strong>Connecting parties:</strong> Matching homeowners with qualified cleaning professionals in their area.</li>
              <li><strong>Payment processing:</strong> Facilitating secure transactions between customers and professionals via Stripe.</li>
              <li><strong>Transactional communications:</strong> Sending booking confirmations, quote notifications, and receipts by email and SMS.</li>
              <li><strong>Verification &amp; fraud prevention:</strong> Confirming professional credentials and protecting marketplace integrity.</li>
              <li><strong>Platform improvement:</strong> Analyzing usage patterns to improve features, search results, and user experience.</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4 font-semibold">
              WE DO NOT SELL YOUR PERSONAL DATA. Ever.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              3. Third-Party Vendors
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We use the following third-party services to operate our platform. Each provider
              operates under their own privacy policy:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>
                <strong>Stripe</strong> (stripe.com) — Payment processing. Your payment data is
                governed by Stripe&apos;s PCI-DSS compliant infrastructure. We never store card
                numbers on our servers.
              </li>
              <li>
                <strong>Supabase</strong> (supabase.com) — Database hosting and user authentication
                infrastructure. Data is stored in US-based data centers.
              </li>
              <li>
                <strong>Resend</strong> (resend.com) — Transactional and notification email delivery.
              </li>
              <li>
                <strong>Google</strong> (google.com) — OAuth sign-in. If you choose &ldquo;Sign in
                with Google,&rdquo; Google&apos;s privacy policy applies to that authentication flow.
              </li>
              <li>
                <strong>Twilio</strong> (twilio.com) — SMS notifications for booking updates and
                lead alerts.
              </li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              We share only the minimum data necessary for each service to function.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              4. Florida Information Protection Act (FIPA) — Fla. Stat. § 501.171
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Boss of Clean complies with the Florida Information Protection Act (FIPA), Fla.
              Stat. § 501.171. Under FIPA:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>
                <strong>Breach notification:</strong> If we suffer a data breach affecting the
                personal information of 500 or more Florida residents, we are required to notify
                the Florida Attorney General&apos;s office and affected individuals within 30 days
                of discovery.
              </li>
              <li>
                <strong>Security obligations:</strong> We are required to implement reasonable
                measures to protect personal information, including encryption in transit (TLS)
                and at rest, access controls, and row-level database security.
              </li>
              <li>
                <strong>Vendor obligations:</strong> Third-party vendors who handle Florida
                resident data on our behalf must also maintain appropriate safeguards.
              </li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              If you believe your data has been improperly accessed or you have a FIPA-related
              inquiry, contact us immediately at{' '}
              <a href="mailto:admin@bossofclean.com" className="text-brand-gold hover:underline">
                admin@bossofclean.com
              </a>.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              5. Data Retention
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li><strong>Active accounts:</strong> Data is retained while your account is open and active.</li>
              <li><strong>Deleted accounts:</strong> Personal data is purged within 90 days of account deletion.</li>
              <li><strong>Payment records:</strong> Retained for 7 years to comply with financial recordkeeping requirements.</li>
              <li><strong>Uploaded documents:</strong> Retained for 2 years after account closure, then permanently deleted.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              6. Your Rights
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              You have the following rights regarding your personal data:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li><strong>Access:</strong> Request a copy of the personal information we hold about you.</li>
              <li><strong>Correction:</strong> Request that we correct inaccurate or incomplete information.</li>
              <li><strong>Deletion:</strong> Request permanent deletion of your account and personal data (subject to legal retention requirements).</li>
              <li><strong>Opt-out:</strong> Opt out of marketing SMS and emails at any time. Reply <strong>STOP</strong> to any text, or use the unsubscribe link in any email.</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              To exercise any of these rights, contact{' '}
              <a href="mailto:admin@bossofclean.com" className="text-brand-gold hover:underline">
                admin@bossofclean.com
              </a>.
              We will process requests within 30 days.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              7. Cookies
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Boss of Clean uses session cookies only — these are required for login and navigation
              to function. We do not use advertising cookies, cross-site tracking pixels, or
              third-party behavioral tracking cookies of any kind.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              8. Security
            </h2>
            <p className="text-gray-600 leading-relaxed">
              We implement industry-standard security measures including: encryption in transit (TLS),
              row-level security (RLS) on our Supabase database, access controls limiting data to
              authorized users, and Stripe PCI-DSS compliance for all payment data. Payment
              information never touches our servers directly. No system is 100% secure, and we
              cannot guarantee absolute security.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              9. Changes to This Policy
            </h2>
            <p className="text-gray-600 leading-relaxed">
              We may update this privacy policy from time to time. If we make material changes,
              we will notify you by email or by posting a notice on our platform. Continued use
              of Boss of Clean after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              10. Contact
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Boss of Clean LLC<br />
              50 Frisco Court, Apopka, FL 32712<br />
              <a href="mailto:admin@bossofclean.com" className="text-brand-gold hover:underline">
                admin@bossofclean.com
              </a><br />
              407-461-6039
            </p>
          </section>
        </div>

        {/* Back link */}
        <div className="mt-12 pt-8 border-t border-gray-200 flex gap-6">
          <Link href="/" className="text-brand-gold hover:underline font-medium">
            &larr; Back to Home
          </Link>
          <Link href="/terms" className="text-brand-gold hover:underline font-medium">
            Terms of Service &rarr;
          </Link>
        </div>
      </article>
    </div>
  );
}
