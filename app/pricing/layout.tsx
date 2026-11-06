import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata = generatePageMetadata({
  title: 'Pricing Plans for Home Service Pros',
  description: 'Boss of Clean is the marketplace for home service pros — cleaning, handyman, HVAC, plumbing, electrical, pest control, landscaping, pool, mobile detailing, and pressure washing. Free pay-per-lead, Basic $79/mo for priority routing, Pro $199/mo for top placement.',
  path: '/pricing',
  keywords: [
    'home service marketplace pricing',
    'exclusive leads for pros',
    'Thumbtack alternative',
    'Angi alternative',
    'HomeAdvisor alternative',
    'pro listing plans',
  ],
});

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
