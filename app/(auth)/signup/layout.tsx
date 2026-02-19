import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata = generatePageMetadata({
  title: 'Sign Up',
  description: 'Create your free Boss of Clean account. Join as a customer to find trusted cleaners, or as a cleaning professional to grow your business across Florida.',
  path: '/signup',
  noIndex: true,
});

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
