import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata = generatePageMetadata({
  title: 'Pricing Plans for Cleaning Professionals',
  description: 'Choose the right Boss of Clean plan for your cleaning business. Free, Basic, and Pro tiers with lead credits, priority placement, and verified badges.',
  path: '/pricing',
  keywords: ['cleaning business pricing', 'lead generation pricing', 'cleaning professional plans'],
});

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
