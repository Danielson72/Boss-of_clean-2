import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata = generatePageMetadata({
  title: 'Find Professionals Near You',
  description: 'Search for local home service pros in your Florida area — cleaning, pressure washing, and more. Compare prices, read reviews, and get free quotes.',
  path: '/search',
  keywords: ['find pros near me', 'Florida home service pros', 'home service search', 'cleaning quotes'],
});

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
