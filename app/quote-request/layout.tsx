import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata = generatePageMetadata({
  title: 'Get Free Cleaning Quotes',
  description: 'Request free quotes from verified cleaning professionals in your Florida area. Compare prices, read reviews, and book the best cleaner for your needs.',
  path: '/quote-request',
  keywords: ['free cleaning quotes', 'cleaning estimate Florida', 'compare cleaning prices'],
});

export default function QuoteRequestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
