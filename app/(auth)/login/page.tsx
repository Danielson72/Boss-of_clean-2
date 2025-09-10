import { AuthForm } from '@/components/auth/AuthForm'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <AuthForm mode="login" />
    </div>
  )
}

export const metadata = {
  title: 'Sign In | Boss of Clean',
  description: 'Sign in to your Boss of Clean account',
}