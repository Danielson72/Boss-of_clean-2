import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata = generatePageMetadata({
  title: 'Find Professionals Near You',
  description: 'Search for trusted cleaning and home service professionals in your Florida area. Compare prices, read reviews, and get free quotes.',
  path: '/search',
  keywords: ['find cleaners near me', 'Florida cleaning professionals', 'home service search', 'cleaning quotes'],
});

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
