import Image from 'next/image'
import { AuthForm } from '@/components/auth/AuthForm'
import { generatePageMetadata } from '@/lib/seo/metadata'

export const metadata = generatePageMetadata({
  title: 'Log In',
  description: 'Log in to your Boss of Clean account. Access your dashboard, manage bookings, and connect with cleaning professionals across Florida.',
  path: '/login',
  noIndex: true,
})

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center w-full max-w-md">
        <Image
          src="/boss-of-clean-logo.png"
          alt="Boss of Clean"
          width={80}
          height={80}
          className="rounded-lg mb-6"
          priority
        />
        <AuthForm mode="login" />
      </div>
    </div>
  )
}

