import { AuthForm } from '@/components/auth/AuthForm'
import { generatePageMetadata } from '@/lib/seo/metadata'

export const metadata = generatePageMetadata({
  title: 'Log In',
  description: 'Log in to your Boss of Clean account. Access your dashboard, manage bookings, and connect with residential & commercial service pros across Florida.',
  path: '/login',
  noIndex: true,
})

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-cream px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center w-full max-w-md">
        <AuthForm mode="login" />
      </div>
    </div>
  )
}

