import Link from 'next/link';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata = generatePageMetadata({
  title: 'Privacy Policy',
  description: 'Boss of Clean privacy policy. Learn how we collect, use, and protect your personal information on our Florida cleaning services marketplace.',
  path: '/privacy',
  keywords: ['privacy policy', 'data protection', 'Boss of Clean privacy'],
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
          <p className="text-gray-500 text-sm mt-4">Last updated: March 2026</p>
        </div>
      </section>

      {/* Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg prose-gray max-w-none">
          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              1. Information We Collect
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              When you use Boss of Clean, we may collect the following information:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li><strong>Account information:</strong> Name, email address, phone number, and password when you create an account.</li>
              <li><strong>Profile information:</strong> For cleaning professionals, business name, service areas, descriptions, and profile photos.</li>
              <li><strong>Location data:</strong> ZIP code, city, and state to match you with local service providers.</li>
              <li><strong>Payment information:</strong> Credit card and billing details processed securely through Stripe. We do not store full card numbers on our servers.</li>
              <li><strong>Communications:</strong> Messages exchanged between customers and professionals through our platform.</li>
              <li><strong>Usage data:</strong> Pages visited, search queries, and interactions with the platform to improve our services.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              2. How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li><strong>Service matching:</strong> Connecting homeowners with qualified home service professionals in their area.</li>
              <li><strong>Payment processing:</strong> Facilitating secure transactions between customers and professionals.</li>
              <li><strong>Communications:</strong> Sending booking confirmations, quote notifications, and platform updates.</li>
              <li><strong>Platform safety:</strong> Verifying professional credentials, detecting fraud, and maintaining marketplace quality.</li>
              <li><strong>Improvement:</strong> Analyzing usage patterns to improve search results, user experience, and platform features.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              3. SMS and Email Consent
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              By creating an account on Boss of Clean, you consent to receive transactional
              messages related to your account activity, including booking confirmations, quote
              notifications, and payment receipts. These are sent via email and, if you provide
              a phone number, via SMS.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              <strong>To opt out of SMS messages:</strong> Reply <strong>STOP</strong> to any
              text message at any time. You will receive a confirmation and no further SMS
              messages will be sent.
            </p>
            <p className="text-gray-600 leading-relaxed">
              <strong>To opt out of marketing emails:</strong> Click the &ldquo;Unsubscribe&rdquo;
              link at the bottom of any email, or manage your notification preferences in your
              account settings. Note that transactional emails (booking confirmations, payment
              receipts) cannot be opted out of while your account is active.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              4. Third-Party Services
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We use the following third-party services to operate our platform:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li><strong>Stripe:</strong> Secure payment processing. Stripe&apos;s privacy policy applies to payment data.</li>
              <li><strong>Supabase:</strong> Database hosting and user authentication infrastructure.</li>
              <li><strong>Resend:</strong> Transactional and notification email delivery.</li>
              <li><strong>Twilio:</strong> SMS notifications for booking updates and lead alerts.</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              Each third-party provider operates under their own privacy policy. We share only
              the minimum data necessary for each service to function.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              5. Data Sharing
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We do not sell your personal information. We share data only in these situations:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li><strong>Between parties to a booking:</strong> When a booking is confirmed, the customer&apos;s contact information is shared with the assigned professional, and vice versa.</li>
              <li><strong>Service providers:</strong> As described in Section 4 above.</li>
              <li><strong>Legal requirements:</strong> When required by law, subpoena, or legal process.</li>
              <li><strong>Safety:</strong> To protect the rights, property, or safety of our users or the public.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              6. Florida Residents
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              If you are a Florida resident, you have the following rights under Florida law:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>The right to know what personal information we collect about you.</li>
              <li>The right to request deletion of your personal information.</li>
              <li>The right to opt out of the sale of personal information (we do not sell your data).</li>
              <li>The right to non-discrimination for exercising your privacy rights.</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:contact@bossofclean.com" className="text-brand-gold hover:underline">
                contact@bossofclean.com
              </a>.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              7. Data Retention and Deletion
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We retain your personal information for as long as your account is active or as
              needed to provide services. After account deletion, we retain certain data for up
              to 90 days for fraud prevention and legal compliance, after which it is permanently
              deleted.
            </p>
            <p className="text-gray-600 leading-relaxed">
              To request deletion of your account and personal data, email{' '}
              <a href="mailto:contact@bossofclean.com" className="text-brand-gold hover:underline">
                contact@bossofclean.com
              </a>{' '}
              with the subject line &ldquo;Data Deletion Request.&rdquo; We will process your
              request within 30 days.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-4">
              8. Security
            </h2>
            <p className="text-gray-600 leading-relaxed">
              We implement industry-standard security measures including encryption in transit
              (TLS), encrypted storage for sensitive data, and row-level security on our database.
              Payment data is handled entirely by Stripe and never touches our servers. However,
              no system is 100% secure, and we cannot guarantee absolute security.
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
              10. Contact Us
            </h2>
            <p className="text-gray-600 leading-relaxed">
              If you have questions about this privacy policy or your personal data, contact us at:{' '}
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
