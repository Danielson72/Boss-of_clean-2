import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata = generatePageMetadata({
  title: 'Reset Password',
  description: 'Reset your Boss of Clean account password. Enter your email to receive a secure password reset link.',
  path: '/forgot-password',
  noIndex: true,
});

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
