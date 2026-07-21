import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata = generatePageMetadata({
  title: 'Find Professionals Near You',
  description: 'Search for local residential & commercial service pros in your Florida area — cleaning, office cleaning, and more. Compare prices, read reviews, and get free quotes.',
  path: '/search',
  keywords: ['find pros near me', 'Florida residential & commercial service pros', 'commercial cleaning Florida', 'office cleaning', 'home service search', 'cleaning quotes'],
});

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
