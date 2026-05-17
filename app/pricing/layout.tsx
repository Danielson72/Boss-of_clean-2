import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata = generatePageMetadata({
  title: 'Pricing Plans for Home Service Pros',
  description: 'Boss of Clean is the marketplace for home service pros — cleaning, handyman, HVAC, plumbing, electrical, pest control, landscaping, pool, mobile detailing, and pressure washing. Free pay-per-lead, Basic $79/mo for priority routing, Pro $199/mo for top placement. Founders Offer for the first 100 Pros.',
  path: '/pricing',
  keywords: [
    'home services marketplace pricing',
    'exclusive leads for pros',
    'Thumbtack alternative',
    'Angi alternative',
    'HomeAdvisor alternative',
    'pro listing plans',
    'Founders Offer',
  ],
});

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
